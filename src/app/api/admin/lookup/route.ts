import { NextResponse } from 'next/server';
import { uniqueRestaurantId } from '@/lib/catalog';
import { loadCatalog } from '@/lib/catalog-store';
import { LookupError } from '@/lib/maps-link';
import { isValidRegionId } from '@/lib/restaurants';
import {
  buildRestaurantFromSerpPlace,
  cleanPlaceName,
  lookupRestaurantWithSerpApi,
  serpApiKey,
} from '@/lib/serpapi';

/**
 * Admin: turn a pasted Google Maps link into a restaurant draft via SerpApi.
 * Nothing is saved here; the admin page adds the draft and the host clicks Save.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const key = serpApiKey();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'Auto-fill needs SERPAPI_API_KEY in the environment.' },
      { status: 503 }
    );
  }

  let body: { link?: unknown; region?: unknown; takenIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Request body must be JSON.' }, { status: 400 });
  }
  const link = typeof body.link === 'string' ? body.link.trim() : '';
  if (!link) return NextResponse.json({ ok: false, error: 'Paste a Google Maps link first.' }, { status: 400 });
  if (!isValidRegionId(body.region)) {
    return NextResponse.json({ ok: false, error: 'Unknown region.' }, { status: 400 });
  }
  const region = body.region;

  try {
    const { place, extras, warnings: lookupWarnings } = await lookupRestaurantWithSerpApi(link, key);
    const takenIds = new Set((await loadCatalog()).map((r) => r.id as string));
    if (Array.isArray(body.takenIds)) {
      for (const id of body.takenIds) if (typeof id === 'string') takenIds.add(id);
    }
    const id = uniqueRestaurantId(takenIds, cleanPlaceName(place.title) || 'restaurant');
    const { restaurant, warnings } = buildRestaurantFromSerpPlace(place, { id, region }, extras);
    return NextResponse.json({ ok: true, restaurant, warnings: [...lookupWarnings, ...warnings] });
  } catch (err) {
    const message =
      err instanceof LookupError
        ? err.message
        : `Couldn't fetch that place: ${err instanceof Error ? err.message : 'unknown error'}`;
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
