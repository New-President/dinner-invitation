import { NextResponse } from 'next/server';
import { validateCatalog } from '@/lib/catalog';
import { describeStore, loadCatalog, saveCatalog } from '@/lib/catalog-store';

/** Admin: read or replace the whole restaurant catalog. */

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ catalog: await loadCatalog(), store: describeStore() });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const store = describeStore();
  if (!store.writable) {
    return NextResponse.json({ ok: false, errors: [store.description] }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errors: ['Request body must be JSON.'] }, { status: 400 });
  }

  const checked = validateCatalog((body as { catalog?: unknown } | null)?.catalog);
  if (!checked.ok) {
    return NextResponse.json({ ok: false, errors: checked.errors }, { status: 400 });
  }

  try {
    await saveCatalog(checked.catalog);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Saving failed.';
    return NextResponse.json({ ok: false, errors: [message] }, { status: 502 });
  }
  return NextResponse.json({ ok: true, catalog: checked.catalog });
}
