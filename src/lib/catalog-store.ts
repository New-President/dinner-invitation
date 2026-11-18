import fs from 'node:fs/promises';
import path from 'node:path';
import { validateCatalog } from './catalog';
import { SEED_RESTAURANTS, type Restaurant } from './restaurants';

/**
 * Where the admin-edited restaurant catalog lives (server only):
 * - Upstash Redis when its REST URL and token are set (works on Vercel);
 * - otherwise, during local development, a JSON file in .data/;
 * - otherwise the built-in SEED_RESTAURANTS, read-only.
 * RESTAURANT_STORE=seed forces the built-in list (used by the tests).
 */

const CATALOG_KEY = 'dinner-invite:catalog:v1';

export type StoreKind = 'upstash' | 'local-file' | 'seed';

export interface StoreInfo {
  readonly kind: StoreKind;
  readonly writable: boolean;
  readonly description: string;
}

function upstashConfig(): { readonly url: string; readonly token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim();
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

function localFilePath(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), '.data', 'restaurants.json');
}

function storeKind(): StoreKind {
  if (process.env.RESTAURANT_STORE === 'seed') return 'seed';
  if (upstashConfig()) return 'upstash';
  if (process.env.NODE_ENV !== 'production') return 'local-file';
  return 'seed';
}

export function describeStore(): StoreInfo {
  switch (storeKind()) {
    case 'upstash':
      return { kind: 'upstash', writable: true, description: 'Saved to Upstash Redis; changes go live immediately.' };
    case 'local-file':
      return {
        kind: 'local-file',
        writable: true,
        description: 'Saved to .data/restaurants.json on this computer (dev only). Connect Upstash Redis to edit the live site.',
      };
    case 'seed':
      return {
        kind: 'seed',
        writable: false,
        description: 'Read-only: storage isn’t set up. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to save changes.',
      };
  }
}

async function upstash(command: readonly string[]): Promise<unknown> {
  const config = upstashConfig();
  if (!config) throw new Error('Upstash Redis is not configured.');
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!res.ok || data.error) throw new Error(`Upstash ${command[0]} failed: ${data.error ?? res.status}`);
  return data.result;
}

async function readStoredJson(kind: StoreKind): Promise<string | null> {
  if (kind === 'upstash') {
    const result = await upstash(['GET', CATALOG_KEY]);
    return typeof result === 'string' ? result : null;
  }
  if (kind === 'local-file') {
    try {
      return await fs.readFile(localFilePath(), 'utf8');
    } catch {
      return null;
    }
  }
  return null;
}

/** The catalog the site should show right now; falls back to the built-in list. */
export async function loadCatalog(): Promise<readonly Restaurant[]> {
  const kind = storeKind();
  try {
    const json = await readStoredJson(kind);
    if (!json) return SEED_RESTAURANTS;
    const checked = validateCatalog(JSON.parse(json));
    if (checked.ok) return checked.catalog;
    console.warn(`[catalog] Stored catalog is invalid, using built-in list: ${checked.errors.join(' ')}`);
  } catch (err) {
    console.warn(`[catalog] Could not read stored catalog, using built-in list: ${err instanceof Error ? err.message : err}`);
  }
  return SEED_RESTAURANTS;
}

/** Saves an already-validated catalog. Throws when storage is read-only or unreachable. */
export async function saveCatalog(catalog: readonly Restaurant[]): Promise<void> {
  const kind = storeKind();
  const json = JSON.stringify(catalog);
  if (kind === 'upstash') {
    await upstash(['SET', CATALOG_KEY, json]);
    return;
  }
  if (kind === 'local-file') {
    const file = localFilePath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, json, 'utf8');
    return;
  }
  throw new Error(describeStore().description);
}
