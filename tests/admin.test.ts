import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RESTAURANTS_PER_REGION,
  restaurantsForDisplay,
  setWantsToTry,
  uniqueRestaurantId,
  validateCatalog,
} from '../src/lib/catalog';
import { parseGoogleMapsLink } from '../src/lib/maps-link';
import { SEED_RESTAURANTS, isValidHoursString, type Restaurant } from '../src/lib/restaurants';
import {
  buildRestaurantFromSerpPlace,
  cleanPlaceName,
  enlargeGooglePhoto,
  pricePerPersonFromReviews,
  formatSingaporePhone,
  parseDayHours,
  summarizeSerpHours,
  type SerpPlace,
} from '../src/lib/serpapi';

const north = () => SEED_RESTAURANTS.filter((r) => r.region === 'north');

describe('Admin catalog rules', () => {
  it('accepts the built-in catalog unchanged', () => {
    const checked = validateCatalog(SEED_RESTAURANTS);
    assert.equal(checked.ok, true, checked.ok ? '' : checked.errors.join('\n'));
    if (checked.ok) assert.equal(checked.catalog.length, SEED_RESTAURANTS.length);
  });

  it('rejects a fourth restaurant in a region and an empty region', () => {
    const extra = { ...north()[0], id: 'extra-north' };
    const tooMany = validateCatalog([...SEED_RESTAURANTS, extra]);
    assert.equal(tooMany.ok, false);
    if (!tooMany.ok) assert.ok(tooMany.errors.some((e) => e.includes(`limit is ${MAX_RESTAURANTS_PER_REGION}`)));

    const noNorth = validateCatalog(SEED_RESTAURANTS.filter((r) => r.region !== 'north'));
    assert.equal(noNorth.ok, false);
    if (!noNorth.ok) assert.ok(noNorth.errors.some((e) => e.includes('needs at least one restaurant')));
  });

  it('reports missing fields, bad hours and coordinates outside Singapore', () => {
    const broken = { ...north()[0], name: '', hours: '11am to 9pm', coordinates: { lat: 0, lng: 0 } };
    const checked = validateCatalog([...SEED_RESTAURANTS.filter((r) => r.id !== broken.id), broken]);
    assert.equal(checked.ok, false);
    if (!checked.ok) {
      const message = checked.errors.join(' ');
      assert.match(message, /needs a name/);
      assert.match(message, /needs hours like/);
      assert.match(message, /inside Singapore/);
    }
  });

  it('keeps only one "I want to try" pick per region', () => {
    const [a, b] = north();
    let catalog: readonly Restaurant[] = setWantsToTry(SEED_RESTAURANTS, a.id, true);
    catalog = setWantsToTry(catalog, b.id, true);
    const picks = catalog.filter((r) => r.region === 'north' && r.hostWantsToTry);
    assert.deepEqual(picks.map((r) => r.id), [b.id]);
    // The West pick is untouched by a North change.
    assert.ok(catalog.some((r) => r.region === 'west' && r.hostWantsToTry));

    const twoPicks = SEED_RESTAURANTS.map((r) => (r.region === 'north' ? { ...r, hostWantsToTry: true } : r));
    const checked = validateCatalog(twoPicks);
    assert.equal(checked.ok, false);
  });

  it('puts the "I want to try" pick in the middle slot for display', () => {
    const [a, b, c] = north();
    const catalog = setWantsToTry(SEED_RESTAURANTS, c.id, true);
    assert.deepEqual(restaurantsForDisplay(catalog, 'north').map((r) => r.id), [a.id, c.id, b.id]);
    const firstPicked = setWantsToTry(SEED_RESTAURANTS, a.id, true);
    assert.deepEqual(restaurantsForDisplay(firstPicked, 'north').map((r) => r.id), [b.id, a.id, c.id]);
  });

  it('makes unique slug ids', () => {
    assert.equal(uniqueRestaurantId([], 'SHU Vegetarian 蔬方斋'), 'shu-vegetarian');
    assert.equal(uniqueRestaurantId(['shu-vegetarian', 'shu-vegetarian-2'], 'SHU Vegetarian'), 'shu-vegetarian-3');
  });

  it('checks the hours format the cards can read', () => {
    assert.equal(isValidHoursString('Daily 11:00 am – 9:30 pm'), true);
    assert.equal(isValidHoursString('Daily 11:30 am – 3:00 pm, 6:00 pm – 10:30 pm'), true);
    assert.equal(isValidHoursString('11am - 9pm'), false);
    assert.equal(isValidHoursString('Daily noon – late'), false);
  });
});

describe('Google Maps link auto-fill', () => {
  it('reads the name and pin from a full Google Maps place link', () => {
    const parsed = parseGoogleMapsLink(
      'https://www.google.com/maps/place/SHU+Vegetarian+%E8%94%AC%E6%96%B9%E6%96%8B/@1.4327,103.7849,17z/data=!3m1!4b1!4m6!3m5!1s0x31da13:0xabc!8m2!3d1.432739!4d103.785173!16s%2Fg%2F11abc'
    );
    assert.equal(parsed.name, 'SHU Vegetarian 蔬方斋');
    assert.equal(parsed.lat, 1.432739);
    assert.equal(parsed.lng, 103.785173);
  });

  it('reads place IDs and plain-text searches', () => {
    assert.equal(
      parseGoogleMapsLink('https://www.google.com/maps/search/?api=1&query=Greendot&query_place_id=ChIJabc123xyz').placeId,
      'ChIJabc123xyz'
    );
    assert.equal(parseGoogleMapsLink('https://maps.google.com/?q=place_id:ChIJdef456').placeId, 'ChIJdef456');
    assert.deepEqual(parseGoogleMapsLink('Leaf Corner Sembawang'), { name: 'Leaf Corner Sembawang' });
  });

});

describe('SerpApi auto-fill', () => {
  it('reads Google hours text, including a missing AM/PM on the opening time', () => {
    assert.equal(parseDayHours('6 AM–10 PM'), '6:00 am – 10:00 pm');
    assert.equal(parseDayHours('7:30AM–4PM'), '7:30 am – 4:00 pm');
    assert.equal(parseDayHours('10:30 AM–9 PM'), '10:30 am – 9:00 pm');
    assert.equal(parseDayHours('7:30–10:30 AM, 12–10:30 PM'), '7:30 am – 10:30 am, 12:00 pm – 10:30 pm');
    assert.equal(parseDayHours('11–2 PM, 5:30–10 PM'), '11:00 am – 2:00 pm, 5:30 pm – 10:00 pm');
    assert.equal(parseDayHours('Open 24 hours'), '12:00 am – 11:59 pm');
    assert.equal(parseDayHours('Closed'), null);
    for (const sample of ['6 AM–10 PM', '7:30–10:30 AM, 12–10:30 PM']) {
      assert.equal(isValidHoursString(`Daily ${parseDayHours(sample)}`), true, sample);
    }
  });

  it('summarises a week of hours from either response shape', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const same = Object.fromEntries(days.map((d) => [d, '10:30 AM–9 PM']));
    assert.deepEqual(summarizeSerpHours({ operating_hours: same }), { hours: 'Daily 10:30 am – 9:00 pm', varies: false });
    const asArray = days.map((d) => ({ [d]: d === 'monday' ? 'Closed' : '11 AM–9:30 PM' }));
    assert.deepEqual(summarizeSerpHours({ hours: asArray }), { hours: 'Daily 11:00 am – 9:30 pm', varies: true });
    assert.equal(summarizeSerpHours({}), null);
  });

  it('enlarges Google photo links and formats Singapore phone numbers', () => {
    assert.equal(
      enlargeGooglePhoto('https://lh5.googleusercontent.com/p/AF1QipNtn=w447-h298-k-no'),
      'https://lh5.googleusercontent.com/p/AF1QipNtn=w960-h720-k-no'
    );
    assert.equal(enlargeGooglePhoto('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
    assert.equal(formatSingaporePhone('8771 8829'), '+65 8771 8829');
    assert.equal(formatSingaporePhone('+65 6219 0898'), '+65 6219 0898');
    assert.equal(formatSingaporePhone(undefined), '');
  });

  it('builds a valid restaurant from a SerpApi place', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const place: SerpPlace = {
      title: 'SHU Vegetarian',
      place_id: 'ChIJ_serp_place_1',
      gps_coordinates: { latitude: 1.432739, longitude: 103.785173 },
      rating: 3.7,
      reviews: 83,
      price: '$1-10',
      type: ['Vegetarian restaurant', 'Chinese restaurant'],
      address: '354A Woodlands Ave 1, #01-01, Singapore 730354',
      phone: '8771 8829',
      hours: days.map((d) => ({ [d]: '10:30 AM–9 PM' })),
      images: [
        { title: 'All', thumbnail: 'https://lh5.googleusercontent.com/p/AAA=w447-h298-k-no' },
        { title: 'Menu', thumbnail: 'https://lh5.googleusercontent.com/p/MENU=w447-h298-k-no' },
        { title: 'Food & drink', thumbnail: 'https://lh5.googleusercontent.com/p/BBB=w447-h298-k-no' },
      ],
      user_reviews: { most_relevant: [{ username: 'Dana', rating: 4, description: 'Good mala.', date: '2 weeks ago' }] },
    };
    const { restaurant, warnings } = buildRestaurantFromSerpPlace(place, { id: 'shu-vegetarian', region: 'north' });
    assert.deepEqual(warnings, []);
    assert.equal(restaurant.cuisine, 'Vegetarian restaurant');
    assert.equal(restaurant.hours, 'Daily 10:30 am – 9:00 pm');
    assert.equal(restaurant.priceRange, '$1–10');
    assert.equal(restaurant.phone, '+65 8771 8829');
    assert.equal(restaurant.postalCode, '730354');
    assert.equal(restaurant.areaName, 'Woodlands Ave 1 · North');
    assert.deepEqual(
      restaurant.photos.map((p) => p.url),
      ['https://lh5.googleusercontent.com/p/AAA=w960-h720-k-no', 'https://lh5.googleusercontent.com/p/BBB=w960-h720-k-no'],
      'menu photos skipped, sizes enlarged'
    );
    assert.equal(restaurant.photos[0].rating, '3.7 ★ (83)');
    assert.equal(restaurant.reviews[0].author, 'Dana');

    const others = SEED_RESTAURANTS.filter((r) => r.id !== north()[2].id);
    const checked = validateCatalog([...others, restaurant]);
    assert.equal(checked.ok, true, checked.ok ? '' : checked.errors.join('\n'));
  });
});

describe('SerpApi names, prices and photos', () => {
  it('trims SEO tails off Google place names', () => {
    assert.equal(
      cleanPlaceName('Saute Sushi | Paya Lebar Square | Paya Lebar | Vegetarian Vegan Halal | Japanese Cuisines'),
      'Saute Sushi'
    );
    assert.equal(cleanPlaceName('Leaf Corner Vegetarian'), 'Leaf Corner Vegetarian');
    assert.equal(cleanPlaceName(undefined), '');
  });

  it('uses the most common price per person from reviews', () => {
    // Shape taken from a real google_maps_reviews response.
    const reviews = [
      { details: { price_per_person: 'SGD 20–30' } },
      { details: { price_per_person: 'SGD 20–30' } },
      { details: { price_per_person: 'SGD 40–50' } },
      { details: {} },
      {},
    ];
    assert.equal(pricePerPersonFromReviews(reviews), '$20–30');
    assert.equal(pricePerPersonFromReviews([{ details: { price_per_person: 'SGD 100+' } }]), '$100+');
    assert.equal(pricePerPersonFromReviews([]), null);
  });

  it('prefers the official price, then review price, and gallery photos first', () => {
    const base: SerpPlace = {
      title: 'Saute Sushi | Paya Lebar Square',
      gps_coordinates: { latitude: 1.3191724999999999, longitude: 103.8925563 },
      rating: 4.8,
      reviews: 2103,
      type: 'Vegetarian restaurant',
      address: '60 Paya Lebar Rd, #B1-19 Paya Lebar Square, Singapore 409051',
      thumbnail: 'https://lh3.googleusercontent.com/gps-cs-s/THUMB=w203-h139-k-no',
    };
    const gallery = ['a', 'b', 'c', 'd'].map((id) => `https://lh3.googleusercontent.com/gps-cs-s/${id}=w4032-h3024-k-no`);
    const fromReviews = buildRestaurantFromSerpPlace(base, { id: 'saute-sushi', region: 'east' }, {
      photoUrls: gallery,
      pricePerPerson: '$20–30',
    });
    assert.equal(fromReviews.restaurant.name, 'Saute Sushi');
    assert.equal(fromReviews.restaurant.priceRange, '$20–30');
    assert.ok(fromReviews.warnings.some((w) => w.includes('price per person')));
    assert.equal(fromReviews.restaurant.coordinates.lat, 1.3191725);
    assert.equal(fromReviews.restaurant.photos.length, 4);
    assert.equal(fromReviews.restaurant.photos[0].url, 'https://lh3.googleusercontent.com/gps-cs-s/a=w960-h720-k-no');

    const official = buildRestaurantFromSerpPlace({ ...base, price: '$10-20' }, { id: 'saute-sushi', region: 'east' }, {
      pricePerPerson: '$20–30',
    });
    assert.equal(official.restaurant.priceRange, '$10–20');
    assert.equal(official.restaurant.photos.length, 1, 'falls back to the place thumbnail');

    const none = buildRestaurantFromSerpPlace(base, { id: 'saute-sushi', region: 'east' });
    assert.equal(none.restaurant.priceRange, '');
    assert.ok(none.warnings.some((w) => w.includes('no price')));
  });
});