import { NextResponse } from 'next/server';
import { RESTAURANTS, type RestaurantId } from '@/lib/restaurants';

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = (searchParams.get('restaurantId') ?? 'dlife-bistro-cafe') as RestaurantId;
  const comment = searchParams.get('comment') ?? '';
  const restaurant =
    RESTAURANTS.find((r) => r.id === restaurantId) ?? RESTAURANTS[0];

  const now = new Date();
  const sgtDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .replace(/-/g, '');

  const dtStamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = `Vegetarian Dinner at ${restaurant.name} with Yong Zi Ren`;
  const description = `Celebratory vegetarian dinner after 7:00 PM exam!${
    comment ? `\nNote: ${comment}` : ''
  }\nGoogle Maps: ${restaurant.directionsUrl}`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Singapore Vegetarian Dinner Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:dinner-${restaurant.id}-${sgtDateStr}@dinner-invitation`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Singapore:${sgtDateStr}T193000`,
    `DTEND;TZID=Asia/Singapore:${sgtDateStr}T210000`,
    `SUMMARY:${escapeIcsText(title)}`,
    `LOCATION:${escapeIcsText(restaurant.address)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${restaurant.directionsUrl}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return new NextResponse(icsLines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="dinner-${restaurant.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
