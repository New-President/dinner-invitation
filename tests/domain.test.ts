import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGIONS,
  REGION_ORDER,
  RESTAURANTS,
  getRestaurantsByRegion,
  findRestaurantById,
  getLiveOpeningStatus,
} from '../src/lib/restaurants';
import { parseInviteSubmission } from '../src/lib/validation';
import {
  RECIPIENT_EMAIL,
  buildInvitationEmailContent,
} from '../src/app/api/send-invite/route';

describe('Singapore Vegetarian Restaurant Domain Catalog', () => {
  it('defines all 5 Singapore regions (North, South, East, West, Central)', () => {
    assert.deepEqual(
      [...REGION_ORDER].sort(),
      ['central', 'east', 'north', 'south', 'west'],
      'all 5 regions present'
    );
    for (const regionId of REGION_ORDER) {
      assert.ok(REGIONS[regionId], `metadata exists for ${regionId}`);
    }
  });

  it('provides exactly 3 vegetarian restaurants per region (15 total) with distinct cuisines and clean Google Maps embed URLs', () => {
    assert.equal(RESTAURANTS.length, 15, '15 total vegetarian restaurants');

    for (const regionId of REGION_ORDER) {
      const regional = getRestaurantsByRegion(regionId);
      assert.equal(regional.length, 3, `${regionId} has 3 restaurants`);

      const cuisines = new Set(regional.map((r) => r.cuisine));
      assert.equal(
        cuisines.size,
        3,
        `${regionId} has 3 distinct cuisines: ${[...cuisines].join(', ')}`
      );

      for (const rest of regional) {
        assert.ok(
          rest.mapEmbedUrl.startsWith('https://www.google.com/maps?q=') &&
            rest.mapEmbedUrl.includes('output=embed') &&
            !rest.mapEmbedUrl.includes('%23'),
          `${rest.name} has a valid Google Maps embed URL without # unit numbers`
        );
        assert.ok(
          rest.coordinates.lat >= 1.2 &&
            rest.coordinates.lat <= 1.48 &&
            rest.coordinates.lng >= 103.65 &&
            rest.coordinates.lng <= 104.05,
          `${rest.name} has valid Singapore GPS coordinates`
        );
        assert.ok(rest.areaName.length > 0, `${rest.name} has areaName`);
        assert.ok(rest.googleCategory.length > 0, `${rest.name} has googleCategory`);
        assert.ok(rest.openStatusText.length > 0, `${rest.name} has openStatusText`);
        assert.ok(rest.popularTimesPeak.length > 0, `${rest.name} has popularTimesPeak`);
        assert.ok(rest.highlights.length >= 3, `${rest.name} has menu highlights`);
        assert.ok(rest.reviews.length >= 2, `${rest.name} has diner reviews`);
        assert.ok(rest.photos.length >= 4, `${rest.name} has at least 4 live Google Maps photos`);
        for (const photo of rest.photos) {
          assert.ok(
            photo.url.startsWith('https://lh3.googleusercontent.com/grass-cs/'),
            `${rest.name} photo uses official Google Maps CDN`
          );
        }
      }
    }
  });

  it("includes D'life Bistro & Cafe in West Singapore matching the reference Place card", () => {
    const dlife = findRestaurantById('dlife-bistro-cafe');
    assert.ok(dlife, "D'life Bistro & Cafe exists in catalog");
    assert.equal(dlife.region, 'west');
    assert.equal(dlife.address, '6 Chun Tin Rd, Singapore 599593');
    assert.equal(dlife.rating, 4.3);
    assert.equal(dlife.reviewCount, 594);
  });

  it('computes live Singapore time (Asia/Singapore) Open/Closed status accurately across single and split-session hours', () => {
    // 03:20 am SGT (2026-11-12T19:20:00Z) -> Closed, Opens 10:00 am
    const earlyMorning = new Date('2026-11-12T19:20:00Z');
    const dlifeEarly = getLiveOpeningStatus('Daily 10:00 am – 9:30 pm', earlyMorning);
    assert.equal(dlifeEarly.isOpen, false);
    assert.equal(dlifeEarly.statusBadge, 'Closed');
    assert.equal(dlifeEarly.detailText, 'Opens 10:00 am');
    assert.equal(dlifeEarly.currentTimeSGT, '3:20 am SGT');

    // 1:00 pm SGT (2026-11-13T05:00:00Z) -> Open, Closes 9:30 pm
    const midday = new Date('2026-11-13T05:00:00Z');
    const dlifeMidday = getLiveOpeningStatus('Daily 10:00 am – 9:30 pm', midday);
    assert.equal(dlifeMidday.isOpen, true);
    assert.equal(dlifeMidday.statusBadge, 'Open');
    assert.equal(dlifeMidday.detailText, 'Closes 9:30 pm');
    assert.equal(dlifeMidday.currentTimeSGT, '1:00 pm SGT');

    // 4:00 pm SGT (2026-11-13T08:00:00Z) on split shift (Whole Earth) -> Closed, Opens 5:30 pm
    const afternoonBreak = new Date('2026-11-13T08:00:00Z');
    const wholeEarthBreak = getLiveOpeningStatus(
      'Daily 11:30 am – 3:00 pm, 5:30 pm – 10:00 pm',
      afternoonBreak
    );
    assert.equal(wholeEarthBreak.isOpen, false);
    assert.equal(wholeEarthBreak.statusBadge, 'Closed');
    assert.equal(wholeEarthBreak.detailText, 'Opens 5:30 pm');
    assert.equal(wholeEarthBreak.currentTimeSGT, '4:00 pm SGT');
    assert.deepEqual(wholeEarthBreak.scheduleLines, [
      '11:30 am – 3:00 pm',
      '5:30 pm – 10:00 pm',
    ]);
  });
});

describe('Boundary Validation & Email Payload Builder', () => {
  it('accepts a valid dinner invitation submission and resolves the restaurant', () => {
    const result = parseInviteSubmission({
      region: 'west',
      restaurantId: 'dlife-bistro-cafe',
      comment: 'Excited to try the Crispy Yam Ring!',
      guestName: 'Alex',
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.region, 'west');
      assert.equal(result.value.restaurant.name, "D'life Bistro & Cafe");
      assert.equal(result.value.comment, 'Excited to try the Crispy Yam Ring!');
      assert.equal(result.value.guestName, 'Alex');
    }
  });

  it('rejects mismatched region and restaurantId across boundaries', () => {
    const result = parseInviteSubmission({
      region: 'east',
      restaurantId: 'dlife-bistro-cafe',
      comment: 'Hello!',
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /belongs to WEST, not EAST/);
    }
  });

  it('rejects unknown regions and oversized comments', () => {
    const badRegion = parseInviteSubmission({
      region: 'sentosa-only',
      restaurantId: 'dlife-bistro-cafe',
      comment: 'Hi',
    });
    assert.equal(badRegion.ok, false);

    const hugeComment = parseInviteSubmission({
      region: 'west',
      restaurantId: 'dlife-bistro-cafe',
      comment: 'x'.repeat(2005),
    });
    assert.equal(hugeComment.ok, false);
  });

  it('builds celebratory HTML and plain-text email for Yong Zi Ren addressed to zirenyong2004@gmail.com', () => {
    assert.equal(RECIPIENT_EMAIL, 'zirenyong2004@gmail.com');
    const parsed = parseInviteSubmission({
      region: 'central',
      restaurantId: 'whole-earth-tanjong-pagar',
      comment: 'Let us try the Penang Rendang & Olive Rice!',
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const email = buildInvitationEmailContent(
        parsed.value,
        'Friday, 13 November 2026 at 7:00 pm'
      );
      assert.match(email.subject, /Whole Earth/);
      assert.match(email.html, /Yong Zi Ren/);
      assert.match(email.html, /zirenyong2004@gmail.com/);
      assert.match(email.html, /Let us try the Penang Rendang &amp; Olive Rice!/);
      assert.match(email.text, /76 Peck Seah St, Singapore 079331/);
    }
  });
});
