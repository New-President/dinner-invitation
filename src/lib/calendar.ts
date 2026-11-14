import type { Restaurant } from './restaurants';
import { DEFAULT_GUEST_NAME } from './validation';

export type CalendarProviderId =
  | 'google'
  | 'apple'
  | 'outlook-office'
  | 'outlook-live'
  | 'yahoo';

export interface DinnerEventInput {
  readonly restaurant: Restaurant;
  readonly comment: string;
  readonly guestName?: string;
}

export interface CalendarTarget {
  readonly id: CalendarProviderId;
  readonly label: string;
  readonly subtitle: string;
  readonly href: string;
  readonly opensInNewTab: boolean;
}

export const DINNER_SCHEDULE = {
  dateLabel: 'Mon, 30 Nov 2026',
  timeLabel: '7:00 PM – 9:00 PM SGT',
  timeZone: 'Asia/Singapore',
  localStartCompact: '20261130T190000',
  localEndCompact: '20261130T210000',
  isoStartOffset: '2026-11-30T19:00:00+08:00',
  isoEndOffset: '2026-11-30T21:00:00+08:00',
  utcStartCompact: '20261130T110000Z',
  utcEndCompact: '20261130T130000Z',
} as const;

const utf8Encoder = new TextEncoder();

function buildDinnerTitle(restaurant: Restaurant): string {
  return `Vegetarian Dinner at ${restaurant.name} with Yong Zi Ren`;
}

function buildDinnerDetails(input: DinnerEventInput): string {
  const sections: string[] = [
    "Celebratory vegetarian dinner right after our exam!",
  ];

  const trimmedGuest = input.guestName?.trim() ?? '';
  if (trimmedGuest.length > 0) {
    sections.push(`Guest: ${trimmedGuest}`);
  }

  const trimmedComment = input.comment.trim();
  if (trimmedComment.length > 0) {
    sections.push(`Note: ${trimmedComment}`);
  }

  sections.push(`Google Maps: ${input.restaurant.directionsUrl}`);
  return sections.join('\n\n');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatUtcTimestampCompact(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function foldIcsLine(line: string): string {
  if (utf8Encoder.encode(line).byteLength <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentBytes = 0;

  for (const ch of line) {
    const charBytes = utf8Encoder.encode(ch).byteLength;
    if (currentBytes + charBytes > 75 && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = ` ${ch}`;
      currentBytes = 1 + charBytes;
    } else {
      currentChunk += ch;
      currentBytes += charBytes;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.join('\r\n');
}

function buildGoogleCalendarUrl(title: string, details: string, location: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${DINNER_SCHEDULE.localStartCompact}/${DINNER_SCHEDULE.localEndCompact}`,
    details,
    location,
    ctz: DINNER_SCHEDULE.timeZone,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Google Calendar "create event" link for the host's own calendar, sent in the
 * invite email. Titled with the guest's name so it reads right from his side.
 */
export function buildHostGoogleCalendarUrl(input: DinnerEventInput): string {
  const guest = input.guestName?.trim();
  const title = guest && guest !== DEFAULT_GUEST_NAME
    ? `Vegetarian Dinner with ${guest} at ${input.restaurant.name}`
    : `Vegetarian Dinner at ${input.restaurant.name}`;
  return buildGoogleCalendarUrl(title, buildDinnerDetails(input), input.restaurant.address);
}

export function buildCalendarTargets(
  input: DinnerEventInput
): readonly CalendarTarget[] {
  const { restaurant } = input;
  const title = buildDinnerTitle(restaurant);
  const details = buildDinnerDetails(input);
  const trimmedComment = input.comment.trim();
  const trimmedGuest = input.guestName?.trim() ?? '';


  const appleParams = new URLSearchParams({
    restaurantId: restaurant.id,
    comment: trimmedComment,
  });
  if (trimmedGuest.length > 0) {
    appleParams.set('guestName', trimmedGuest);
  }

  const outlookParams = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: DINNER_SCHEDULE.isoStartOffset,
    enddt: DINNER_SCHEDULE.isoEndOffset,
    body: details,
    location: restaurant.address,
  });

  const yahooParams = new URLSearchParams({
    v: '60',
    title,
    st: DINNER_SCHEDULE.utcStartCompact,
    et: DINNER_SCHEDULE.utcEndCompact,
    desc: details,
    in_loc: restaurant.address,
  });

  return [
    {
      id: 'google',
      label: 'Google Calendar',
      subtitle: 'Opens straight in Google Calendar',
      href: buildGoogleCalendarUrl(title, details, restaurant.address),
      opensInNewTab: true,
    },
    {
      id: 'apple',
      label: 'Apple Calendar',
      subtitle: 'iPhone, iPad & Mac Calendar',
      href: `/api/calendar?${appleParams.toString()}`,
      opensInNewTab: false,
    },
    {
      id: 'outlook-office',
      label: 'Outlook (Work / School)',
      subtitle: 'NUS & Microsoft 365',
      href: `https://outlook.office.com/calendar/0/action/compose?${outlookParams.toString()}`,
      opensInNewTab: true,
    },
    {
      id: 'outlook-live',
      label: 'Outlook.com',
      subtitle: 'Personal Microsoft account',
      href: `https://outlook.live.com/calendar/0/action/compose?${outlookParams.toString()}`,
      opensInNewTab: true,
    },
    {
      id: 'yahoo',
      label: 'Yahoo Calendar',
      subtitle: 'Opens straight in Yahoo Calendar',
      href: `https://calendar.yahoo.com/?${yahooParams.toString()}`,
      opensInNewTab: true,
    },
  ] satisfies readonly CalendarTarget[];
}

export function serializeDinnerCalendarIcs(
  input: DinnerEventInput,
  now: Date = new Date()
): string {
  const { restaurant } = input;
  const title = buildDinnerTitle(restaurant);
  const details = buildDinnerDetails(input);
  const dtStamp = formatUtcTimestampCompact(now);

  const logicalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Singapore Vegetarian Dinner Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${DINNER_SCHEDULE.timeZone}`,
    'BEGIN:STANDARD',
    'DTSTART:19820101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:SGT',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:dinner-${restaurant.id}-20261130@dinner-invitation`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=${DINNER_SCHEDULE.timeZone}:${DINNER_SCHEDULE.localStartCompact}`,
    `DTEND;TZID=${DINNER_SCHEDULE.timeZone}:${DINNER_SCHEDULE.localEndCompact}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `LOCATION:${escapeIcsText(restaurant.address)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    `URL:${restaurant.directionsUrl}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${logicalLines.map(foldIcsLine).join('\r\n')}\r\n`;
}
