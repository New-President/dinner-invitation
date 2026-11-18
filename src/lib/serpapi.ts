import {
  REGIONS,
  asRestaurantId,
  createGoogleMapDirections,
  createGoogleMapEmbed,
  type RegionId,
  type Restaurant,
  type RestaurantPhoto,
  type RestaurantReview,
} from './restaurants';
import { LookupError, expandShortMapsLink, isShortMapsLink, parseGoogleMapsLink } from './maps-link';

/** The card shows three photos and cycles through the rest. */
export const MAX_PLACE_PHOTOS = 4;

/**
 * Auto-fill from a Google Maps link via SerpApi's Google Maps API
 * (https://serpapi.com/google-maps-api). Uses 2–4 searches per restaurant:
 * the place, sometimes its full details, its photos, and its reviews (only
 * when Google shows no official price, to read diners' price per person).
 * Pure helpers first (tested), network calls at the bottom.
 */

/* ------------------------------------------------------------------ */
/* SerpApi response shapes (only the fields we read)                   */
/* ------------------------------------------------------------------ */

type DayHours = Readonly<Record<string, string>>;

export interface SerpPlace {
  readonly title?: string;
  readonly place_id?: string;
  readonly data_id?: string;
  readonly gps_coordinates?: { readonly latitude?: number; readonly longitude?: number };
  readonly rating?: number;
  readonly reviews?: number;
  readonly price?: string;
  readonly type?: string | readonly string[];
  readonly types?: readonly string[];
  readonly address?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly description?: string | { readonly snippet?: string };
  /** Local results: { monday: "6 AM–10 PM", ... } */
  readonly operating_hours?: DayHours;
  /** Place results: [{ monday: "6 AM–10 PM" }, ...] */
  readonly hours?: readonly DayHours[] | string;
  readonly thumbnail?: string;
  readonly images?: readonly { readonly title?: string; readonly thumbnail?: string }[];
  readonly user_reviews?: {
    readonly most_relevant?: readonly {
      readonly username?: string;
      readonly rating?: number;
      readonly description?: string;
      readonly date?: string;
    }[];
  };
}

/* ------------------------------------------------------------------ */
/* Opening hours: "7:30–10:30 AM, 12–10:30 PM" → card format           */
/* ------------------------------------------------------------------ */

interface ClockTime {
  readonly hour: number;
  readonly minute: number;
  readonly meridiem: 'am' | 'pm' | null;
}

function parseClock(token: string): ClockTime | null {
  const m = token.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return { hour, minute, meridiem: (m[3] as 'am' | 'pm' | undefined) ?? null };
}

function toMinutes(t: ClockTime, meridiem: 'am' | 'pm'): number {
  return ((t.hour % 12) + (meridiem === 'pm' ? 12 : 0)) * 60 + t.minute;
}

function formatMinutes(total: number): string {
  const h24 = Math.floor(total / 60) % 24;
  const minute = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}

/**
 * One day's Google hours text → "10:30 am – 9:00 pm[, …]". Handles a missing
 * AM/PM on the opening time ("7:30–10:30 AM"), "Open 24 hours" and "Closed".
 * Returns null for closed or unreadable days.
 */
export function parseDayHours(text: string): string | null {
  const cleaned = text
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/open 24 hours/i.test(cleaned)) return '12:00 am – 11:59 pm';
  if (!cleaned || /closed/i.test(cleaned)) return null;

  const ranges: string[] = [];
  for (const segment of cleaned.split(',')) {
    const parts = segment.split(/\s*[–—-]\s*|\s+to\s+/i);
    if (parts.length !== 2) return null;
    const open = parseClock(parts[0]);
    const close = parseClock(parts[1]);
    if (!open || !close) return null;
    const closeMeridiem = close.meridiem ?? open.meridiem ?? 'pm';
    const closeMin = toMinutes(close, closeMeridiem);
    let openMin: number;
    if (open.meridiem) {
      openMin = toMinutes(open, open.meridiem);
    } else {
      // "11–2 PM" means 11 AM; "5:30–10 PM" means 5:30 PM.
      openMin = toMinutes(open, closeMeridiem);
      if (openMin > closeMin) openMin = toMinutes(open, closeMeridiem === 'pm' ? 'am' : 'pm');
    }
    ranges.push(`${formatMinutes(openMin)} – ${formatMinutes(closeMin)}`);
  }
  return ranges.length > 0 ? ranges.join(', ') : null;
}

function weekHours(place: SerpPlace): Readonly<Record<string, string>> {
  if (place.operating_hours) return place.operating_hours;
  if (Array.isArray(place.hours)) return Object.assign({}, ...place.hours) as Record<string, string>;
  return {};
}

/** Weekly SerpApi hours → the cards' one-line "Daily …" format (most common day when they differ). */
export function summarizeSerpHours(place: SerpPlace): { readonly hours: string; readonly varies: boolean } | null {
  const days = Object.values(weekHours(place));
  if (days.length === 0) return null;
  const parsed = days.map(parseDayHours);
  const open = parsed.filter((d): d is string => d !== null);
  if (open.length === 0) return null;
  const counts = new Map<string, number>();
  for (const d of open) counts.set(d, (counts.get(d) ?? 0) + 1);
  const [mostCommon] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { hours: `Daily ${mostCommon}`, varies: counts.size > 1 || open.length < days.length || days.length < 7 };
}

/* ------------------------------------------------------------------ */
/* Mapping a SerpApi place onto a Restaurant                           */
/* ------------------------------------------------------------------ */

/** Google photo links come small; ask for a card-sized version instead. */
export function enlargeGooglePhoto(url: string): string {
  return /=w\d+-h\d+/.test(url) ? url.replace(/=w\d+-h\d+[^/?#]*$/, '=w960-h720-k-no') : url;
}

/** Singapore numbers without a country code get +65. */
export function formatSingaporePhone(phone: string | undefined): string {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 8 ? `+65 ${digits.slice(0, 4)} ${digits.slice(4)}` : trimmed;
}

/** Google names often carry SEO tails ("Saute Sushi | Paya Lebar Square | …"); keep the first part. */
export function cleanPlaceName(title: string | undefined): string {
  return (title ?? '').split(/\s+[|｜]\s+/)[0].trim();
}

export interface SerpReview {
  readonly details?: { readonly price_per_person?: string };
}

/** Most common "price per person" diners reported, as "$20–30"; null when nobody reported one. */
export function pricePerPersonFromReviews(reviews: readonly SerpReview[] | undefined): string | null {
  const counts = new Map<string, number>();
  for (const review of reviews ?? []) {
    const raw = review.details?.price_per_person?.trim();
    if (!raw) continue;
    const normalized = raw.replace(/^(SGD|S\$|\$)\s*/i, '').replace(/\s*[-—]\s*/g, '–').replace(/\s+/g, '');
    if (!/^\d/.test(normalized)) continue;
    const price = `$${normalized}`;
    counts.set(price, (counts.get(price) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Extra data fetched alongside the place: its photo gallery and review-based price. */
export interface SerpExtras {
  readonly photoUrls?: readonly string[];
  readonly pricePerPerson?: string | null;
}

function firstType(place: SerpPlace): string | undefined {
  const t = place.type;
  if (typeof t === 'string') return t;
  if (Array.isArray(t) && t.length > 0) return t[0];
  return place.types?.[0];
}

export function buildRestaurantFromSerpPlace(
  place: SerpPlace,
  options: { readonly id: string; readonly region: RegionId },
  extras: SerpExtras = {}
): { readonly restaurant: Restaurant; readonly warnings: readonly string[] } {
  const warnings: string[] = [];
  const name = cleanPlaceName(place.title) || 'New restaurant';
  const address = place.address?.trim() || '';
  const round = (n: number) => Math.round(n * 1e7) / 1e7;
  const lat = round(place.gps_coordinates?.latitude ?? 0);
  const lng = round(place.gps_coordinates?.longitude ?? 0);
  const category = firstType(place)?.trim() || 'Restaurant';
  const regionShort = options.region.charAt(0).toUpperCase() + options.region.slice(1);

  const hoursInfo = summarizeSerpHours(place);
  if (!hoursInfo) warnings.push('Google has no opening hours for this place; please fill them in.');
  else if (hoursInfo.varies) warnings.push('Opening hours differ by day; the most common day was used. Please check them.');
  const hours = hoursInfo?.hours ?? '';
  const firstOpening = hours.replace(/^Daily\s+/, '').split(/\s*[–-]\s*/)[0];

  const street = address.split(',')[0]?.replace(/^(blk\s*)?\d+[a-z]?\s+/i, '').trim();
  const areaName = [street || REGIONS[options.region].name, regionShort].join(' · ');

  // The photo gallery (full-size) comes first; the place's own thumbnails fill any gap.
  const photoUrls = [
    ...(extras.photoUrls ?? []).map((url) => ({ url, title: undefined as string | undefined })),
    ...(place.images ?? [])
      .filter((img) => img.thumbnail && !/menu|video|street view|360/i.test(img.title ?? ''))
      .map((img) => ({ url: img.thumbnail as string, title: img.title })),
    ...(place.thumbnail ? [{ url: place.thumbnail, title: undefined }] : []),
  ];
  const seen = new Set<string>();
  const photos: RestaurantPhoto[] = [];
  for (const { url, title } of photoUrls) {
    const big = enlargeGooglePhoto(url);
    if (seen.has(big) || photos.length >= MAX_PLACE_PHOTOS) continue;
    seen.add(big);
    const label = title && !/^all$/i.test(title) ? title : name;
    photos.push({
      url: big,
      caption: photos.length === 0 ? name : `${label} · Google Maps`,
      ...(photos.length === 0 && place.rating
        ? { rating: `${place.rating.toFixed(1)} ★ (${(place.reviews ?? 0).toLocaleString('en-US')})` }
        : {}),
    });
  }
  if (photos.length === 0) warnings.push('No photos came back for this place; add photo links manually.');
  if (!address) warnings.push('No address came back; please fill it in.');

  const officialPrice = (place.price ?? '').trim().replace(/-/g, '–');
  const priceRange = officialPrice || extras.pricePerPerson || '';
  if (!officialPrice && extras.pricePerPerson) {
    warnings.push(`Price is the most common "price per person" diners reported on Google (${extras.pricePerPerson}).`);
  }
  if (!priceRange) warnings.push('Google shows no price for this place; please fill it in.');

  const reviews: RestaurantReview[] = (place.user_reviews?.most_relevant ?? [])
    .filter((r) => r.username && r.description)
    .slice(0, 2)
    .map((r) => ({ author: r.username ?? '', rating: r.rating ?? 0, text: r.description ?? '', timeAgo: r.date ?? '' }));

  const description =
    typeof place.description === 'string' ? place.description : place.description?.snippet;

  const restaurant: Restaurant = {
    id: asRestaurantId(options.id),
    region: options.region,
    name,
    ...(place.place_id ? { googlePlaceId: place.place_id } : {}),
    areaName,
    googleCategory: category,
    openStatusText: firstOpening ? `Opens ${firstOpening}` : '',
    popularTimesPeak: '',
    coordinates: { lat, lng },
    cuisine: category,
    rating: Math.round((place.rating ?? 0) * 10) / 10,
    reviewCount: place.reviews ?? 0,
    priceRange,
    address,
    postalCode: address.match(/\b(\d{6})\b/)?.[1] ?? '',
    hours,
    serviceTag: '',
    phone: formatSingaporePhone(place.phone),
    websiteUrl: place.website ?? '',
    directionsUrl: createGoogleMapDirections(name, address),
    mapEmbedUrl: createGoogleMapEmbed(`${name}, ${address}`, { lat, lng }),
    description: description?.trim() || `${category} at ${address}.`,
    vibe: '',
    highlights: [],
    reviews,
    photos,
  };
  return { restaurant, warnings };
}

/* ------------------------------------------------------------------ */
/* Network calls (server only; need SERPAPI_API_KEY)                   */
/* ------------------------------------------------------------------ */

const SERPAPI_URL = 'https://serpapi.com/search.json';
const SERPAPI_TIMEOUT_MS = 25_000;
const SINGAPORE_VIEW = '@1.3521,103.8198,11z';

export function serpApiKey(): string | null {
  const key = (process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || '').trim();
  return key || null;
}

interface SerpResponse {
  readonly error?: string;
  readonly place_results?: SerpPlace;
  readonly local_results?: readonly SerpPlace[];
  /** engine=google_maps_photos */
  readonly photos?: readonly { readonly image?: string; readonly thumbnail?: string }[];
  /** engine=google_maps_reviews */
  readonly reviews?: readonly SerpReview[];
}

async function serpSearch(params: Readonly<Record<string, string>>, key: string): Promise<SerpResponse> {
  const query = new URLSearchParams({ engine: 'google_maps', hl: 'en', gl: 'sg', ...params, api_key: key });
  const res = await fetch(`${SERPAPI_URL}?${query.toString()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(SERPAPI_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as SerpResponse;
  if (data.error) {
    // "Google hasn't returned any results" is a normal "not found", not a key problem.
    throw new LookupError(/hasn't returned any results/i.test(data.error) ? 'Google Maps found no match for that link.' : `SerpApi: ${data.error}`);
  }
  if (!res.ok) throw new LookupError(`SerpApi request failed (HTTP ${res.status}).`);
  return data;
}

/** Pasted Google Maps link (or a name) → the place's details, in 1–2 SerpApi searches. */
export async function lookupPlaceWithSerpApi(link: string, key: string): Promise<SerpPlace> {
  const expanded = isShortMapsLink(link) ? await expandShortMapsLink(link) : link;
  const parsed = parseGoogleMapsLink(expanded);

  if (parsed.placeId) {
    const byId = await serpSearch({ place_id: parsed.placeId }, key);
    if (byId.place_results) return byId.place_results;
  }
  if (!parsed.name && parsed.lat === undefined) {
    throw new LookupError('That link has no place name or pin. Open the restaurant in Google Maps and use Share → Copy link.');
  }

  const ll = parsed.lat !== undefined && parsed.lng !== undefined ? `@${parsed.lat},${parsed.lng},17z` : SINGAPORE_VIEW;
  const search = await serpSearch({ type: 'search', q: parsed.name ?? 'vegetarian restaurant', ll }, key);
  if (search.place_results) return search.place_results;

  const best = search.local_results?.[0];
  if (!best) throw new LookupError(`Google Maps found no match for "${parsed.name ?? 'that link'}".`);
  // The list entry lacks photos and some details; fetch the full place when we can.
  if (best.place_id) {
    try {
      const full = await serpSearch({ place_id: best.place_id }, key);
      if (full.place_results) return { ...best, ...full.place_results };
    } catch {
      // Fall back to the list entry.
    }
  }
  return best;
}

/**
 * Everything needed for a restaurant draft: the place, its photo gallery, and
 * (only when Google shows no official price) diners' price per person from
 * its reviews. The two extra searches run in parallel; if either fails the
 * draft is still returned, with a warning.
 */
export async function lookupRestaurantWithSerpApi(
  link: string,
  key: string
): Promise<{ readonly place: SerpPlace; readonly extras: SerpExtras; readonly warnings: readonly string[] }> {
  const place = await lookupPlaceWithSerpApi(link, key);
  const dataId = place.data_id;
  if (!dataId) return { place, extras: {}, warnings: [] };

  const wantPrice = !(place.price ?? '').trim();
  const [photosResult, reviewsResult] = await Promise.allSettled([
    serpSearch({ engine: 'google_maps_photos', data_id: dataId }, key),
    wantPrice
      ? serpSearch({ engine: 'google_maps_reviews', data_id: dataId, sort_by: 'newestFirst' }, key)
      : Promise.resolve<SerpResponse>({}),
  ]);

  const warnings: string[] = [];
  const photoUrls =
    photosResult.status === 'fulfilled'
      ? (photosResult.value.photos ?? [])
          .map((p) => p.image ?? p.thumbnail)
          .filter((u): u is string => Boolean(u))
          .slice(0, MAX_PLACE_PHOTOS)
      : [];
  if (photosResult.status === 'rejected') warnings.push('Couldn’t load the photo gallery; used Google’s preview photos instead.');

  const pricePerPerson =
    reviewsResult.status === 'fulfilled' ? pricePerPersonFromReviews(reviewsResult.value.reviews) : null;

  return { place, extras: { photoUrls, pricePerPerson }, warnings };
}
