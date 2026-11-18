import { findRestaurantById } from '@/lib/restaurants';
import { serializeDinnerCalendarIcs } from '@/lib/calendar';
import { loadCatalog } from '@/lib/catalog-store';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const catalog = await loadCatalog();
  const restaurant =
    findRestaurantById(catalog, searchParams.get('restaurantId') ?? '') ?? catalog[0];

  const comment = (searchParams.get('comment') ?? '').trim().slice(0, 2000);
  const rawGuestName = (searchParams.get('guestName') ?? '')
    .trim()
    .slice(0, 120);
  const guestName = rawGuestName.length > 0 ? rawGuestName : undefined;

  const icsPayload = serializeDinnerCalendarIcs({
    restaurant,
    comment,
    guestName,
  });

  return new Response(icsPayload, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="dinner-${restaurant.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
