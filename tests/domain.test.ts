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
} from '../src/lib/email-template';
import {
  DINNER_SCHEDULE,
  buildCalendarTargets,
  buildHostGoogleCalendarUrl,
  serializeDinnerCalendarIcs,
} from '../src/lib/calendar';
import { GET as getCalendarIcs } from '../src/app/api/calendar/route';
import {
  KEYBOARD_STEP_PX,
  MINI_HEIGHT,
  MINI_WIDTH,
  clampCompanionPosition,
  computeFloorY,
  computeTableLayout,
  createInitialCompanionState,
  deriveMiniExpression,
  describeHorizontalZone,
  endCompanionDrag,
  moveCompanionDrag,
  nudgeCompanion,
  settleOnNewFloor,
  startCompanionDrag,
  stepCompanionTick,
  syncCompanionStep,
  type CompanionState,
  type CompanionViewport,
} from '../src/lib/mini-companion';

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

  it('builds celebratory HTML and plain-text email for the host addressed to RECIPIENT_EMAIL', () => {
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

  it('includes a Google Calendar event creation link for the host in the email', () => {
    const parsed = parseInviteSubmission({
      region: 'west',
      restaurantId: 'dlife-bistro-cafe',
      comment: 'See you there!',
      guestName: 'Alex',
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const hostUrl = buildHostGoogleCalendarUrl({
      restaurant: parsed.value.restaurant,
      comment: parsed.value.comment,
      guestName: parsed.value.guestName,
    });
    const url = new URL(hostUrl);
    assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
    assert.equal(url.searchParams.get('action'), 'TEMPLATE');
    assert.equal(url.searchParams.get('text'), "Vegetarian Dinner with Alex at D'life Bistro & Cafe");
    assert.equal(url.searchParams.get('dates'), '20261130T190000/20261130T210000');
    assert.equal(url.searchParams.get('ctz'), 'Asia/Singapore');
    assert.equal(url.searchParams.get('location'), parsed.value.restaurant.address);
    assert.match(url.searchParams.get('details') ?? '', /Note: See you there!/);

    const email = buildInvitationEmailContent(parsed.value, 'Sun, 15 Nov 2026 at 8:00 pm');
    assert.ok(email.text.includes(`Add to Google Calendar: ${hostUrl}`));
    assert.ok(email.html.includes(hostUrl.replace(/&/g, '&amp;')));
    assert.match(email.html, /Add to Google Calendar/);

    const noName = buildHostGoogleCalendarUrl({ restaurant: parsed.value.restaurant, comment: '' });
    assert.equal(new URL(noName).searchParams.get('text'), "Vegetarian Dinner at D'life Bistro & Cafe");
    const placeholderName = buildHostGoogleCalendarUrl({
      restaurant: parsed.value.restaurant,
      comment: '',
      guestName: 'Dinner Guest',
    });
    assert.equal(new URL(placeholderName).searchParams.get('text'), "Vegetarian Dinner at D'life Bistro & Cafe");
  });
});

describe('Multi-Platform Calendar Targets & RFC 5545 ICS Serializer', () => {
  it('builds all 5 provider targets with exact Nov 30, 2026 7:00 PM – 9:00 PM SGT timestamps and metadata', () => {
    assert.equal(DINNER_SCHEDULE.dateLabel, 'Mon, 30 Nov 2026');
    assert.equal(DINNER_SCHEDULE.timeLabel, '7:00 PM – 9:00 PM SGT');
    assert.equal(DINNER_SCHEDULE.timeZone, 'Asia/Singapore');

    const restaurant = findRestaurantById('dlife-bistro-cafe');
    assert.ok(restaurant, "D'life Bistro & Cafe exists");

    const targets = buildCalendarTargets({
      restaurant,
      comment: 'Save room for Crispy Yam Ring!',
      guestName: 'Alex Tan',
    });

    assert.deepEqual(
      targets.map((t) => t.id),
      ['google', 'apple', 'outlook-office', 'outlook-live', 'yahoo']
    );

    const [google, apple, outlookOffice, outlookLive, yahoo] = targets;

    assert.equal(google.opensInNewTab, true);
    const googleUrl = new URL(google.href);
    assert.equal(googleUrl.origin, 'https://calendar.google.com');
    assert.equal(googleUrl.pathname, '/calendar/render');
    assert.equal(googleUrl.searchParams.get('action'), 'TEMPLATE');
    assert.equal(
      googleUrl.searchParams.get('text'),
      "Vegetarian Dinner at D'life Bistro & Cafe with Yong Zi Ren"
    );
    assert.equal(
      googleUrl.searchParams.get('dates'),
      '20261130T190000/20261130T210000'
    );
    assert.equal(googleUrl.searchParams.get('ctz'), 'Asia/Singapore');
    assert.equal(googleUrl.searchParams.get('location'), restaurant.address);
    const googleDetails = googleUrl.searchParams.get('details') ?? '';
    assert.match(googleDetails, /Guest: Alex Tan/);
    assert.match(googleDetails, /Note: Save room for Crispy Yam Ring!/);
    assert.ok(googleDetails.includes(restaurant.directionsUrl));

    assert.equal(apple.opensInNewTab, false);
    const appleUrl = new URL(apple.href, 'https://dinner.local');
    assert.equal(appleUrl.pathname, '/api/calendar');
    assert.equal(appleUrl.searchParams.get('restaurantId'), 'dlife-bistro-cafe');
    assert.equal(
      appleUrl.searchParams.get('comment'),
      'Save room for Crispy Yam Ring!'
    );
    assert.equal(appleUrl.searchParams.get('guestName'), 'Alex Tan');

    for (const [target, expectedOrigin] of [
      [outlookOffice, 'https://outlook.office.com'],
      [outlookLive, 'https://outlook.live.com'],
    ] as const) {
      assert.equal(target.opensInNewTab, true);
      const url = new URL(target.href);
      assert.equal(url.origin, expectedOrigin);
      assert.equal(url.pathname, '/calendar/0/action/compose');
      assert.equal(url.searchParams.get('path'), '/calendar/action/compose');
      assert.equal(url.searchParams.get('rru'), 'addevent');
      assert.equal(
        url.searchParams.get('startdt'),
        '2026-11-30T19:00:00+08:00'
      );
      assert.equal(url.searchParams.get('enddt'), '2026-11-30T21:00:00+08:00');
      assert.equal(
        url.searchParams.get('subject'),
        "Vegetarian Dinner at D'life Bistro & Cafe with Yong Zi Ren"
      );
      assert.equal(url.searchParams.get('location'), restaurant.address);
      assert.match(url.searchParams.get('body') ?? '', /Guest: Alex Tan/);
    }

    assert.equal(yahoo.opensInNewTab, true);
    const yahooUrl = new URL(yahoo.href);
    assert.equal(yahooUrl.origin, 'https://calendar.yahoo.com');
    assert.equal(yahooUrl.searchParams.get('v'), '60');
    assert.equal(yahooUrl.searchParams.get('st'), '20261130T110000Z');
    assert.equal(yahooUrl.searchParams.get('et'), '20261130T130000Z');
    assert.equal(yahooUrl.searchParams.get('in_loc'), restaurant.address);
    assert.match(
      yahooUrl.searchParams.get('desc') ?? '',
      /Note: Save room for Crispy Yam Ring!/
    );

    const targetsWithoutGuest = buildCalendarTargets({
      restaurant,
      comment: '   ',
    });
    const appleWithoutGuest = new URL(
      targetsWithoutGuest[1].href,
      'https://dinner.local'
    );
    assert.equal(appleWithoutGuest.searchParams.get('guestName'), null);
    assert.equal(appleWithoutGuest.searchParams.get('comment'), '');
  });

  it('serializes RFC 5545 ICS with Asia/Singapore VTIMEZONE, escaping, and <= 75 UTF-8 byte line folding across multi-byte CJK characters', () => {
    const baseRestaurant = findRestaurantById('dlife-bistro-cafe');
    assert.ok(baseRestaurant);

    const cjkRestaurant = {
      ...baseRestaurant,
      name: `${baseRestaurant.name} 蔬食谱`,
    };
    const longMultibyteComment =
      '蔬食谱 celebratory feast; spicy\\mild, ginger-free!\r\nSecond line with CJK 蔬食谱✨ '.repeat(
        10
      );

    const ics = serializeDinnerCalendarIcs(
      {
        restaurant: cjkRestaurant,
        comment: longMultibyteComment,
        guestName: '林明 (Ming); Guest, #1',
      },
      new Date('2026-11-14T14:00:00Z')
    );

    assert.ok(ics.endsWith('\r\n'), 'ICS terminates with CRLF');

    const encoder = new TextEncoder();
    const physicalLines = ics.slice(0, -2).split('\r\n');
    assert.ok(physicalLines.length > 25, 'long lines were folded across lines');

    for (const physicalLine of physicalLines) {
      const byteLength = encoder.encode(physicalLine).byteLength;
      assert.ok(
        byteLength <= 75,
        `physical line "${physicalLine}" exceeds 75 UTF-8 octets (${byteLength})`
      );
      assert.equal(
        physicalLine.includes('\uFFFD'),
        false,
        'no broken surrogate pairs or replacement characters'
      );
    }

    const unfolded = ics.replace(/\r\n /g, '');
    assert.match(unfolded, /BEGIN:VTIMEZONE\r\nTZID:Asia\/Singapore\r\nBEGIN:STANDARD\r\nDTSTART:19820101T000000\r\nTZOFFSETFROM:\+0800\r\nTZOFFSETTO:\+0800\r\nTZNAME:SGT\r\nEND:STANDARD\r\nEND:VTIMEZONE/);
    assert.match(unfolded, /UID:dinner-dlife-bistro-cafe-20261130@dinner-invitation/);
    assert.match(unfolded, /DTSTAMP:20261114T140000Z/);
    assert.match(unfolded, /DTSTART;TZID=Asia\/Singapore:20261130T190000/);
    assert.match(unfolded, /DTEND;TZID=Asia\/Singapore:20261130T210000/);
    assert.match(unfolded, /SUMMARY:Vegetarian Dinner at D'life Bistro & Cafe 蔬食谱 with Yong Zi Ren/);
    assert.ok(
      unfolded.includes('Guest: 林明 (Ming)\\; Guest\\, #1'),
      'escapes semicolons and commas in guestName'
    );
    assert.ok(
      unfolded.includes('spicy\\\\mild\\, ginger-free!\\nSecond line with CJK 蔬食谱✨'),
      'escapes backslashes, semicolons, commas, and CRLF newlines'
    );
    assert.match(unfolded, /STATUS:CONFIRMED/);
  });

  it('serves valid text/calendar ICS from GET /api/calendar and falls back cleanly on unknown restaurantId', async () => {
    const validReq = new Request(
      'https://dinner.local/api/calendar?restaurantId=herbivore-fortune-centre&comment=Love%20udon!&guestName=Jamie'
    );
    const validRes = await getCalendarIcs(validReq);
    assert.equal(validRes.status, 200);
    assert.equal(
      validRes.headers.get('content-type'),
      'text/calendar; charset=utf-8'
    );
    assert.equal(
      validRes.headers.get('content-disposition'),
      'inline; filename="dinner-herbivore-fortune-centre.ics"'
    );
    assert.equal(validRes.headers.get('cache-control'), 'no-store');

    const validBody = (await validRes.text()).replace(/\r\n /g, '');
    assert.match(validBody, /SUMMARY:Vegetarian Dinner at Herbivore with Yong Zi Ren/);
    assert.match(validBody, /Guest: Jamie/);
    assert.match(validBody, /Note: Love udon!/);
    assert.match(validBody, /DTSTART;TZID=Asia\/Singapore:20261130T190000/);

    const fallbackReq = new Request(
      'https://dinner.local/api/calendar?restaurantId=non-existent-id'
    );
    const fallbackRes = await getCalendarIcs(fallbackReq);
    assert.equal(fallbackRes.status, 200);
    assert.equal(
      fallbackRes.headers.get('content-disposition'),
      `inline; filename="dinner-${RESTAURANTS[0].id}.ics"`
    );
    const fallbackBody = (await fallbackRes.text()).replace(/\r\n /g, '');
    assert.ok(fallbackBody.includes(RESTAURANTS[0].name));
  });
});

describe('Mini companion state machine', () => {
  const desktop: CompanionViewport = { width: 1440, height: 900 };
  const mobile: CompanionViewport = { width: 375, height: 667 };
  const fixedRandom = () => 0.5;

  function runTicks(
    state: CompanionState,
    viewport: CompanionViewport,
    totalMs: number,
    until?: (s: CompanionState) => boolean
  ): CompanionState {
    let current = state;
    for (let elapsed = 0; elapsed < totalMs; elapsed += 16) {
      current = stepCompanionTick(current, 16, viewport, fixedRandom);
      if (until?.(current)) {
        return current;
      }
    }
    return current;
  }

  it('starts anxious and on the floor for steps 1 to 3, inside the viewport', () => {
    for (const step of ['region', 'restaurant', 'comment'] as const) {
      const state = createInitialCompanionState(step, mobile);
      assert.equal(state.phase.kind, 'roaming-anxious');
      assert.equal(state.y, computeFloorY(mobile));
      assert.ok(state.x >= 8 && state.x <= mobile.width - MINI_WIDTH - 8);
      assert.equal(deriveMiniExpression(state.phase), 'anxious-walk');
    }
  });

  it('maps every phase to its expression', () => {
    assert.equal(
      deriveMiniExpression({ kind: 'roaming-anxious', action: 'peeking', remainingMs: 1, targetX: 0 }),
      'anxious-peek'
    );
    assert.equal(
      deriveMiniExpression({ kind: 'roaming-anxious', action: 'checking-watch', remainingMs: 1, targetX: 0 }),
      'anxious-peek'
    );
    assert.equal(
      deriveMiniExpression({ kind: 'roaming-anxious', action: 'fidgeting', remainingMs: 1, targetX: 0 }),
      'anxious-fidget'
    );
    assert.equal(deriveMiniExpression({ kind: 'dragging', offsetX: 0, offsetY: 0, vx: 0 }), 'surprised-drag');
    assert.equal(deriveMiniExpression({ kind: 'falling', vx: 0, vy: 0 }), 'bracing-fall');
    assert.equal(deriveMiniExpression({ kind: 'landed', remainingMs: 100 }), 'dizzy-land');
    assert.equal(deriveMiniExpression({ kind: 'walking-to-table', seatX: 10 }), 'happy-walk');
    assert.equal(deriveMiniExpression({ kind: 'seated-eating', seatX: 10, biteTick: 0 }), 'casual-eating');
  });

  it('clamps positions to the viewport and describes horizontal zones', () => {
    assert.deepEqual(clampCompanionPosition(-50, -50, mobile), { x: 8, y: 8 });
    assert.deepEqual(clampCompanionPosition(9999, 9999, mobile), {
      x: mobile.width - MINI_WIDTH - 8,
      y: computeFloorY(mobile),
    });
    assert.equal(describeHorizontalZone(10, 1000), 'left side');
    assert.equal(describeHorizontalZone(460, 1000), 'center');
    assert.equal(describeHorizontalZone(900, 1000), 'right side');
    assert.equal(describeHorizontalZone(10, 0), 'center');
  });

  it('stops to fidget nervously after pacing', () => {
    let state = createInitialCompanionState('comment', desktop);
    for (let i = 0; i < 2000 && state.phase.kind === 'roaming-anxious' && state.phase.action === 'pacing'; i++) {
      state = stepCompanionTick(state, 16, desktop, () => 0.7);
    }
    assert.equal(state.phase.kind, 'roaming-anxious');
    assert.equal(state.phase.kind === 'roaming-anxious' && state.phase.action, 'fidgeting');
    assert.equal(deriveMiniExpression(state.phase), 'anxious-fidget');
  });

  it('walks around by default', () => {
    const start = createInitialCompanionState('region', desktop);
    assert.equal(start.paused, false);
    const moved = runTicks(start, desktop, 500);
    assert.notEqual(moved.x, start.x, 'paces along the floor');
    assert.equal(moved.y, computeFloorY(desktop));
  });

  it('stands on a raised floor such as the top of a footer', () => {
    const withFooter: CompanionViewport = { ...desktop, floor: 796 };
    assert.equal(computeFloorY(withFooter), 796 - MINI_HEIGHT);
    const start = createInitialCompanionState('region', withFooter);
    assert.equal(start.y + MINI_HEIGHT, 796);
    assert.equal(clampCompanionPosition(100, 9999, withFooter).y, 796 - MINI_HEIGHT);
  });

  it('falls when the floor drops away and steps up when it rises', () => {
    const onFooter = createInitialCompanionState('region', { ...desktop, floor: 700 });
    const dropped = settleOnNewFloor(onFooter, desktop);
    assert.equal(dropped.phase.kind, 'falling');
    const landed = runTicks(dropped, desktop, 3000, (s) => s.phase.kind === 'landed');
    assert.equal(landed.y, computeFloorY(desktop));

    const onBottom = createInitialCompanionState('region', desktop);
    const raised = settleOnNewFloor(onBottom, { ...desktop, floor: 700 });
    assert.equal(raised.y, 700 - MINI_HEIGHT);
    assert.equal(raised.phase.kind, 'roaming-anxious');

    const held = startCompanionDrag(onBottom, 0, 0);
    assert.equal(settleOnNewFloor(held, { ...desktop, floor: 700 }), held);
  });

  it('ignores zero-length ticks and caps long frame gaps at 64ms', () => {
    const start = createInitialCompanionState('region', desktop);
    assert.equal(stepCompanionTick(start, 0, desktop), start);
    const afterLongGap = stepCompanionTick(start, 5000, desktop, fixedRandom);
    assert.ok(Math.abs(afterLongGap.x - start.x) <= 64 * 0.064 + 0.001);
  });

  it('drags with a clamped position, falls under gravity, lands, and resumes anxious roaming', () => {
    const start = createInitialCompanionState('restaurant', desktop);
    const grabbed = startCompanionDrag(start, 30, 40);
    assert.equal(grabbed.phase.kind, 'dragging');

    const held = moveCompanionDrag(grabbed, 700, 300, 16, desktop);
    assert.equal(held.x, 670);
    assert.equal(held.y, 260);
    assert.equal(held.facing, 'right');
    assert.equal(deriveMiniExpression(held.phase), 'surprised-drag');

    const clampedHeld = moveCompanionDrag(held, -500, -500, 16, desktop);
    assert.equal(clampedHeld.x, 8);
    assert.equal(clampedHeld.y, 8);
    assert.equal(clampedHeld.facing, 'left');

    const dropped = endCompanionDrag(held, desktop);
    assert.equal(dropped.phase.kind, 'falling');

    const landed = runTicks(dropped, desktop, 3000, (s) => s.phase.kind === 'landed');
    assert.equal(landed.phase.kind, 'landed');
    assert.equal(landed.y, computeFloorY(desktop));

    const recovered = runTicks(landed, desktop, 1000, (s) => s.phase.kind !== 'landed');
    assert.equal(recovered.phase.kind, 'roaming-anxious');
  });

  it('drops straight into a landing when released on the floor', () => {
    const start = createInitialCompanionState('comment', mobile);
    const grabbed = startCompanionDrag(start, 0, 0);
    const dropped = endCompanionDrag(grabbed, mobile);
    assert.equal(dropped.phase.kind, 'landed');
    assert.equal(dropped.y, computeFloorY(mobile));
  });

  it('moves 15px per arrow key while held, then falls when released', () => {
    const start = createInitialCompanionState('region', desktop);
    const right = nudgeCompanion(start, KEYBOARD_STEP_PX, 0, desktop);
    assert.equal(right.phase.kind, 'dragging');
    assert.equal(right.x, start.x + KEYBOARD_STEP_PX);
    assert.equal(right.facing, 'right');

    const up = nudgeCompanion(right, 0, -KEYBOARD_STEP_PX, desktop);
    assert.equal(up.y, computeFloorY(desktop) - KEYBOARD_STEP_PX);
    assert.equal(endCompanionDrag(up, desktop).phase.kind, 'falling');

    const pinned = nudgeCompanion(start, -9999, 9999, desktop);
    assert.equal(pinned.x, 8);
    assert.equal(pinned.y, computeFloorY(desktop));
  });

  it('lays out the step 4 table inside the viewport on mobile and desktop', () => {
    for (const viewport of [mobile, { width: 768, height: 1024 }, desktop]) {
      const { tableLeft, tableWidth, seatX } = computeTableLayout(viewport);
      assert.ok(tableLeft + tableWidth <= viewport.width, 'table fits horizontally');
      assert.ok(seatX >= 8 && seatX + MINI_WIDTH <= viewport.width - 8, 'seat is on screen');
    }
    assert.equal(computeTableLayout(mobile).tableWidth, 220);
    assert.equal(computeTableLayout(desktop).tableWidth, 280);
  });

  it('walks to the table on step 4, sits down, and walks back after being dragged away', () => {
    const roaming = createInitialCompanionState('comment', desktop);
    const toTable = syncCompanionStep(roaming, 'thank-you', desktop);
    assert.equal(toTable.phase.kind, 'walking-to-table');
    assert.equal(toTable.x, 8);
    assert.equal(toTable.facing, 'right');
    assert.equal(deriveMiniExpression(toTable.phase), 'happy-walk');

    const { seatX } = computeTableLayout(desktop);
    const seated = runTicks(toTable, desktop, 20000, (s) => s.phase.kind === 'seated-eating');
    assert.equal(seated.phase.kind, 'seated-eating');
    assert.equal(seated.x, seatX);
    assert.equal(seated.facing, 'right');

    const grabbed = startCompanionDrag(seated, 20, 20);
    const carried = moveCompanionDrag(grabbed, 220, 200, 16, desktop);
    const dropped = endCompanionDrag(carried, desktop);
    assert.equal(dropped.phase.kind, 'falling');

    const walkingBack = runTicks(dropped, desktop, 4000, (s) => s.phase.kind === 'walking-to-table');
    assert.equal(walkingBack.phase.kind, 'walking-to-table');

    const reseated = runTicks(walkingBack, desktop, 20000, (s) => s.phase.kind === 'seated-eating');
    assert.equal(reseated.phase.kind, 'seated-eating');
    assert.equal(reseated.x, seatX);
  });

  it('keeps the step while dragging and heads to the table once dropped', () => {
    const grabbed = startCompanionDrag(createInitialCompanionState('comment', mobile), 0, 0);
    const synced = syncCompanionStep(grabbed, 'thank-you', mobile);
    assert.equal(synced.phase.kind, 'dragging');
    assert.equal(synced.step, 'thank-you');
    const dropped = endCompanionDrag(synced, mobile);
    const next = runTicks(dropped, mobile, 1000, (s) => s.phase.kind !== 'landed');
    assert.equal(next.phase.kind, 'walking-to-table');
  });

});

