import {
  REGIONS,
  REGION_ORDER,
  asRestaurantId,
  isValidHoursString,
  isValidRegionId,
  type RegionId,
  type Restaurant,
  type RestaurantPhoto,
  type RestaurantReview,
} from './restaurants';

/** Each region shows at most this many restaurants (and needs at least one). */
export const MAX_RESTAURANTS_PER_REGION = 3;

/**
 * A region's restaurants in display order: the "I want to try" pick goes in
 * the middle slot, so it sits centre on desktop (mobile moves it first via CSS).
 */
export function restaurantsForDisplay(
  catalog: readonly Restaurant[],
  region: RegionId
): readonly Restaurant[] {
  const list = catalog.filter((r) => r.region === region);
  const pickIndex = list.findIndex((r) => r.hostWantsToTry);
  if (pickIndex < 0 || list.length < 2) return list;
  const rest = list.filter((_, i) => i !== pickIndex);
  return [rest[0], list[pickIndex], ...rest.slice(1)];
}

/** Turns "I want to try" on for one restaurant (clearing the rest of its region) or off. */
export function setWantsToTry(
  catalog: readonly Restaurant[],
  id: string,
  on: boolean
): readonly Restaurant[] {
  const target = catalog.find((r) => r.id === id);
  if (!target) return catalog;
  return catalog.map((r) => {
    if (r.id === id) return { ...r, hostWantsToTry: on };
    if (on && r.region === target.region && r.hostWantsToTry) return { ...r, hostWantsToTry: false };
    return r;
  });
}

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'restaurant';
}

export function uniqueRestaurantId(takenIds: Iterable<string>, name: string): string {
  const taken = new Set(takenIds);
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/* ------------------------------------------------------------------ */
/* Validation of a catalog sent by the admin page                      */
/* ------------------------------------------------------------------ */

export type CatalogValidation =
  | { readonly ok: true; readonly catalog: readonly Restaurant[] }
  | { readonly ok: false; readonly errors: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
}

function isPhotoUrl(url: string): boolean {
  return /^https:\/\//.test(url);
}

/**
 * Checks and normalises a whole catalog: required fields, Singapore
 * coordinates, hours format, unique ids, 1 to 3 restaurants per region and at
 * most one "I want to try" pick per region. Returns every problem found.
 */
export function validateCatalog(raw: unknown): CatalogValidation {
  if (!Array.isArray(raw)) return { ok: false, errors: ['Catalog must be a list of restaurants.'] };

  const errors: string[] = [];
  const restaurants: Restaurant[] = [];
  const ids = new Set<string>();

  raw.forEach((item, index) => {
    const label = isRecord(item) && str(item.name) ? `"${str(item.name)}"` : `Restaurant #${index + 1}`;
    if (!isRecord(item)) {
      errors.push(`${label} is not a valid restaurant.`);
      return;
    }
    const problems: string[] = [];

    const id = str(item.id, 80);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) problems.push('has an invalid id');
    else if (ids.has(id)) problems.push(`has a duplicate id "${id}"`);
    ids.add(id);

    const region = item.region;
    if (!isValidRegionId(region)) problems.push('needs a region');

    const name = str(item.name, 120);
    if (!name) problems.push('needs a name');
    const address = str(item.address, 300);
    if (!address) problems.push('needs an address');
    const cuisine = str(item.cuisine, 80);
    if (!cuisine) problems.push('needs a cuisine label');

    const hours = str(item.hours, 200);
    if (!isValidHoursString(hours)) {
      problems.push('needs hours like "Daily 11:00 am – 9:30 pm" (add more ranges with commas)');
    }

    const coords = isRecord(item.coordinates) ? item.coordinates : {};
    const lat = num(coords.lat);
    const lng = num(coords.lng);
    if (!(lat >= 1.15 && lat <= 1.5 && lng >= 103.55 && lng <= 104.1)) {
      problems.push('needs map coordinates inside Singapore');
    }

    const rating = num(item.rating);
    if (!(rating >= 0 && rating <= 5)) problems.push('needs a rating from 0 to 5');
    const reviewCount = num(item.reviewCount);
    if (!(Number.isInteger(reviewCount) && reviewCount >= 0)) problems.push('needs a whole-number review count');

    const mapEmbedUrl = str(item.mapEmbedUrl, 1000);
    if (!mapEmbedUrl.startsWith('https://www.google.com/maps')) problems.push('needs a Google Maps embed link');
    const directionsUrl = str(item.directionsUrl, 1000);
    if (!directionsUrl.startsWith('https://')) problems.push('needs a directions link');

    const photos: RestaurantPhoto[] = [];
    for (const photo of Array.isArray(item.photos) ? item.photos : []) {
      if (!isRecord(photo)) continue;
      const url = str(photo.url, 2000);
      if (!isPhotoUrl(url)) {
        problems.push(`has a photo link that isn't https: "${url.slice(0, 40)}…"`);
        continue;
      }
      const rating = str(photo.rating, 40);
      photos.push({ url, caption: str(photo.caption, 120) || name, ...(rating ? { rating } : {}) });
    }

    const reviews: RestaurantReview[] = [];
    for (const review of Array.isArray(item.reviews) ? item.reviews : []) {
      if (!isRecord(review) || !str(review.author) || !str(review.text)) continue;
      reviews.push({
        author: str(review.author, 120),
        rating: Math.max(0, Math.min(5, num(review.rating) || 0)),
        text: str(review.text, 2000),
        timeAgo: str(review.timeAgo, 60),
      });
    }

    if (problems.length > 0) {
      errors.push(`${label} ${problems.join(', ')}.`);
      return;
    }

    const chineseName = str(item.chineseName, 60);
    const googlePlaceId = str(item.googlePlaceId, 300);
    restaurants.push({
      id: asRestaurantId(id),
      region: region as RegionId,
      name,
      ...(chineseName ? { chineseName } : {}),
      ...(item.hostWantsToTry === true ? { hostWantsToTry: true } : {}),
      ...(googlePlaceId ? { googlePlaceId } : {}),
      areaName: str(item.areaName, 120) || REGIONS[region as RegionId].name,
      googleCategory: str(item.googleCategory, 80) || 'Restaurant',
      openStatusText: str(item.openStatusText, 80),
      popularTimesPeak: str(item.popularTimesPeak, 80),
      coordinates: { lat, lng },
      cuisine,
      rating,
      reviewCount,
      priceRange: str(item.priceRange, 40),
      address,
      postalCode: str(item.postalCode, 12),
      hours,
      serviceTag: str(item.serviceTag, 160),
      phone: str(item.phone, 40),
      websiteUrl: str(item.websiteUrl, 1000),
      directionsUrl,
      mapEmbedUrl,
      description: str(item.description, 1000),
      vibe: str(item.vibe, 160),
      highlights: (Array.isArray(item.highlights) ? item.highlights : [])
        .map((h) => str(h, 160))
        .filter(Boolean),
      reviews,
      photos,
    });
  });

  for (const region of REGION_ORDER) {
    const inRegion = restaurants.filter((r) => r.region === region);
    const regionName = REGIONS[region].name;
    const total = raw.filter((r) => isRecord(r) && r.region === region).length;
    if (total === 0) errors.push(`${regionName} needs at least one restaurant.`);
    if (total > MAX_RESTAURANTS_PER_REGION) {
      errors.push(`${regionName} has ${total} restaurants; the limit is ${MAX_RESTAURANTS_PER_REGION}.`);
    }
    if (inRegion.filter((r) => r.hostWantsToTry).length > 1) {
      errors.push(`${regionName} can only have one "I want to try" pick.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  const ordered = REGION_ORDER.flatMap((region) => restaurants.filter((r) => r.region === region));
  return { ok: true, catalog: ordered };
}
