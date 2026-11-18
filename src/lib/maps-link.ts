/**
 * Reading pasted Google Maps links: short-link expansion and pulling out the
 * place ID, name and pin. Shared by the admin auto-fill (see serpapi.ts).
 */

/** A lookup problem worth showing the host as-is. */
export class LookupError extends Error {}

export interface ParsedMapsLink {
  readonly placeId?: string;
  readonly name?: string;
  readonly lat?: number;
  readonly lng?: number;
}

export function isShortMapsLink(input: string): boolean {
  try {
    const host = new URL(input.trim()).hostname;
    return host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'g.co';
  } catch {
    return false;
  }
}

function decodePathPart(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' ')).trim();
  } catch {
    return part.replace(/\+/g, ' ').trim();
  }
}

/**
 * Pulls whatever a Google Maps link carries: a place ID (query_place_id or
 * q=place_id:…), the place name from /place/<name>/, and the pin from
 * !3d<lat>!4d<lng> (preferred) or @<lat>,<lng>. Plain text is treated as a name.
 */
export function parseGoogleMapsLink(input: string): ParsedMapsLink {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed ? { name: trimmed } : {};
  }

  const params = url.searchParams;
  const q = params.get('q') ?? params.get('query') ?? '';
  const placeId =
    params.get('query_place_id') ??
    params.get('place_id') ??
    (q.startsWith('place_id:') ? q.slice('place_id:'.length) : undefined);

  const full = decodePathPart(url.pathname + url.search);
  const pathMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/);
  const name = pathMatch
    ? decodePathPart(pathMatch[1])
    : q && !q.startsWith('place_id:') && !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(q)
      ? q.trim()
      : undefined;

  let lat: number | undefined;
  let lng: number | undefined;
  const pin = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const at = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const qCoords = q.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  const coords = pin ?? at ?? qCoords;
  if (coords) {
    lat = Number(coords[1]);
    lng = Number(coords[2]);
  }

  return {
    ...(placeId ? { placeId } : {}),
    ...(name ? { name } : {}),
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

/** Follows a maps.app.goo.gl short link to the full Google Maps URL it points at. */
export async function expandShortMapsLink(input: string): Promise<string> {
  let current = input.trim();
  for (let hop = 0; hop < 5 && isShortMapsLink(current); hop += 1) {
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    const next = res.headers.get('location');
    if (!next) break;
    current = new URL(next, current).toString();
  }
  return current;
}
