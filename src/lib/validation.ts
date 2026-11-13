import {
  findRestaurantById,
  isValidRegionId,
  type RegionId,
  type Restaurant,
  type RestaurantId,
} from './restaurants';

export interface InviteSubmission {
  readonly region: RegionId;
  readonly restaurantId: RestaurantId;
  readonly restaurant: Restaurant;
  readonly comment: string;
  readonly guestName: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly value: InviteSubmission }
  | { readonly ok: false; readonly error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown, maxLen: number, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLen) : fallback;
}

export function parseInviteSubmission(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Request payload must be a JSON object.' };
  }

  const rawRegion = raw.region;
  if (!isValidRegionId(rawRegion)) {
    return {
      ok: false,
      error: 'Please select a valid Singapore region (North, South, East, West, or Central).',
    };
  }

  const rawRestaurantId = raw.restaurantId;
  if (typeof rawRestaurantId !== 'string' || rawRestaurantId.trim().length === 0) {
    return { ok: false, error: 'Please select a vegetarian restaurant.' };
  }

  const restaurant = findRestaurantById(rawRestaurantId.trim());
  if (!restaurant) {
    return { ok: false, error: 'Selected vegetarian restaurant was not found in our catalog.' };
  }

  if (restaurant.region !== rawRegion) {
    return {
      ok: false,
      error: `Selected restaurant "${restaurant.name}" belongs to ${restaurant.region.toUpperCase()}, not ${rawRegion.toUpperCase()}.`,
    };
  }

  const rawComment = raw.comment;
  if (typeof rawComment !== 'string') {
    return { ok: false, error: 'Comment field must be a string.' };
  }

  const trimmedComment = rawComment.trim();
  if (trimmedComment.length > 2000) {
    return { ok: false, error: 'Comment must be 2,000 characters or fewer.' };
  }

  const guestName = readOptionalString(raw.guestName, 120, 'Dinner Guest');

  return {
    ok: true,
    value: {
      region: rawRegion,
      restaurantId: restaurant.id,
      restaurant,
      comment:
        trimmedComment.length > 0
          ? trimmedComment
          : 'Looking forward to catching up over a great dinner!',
      guestName,
    },
  };
}
