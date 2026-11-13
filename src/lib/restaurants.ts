export type RegionId = 'north' | 'south' | 'east' | 'west' | 'central';

export type RestaurantId = string & { readonly __brand: 'RestaurantId' };

export function asRestaurantId(id: string): RestaurantId {
  return id as RestaurantId;
}

export interface RegionMeta {
  readonly id: RegionId;
  readonly name: string;
  readonly subtitle: string;
  readonly tagline: string;
  readonly mapCoordinates: { readonly x: number; readonly y: number };
  readonly badgeColor: string;
  readonly mrtHubs: readonly [string, ...string[]];
}

export interface RestaurantReview {
  readonly author: string;
  readonly rating: number;
  readonly text: string;
  readonly timeAgo: string;
}

export interface RestaurantPhoto {
  readonly url: string;
  readonly caption: string;
  readonly rating?: string;
}

export interface Restaurant {
  readonly id: RestaurantId;
  readonly region: RegionId;
  readonly name: string;
  readonly chineseName?: string;
  readonly ziRenWantsToTry?: boolean;
  readonly areaName: string;
  readonly googleCategory: string;
  readonly openStatusText: string;
  readonly popularTimesPeak: string;
  readonly coordinates: { readonly lat: number; readonly lng: number };
  readonly cuisine: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly priceRange: string;
  readonly address: string;
  readonly postalCode: string;
  readonly hours: string;
  readonly serviceTag: string;
  readonly phone: string;
  readonly websiteUrl: string;
  readonly directionsUrl: string;
  readonly mapEmbedUrl: string;
  readonly description: string;
  readonly vibe: string;
  readonly highlights: readonly [string, ...string[]];
  readonly reviews: readonly [RestaurantReview, ...RestaurantReview[]];
  readonly photos: readonly [RestaurantPhoto, ...RestaurantPhoto[]];
}

export const REGION_ORDER: readonly RegionId[] = [
  'west',
  'central',
  'east',
  'north',
  'south',
] as const;

export const REGIONS: Readonly<Record<RegionId, RegionMeta>> = {
  west: {
    id: 'west',
    name: 'West Singapore',
    subtitle: 'NUS (Kent Ridge) · Holland Village · Beauty World · Jurong',
    tagline: 'Near NUS · Mediterranean courtyard mezze, homestyle Nanyang classics, and relaxed evening dining.',
    mapCoordinates: { x: 225, y: 245 },
    badgeColor: '#f43f5e',
    mrtHubs: ['Kent Ridge MRT', 'Holland Village MRT', 'Beauty World MRT'],
  },
  central: {
    id: 'central',
    name: 'Central Heartlands & City',
    subtitle: 'Tanjong Pagar · Orchard · Bugis',
    tagline: 'Michelin Bib Gourmand Peranakan plates, artisanal cafes, and city lights.',
    mapCoordinates: { x: 435, y: 270 },
    badgeColor: '#ec4899',
    mrtHubs: ['Tanjong Pagar MRT', 'Somerset MRT', 'Bencoolen MRT'],
  },
  east: {
    id: 'east',
    name: 'East Coast & Paya Lebar',
    subtitle: 'Eunos · Paya Lebar · Tampines',
    tagline: 'Breezy East-side charm, 8-course modern vegetarian dining, and iconic plant burgers.',
    mapCoordinates: { x: 615, y: 235 },
    badgeColor: '#d946ef',
    mrtHubs: ['Eunos MRT', 'Paya Lebar MRT', 'Tampines West MRT'],
  },
  north: {
    id: 'north',
    name: 'North Woodlands & Yishun',
    subtitle: 'Yishun Pond · Northpoint · Khatib',
    tagline: 'Lakeside lookout dining, comforting herbal broths, and heritage spice kitchens.',
    mapCoordinates: { x: 430, y: 125 },
    badgeColor: '#8b5cf6',
    mrtHubs: ['Yishun MRT', 'Khatib MRT', 'Woodlands MRT'],
  },
  south: {
    id: 'south',
    name: 'Southern Ridges & Holland',
    subtitle: 'Holland Village · Orchard South · Somerset',
    tagline: 'Courtyard Mediterranean mezze, fine Chinese dim sum, and fragrant pho bowls.',
    mapCoordinates: { x: 365, y: 345 },
    badgeColor: '#e11d48',
    mrtHubs: ['Holland Village MRT', 'Orchard MRT', 'Somerset MRT'],
  },
};

function createGoogleMapEmbed(
  placeQuery: string,
  coordinates: { readonly lat: number; readonly lng: number }
): string {
  const cleanQuery = placeQuery.replace(/#[0-9A-Za-z/-]+\s*,?\s*/g, '');
  return `https://www.google.com/maps?q=${encodeURIComponent(cleanQuery)}&ll=${coordinates.lat},${coordinates.lng}&z=16&hl=en&output=embed`;
}

function createGoogleMapDirections(name: string, address: string): string {
  const cleanAddress = address.replace(/#[0-9A-Za-z/-]+\s*,?\s*/g, '');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${name}, ${cleanAddress}`)}`;
}

export const RESTAURANTS: readonly Restaurant[] = [
  // ======================== WEST ========================
  {
    id: asRestaurantId('dlife-bistro-cafe'),
    region: 'west',
    name: "D'life Bistro & Cafe",
    chineseName: '蔬食谱',
    areaName: 'Beauty World · Bukit Timah',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 10 am',
    popularTimesPeak: 'Peak 6 pm – 8 pm',
    coordinates: { lat: 1.3419831, lng: 103.775284 },
    cuisine: 'Nanyang & Western Bistro',
    rating: 4.3,
    reviewCount: 594,
    priceRange: '$10–20',
    address: '6 Chun Tin Rd, Singapore 599593',
    postalCode: '599593',
    hours: 'Daily 10:00 am – 9:30 pm',
    serviceTag: 'Serves vegan dishes · Cozy shophouse dining',
    phone: '+65 6909 2407',
    websiteUrl: 'https://order.dlife.com.sg',
    directionsUrl: createGoogleMapDirections("D'life", '6 Chun Tin Rd, Singapore 599593'),
    mapEmbedUrl: createGoogleMapEmbed("D'life, 6 Chun Tin Rd, Singapore 599593", {
      lat: 1.3419831,
      lng: 103.775284,
    }),
    description:
      'Beloved Beauty World vegetarian bistro along Chun Tin Road serving homestyle Nanyang zi char, golden Crispy Yam Ring, aromatic Rendang Curry, and Western comfort plates.',
    vibe: 'Warm, relaxed Beauty World shophouse charm',
    highlights: [
      'Crispy Yam Ring with Kung Pao Soy Nuggets & Cashews',
      'Signature Lion Mane (Monkey Head) Mushroom Truffle Rice',
      'Nanyang Assam Curry & Fragrant Rendang Lion Mane',
      'Baked Cheesy Shepherd Pie & Artisanal Fruit Teas',
    ],
    reviews: [
      {
        author: 'L Eva',
        rating: 5,
        text: 'Our go-to spot in Beauty World! The Crispy Yam Ring is light and flaky, and the monkey head mushroom dishes have incredible wok hei.',
        timeAgo: '2 weeks ago',
      },
      {
        author: 'Marcus L.',
        rating: 4,
        text: 'Super extensive menu combining local Nanyang zi char with Western pasta and bistro bites. Portions are generous and prices are very gentle.',
        timeAgo: '1 month ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdnFZUVC8p4B1FXd_yd_GrFhdnFR4IPzNJkCtffXIu2fmeckrgZwHF50O9Yprf2M4-W1MexpLxyv_Umh-K5ZOv6xqkNVlm2cn6oD77gpKE7owYt7Vsj5w_NRBTE53mwsfxUKd2VbVYrwiJl=w720-h540-k-no',
        caption: "D'life Nanyang Bistro Signatures",
        rating: '4.3 ★ (594)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfdcdsZQtT9Q2jS9fH13MN7P0FQeeItbq6kk9mzBLBSEBuDk8eXBjReV0jKEqxIlf8if48vmYPMl0f7Bxdm6He9O-HZFFe4yt2-_ihO7HG6klteOJDdyhHukZ-rBFXMYJ971xmdhJhmLSs=w720-h540-k-no',
        caption: 'Golden Yam Ring & Wok Classics',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLde_obNHaXAm_aL0bDLG7rKruFPsmqvOVGEVsUvTjX87EVEcfZMFvKzd__2HCRWj8ZbXz-3HC84ICn3BkFPq2Aaa5YxnVqIueDMtFXdY607q9RZEj3QSW-aXKhMtZWCKYGb2aiiS1ados--=w720-h540-k-no',
        caption: 'Chun Tin Road Shophouse Plates',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcdrDZOiSsMPGbXRi0XanJ8_tr8p8RIgXNga8mBpmH6nRdvoVEoI1E5dzx8qgKrw4KHTo3_yWD6Q96URnlBeZMcH01VU9ZOU3nAfyQHrpioMeVNhQdECIEOyY0wIqA5ApNT_cNVpTlD5Ipr=w720-h540-k-no',
        caption: 'Homestyle Vegetarian Comfort Feast',
      },
    ],
  },
  {
    id: asRestaurantId('original-sin-holland-village'),
    region: 'west',
    name: 'Original Sin',
    chineseName: '原味地中海',
    ziRenWantsToTry: true,
    areaName: 'Holland Village · Chip Bee',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11:30 am',
    popularTimesPeak: 'Peak 7 pm – 9 pm',
    coordinates: { lat: 1.3107755, lng: 103.7964544 },
    cuisine: 'Mediterranean & Italian Mezze',
    rating: 4.3,
    reviewCount: 1231,
    priceRange: '$30–50',
    address: 'Blk 43 Jln Merah Saga, #01-62 Chip Bee Gardens, Singapore 278115',
    postalCode: '278115',
    hours: 'Daily 11:30 am – 2:30 pm, 6:00 pm – 10:30 pm',
    serviceTag: 'Chip Bee Gardens courtyard · Iconic since 1997',
    phone: '+65 6475 5605',
    websiteUrl: 'https://www.originalsin.sg',
    directionsUrl: createGoogleMapDirections(
      'Original Sin',
      '43 Jln Merah Saga, Chip Bee Gardens, Singapore 278115'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Original Sin, 43 Jln Merah Saga, Chip Bee Gardens, Singapore 278115',
      { lat: 1.3107755, lng: 103.7964544 }
    ),
    description:
      'Established in 1997 in leafy Chip Bee Gardens right near NUS, Original Sin is Singapore’s premier Mediterranean & Italian vegetarian restaurant—complete with al-fresco courtyard dining, baked feta, and wood-fired pizzas.',
    vibe: 'Warm Mediterranean courtyard in Chip Bee Gardens',
    highlights: [
      'Bosco Misto — Spinach, Feta & Mushroom Filo Parcel with Chili Jam',
      'Mezze Platter — Hummus, Baba Ganoush, Falafel & Warm Pita',
      'Magic Mushroom Wood-Fired Pizza with Truffle Oil & Mozzarella',
      'Spanakopita & Warm Baklava with Vanilla Bean Gelato',
    ],
    reviews: [
      {
        author: 'Genevieve L.',
        rating: 5,
        text: 'Hands down one of the best vegetarian dinner spots in Singapore. Sitting under the lights at Chip Bee Gardens with Bosco Misto is perfection.',
        timeAgo: '4 days ago',
      },
      {
        author: 'Lucas R.',
        rating: 5,
        text: 'Even my non-vegetarian friends rave about Original Sin. The Mediterranean mezze platter and truffle pizza are world-class.',
        timeAgo: '2 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeCxfZ4NPXKYEWklawjezk73G3pfnHpgMqJBuqLldGTBOmClJ9u73cBehVm-TVfRuOiPIWE_Ofw4Mh59rGCjAJAF3yt7d1GsoQ4B7OYbAeJncn2d9UYQLvn08Ib-M9tk7IyOd6MEOYi95wu=w720-h540-k-no',
        caption: 'Mediterranean Mezze & Bosco Misto',
        rating: '4.3 ★ (1,231)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeOqZwaOV2bPe-APaAT2S5D6oykCxh6kLOS9qknYusjt5Xeebu2TYdiQg0jt0Syll4FrutS09AupfWUfbH9P7lF0O7oAu6gXGNmSgRZxLxV2VZ2Cd1WjunFLUV9mfnAhasOQgSuRKvXkOPi=w720-h540-k-no',
        caption: 'Wood-Fired Magic Mushroom Pizza',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfAbxEA5NjXTJcXx9ZYPnZ6T9fm6n3Nl-6nlxEtOTDiZ3q6i5aHov12swvqAODYP9wZLK7BXkYcDaux7uWWQdOLQ9iv72Wm3VsoFMI7qFIF8u1nIprQ7vf-LCE1cyqVgCuBV4LSdPd08P76=w720-h540-k-no',
        caption: 'Baked Feta, Falafel & Italian Pastas',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcFoa7ul3VogcQ0wCc8xI5VnfgvzA-7XFvGiExk88CS7-MpBZgVBNVgid6xKQL7_Mat86QBbvR5-aWs-MEZTP2mY1LNLgfSngdbOz57S7EjANMDk65IFr-cb5qFqHn2yI1g7HZwKs7tun9x=w720-h540-k-no',
        caption: 'Chip Bee Gardens Courtyard Patio',
      },
    ],
  },
  {
    id: asRestaurantId('saute-san-jurong'),
    region: 'west',
    name: 'Saute-san Jurong Point',
    chineseName: '炒三蔬食',
    areaName: 'Jurong West · Boon Lay',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.3404689, lng: 103.7064679 },
    cuisine: 'Japanese Plant-Based Ramen & Bento',
    rating: 4.4,
    reviewCount: 435,
    priceRange: '$15–25',
    address: '1 Jurong West Central 2, #01-43/44/45 Jurong Point, Singapore 648886',
    postalCode: '648886',
    hours: 'Daily 11:00 am – 9:30 pm',
    serviceTag: 'Serves vegan & allium-free dishes · Jurong Point',
    phone: '+65 6970 0479',
    websiteUrl: 'https://www.sautegroup.com',
    directionsUrl: createGoogleMapDirections(
      'Greendot Jurong Point',
      '1 Jurong West Central 2, Jurong Point, Singapore 648886'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Greendot Jurong Point, 1 Jurong West Central 2, Singapore 648886',
      { lat: 1.3404689, lng: 103.7064679 }
    ),
    description:
      'Earth-friendly plant-based kitchen at Jurong Point crafting slow-simmered soy milk ramen, sizzling stone pot donburi, and nourishing Lion Mane mushroom bento bowls.',
    vibe: 'Modern wood-accented dining at Jurong Point',
    highlights: [
      'Truffle Orzo & Creamy Tonyu Ramen Bowl',
      'Volcano Spicy Miso Ramen with Aburi Lion Mane',
      'Crispy Enoki & Avocado Maki Rolls',
      'Stone Pot Truffle Mushroom Claypot Rice',
    ],
    reviews: [
      {
        author: 'siang hang lim',
        rating: 5,
        text: 'The broth is rich and velvety! You would never guess it is 100% plant-based and allium-free. Great dinner spot at Jurong Point.',
        timeAgo: '1 week ago',
      },
      {
        author: 'Derrick W.',
        rating: 5,
        text: 'Wonderful dinner spot in the West. Great plating, attentive staff, and generous mushroom portions.',
        timeAgo: '3 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLctb9O3LHRyczOz66rIM5S2G13PelK7EocotE2DaM1lPJebi-cdFFtdwfKUZ5UEUWZsVkrigGMP3_PW_EWgmd4lkHsK_AbaAZLPDiIIfZg5YAVLpD2EIyln9eeH1P2mf5onK_bdoBvB-d8=w720-h540-k-no',
        caption: 'Plant-Based Ramen & Nourishing Bowls',
        rating: '4.4 ★ (435)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLe20Co03cOe1fXu1mfQV9DqhJpnoQ2jfljUhTyQPPQdgeBpKpHZjNiIZ4c2aEH8SE1Mwdn0CtMJTzTUB4zuV1LxEB02eXJbhqyYEAo_6xShTf2YSTJNe5hzUJiQ575DA1PkTJ-RTCleHHPb=w720-h540-k-no',
        caption: 'Signature Lion Mane & Grain Sets',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfTAN4uNpvPK3kBA4J5fAsBvII9vPQvjvihP3tXYg9rEndf2usqLnUYgnkBryFaXmWNE-VcweJju2OgY0j_MQYdbvM-mjh9-kDqCRQlEu1hg2S3VFbEpoDHHabeILcJ99W5YqZOLybLpo4H=w720-h540-k-no',
        caption: 'Warm Herbal & Miso Broths',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLd4h9wYfr6jIgDyoMQPAggajg_jXZp129lZZPuSUrZwqaVqO_jqiXKW2LymnbYCRZyc0_5yYUwU9K4L5dhMDeIPnaFhddD2Y2dF1W5gluD9p5lJDLBcxcQl-rzvQ18JrHNrY042lTGYYkk=w720-h540-k-no',
        caption: 'Jurong Point Vegetarian Kitchen',
      },
    ],
  },

  // ======================== CENTRAL ========================
  {
    id: asRestaurantId('whole-earth-tanjong-pagar'),
    region: 'central',
    name: 'Whole Earth',
    chineseName: '大地',
    areaName: 'Tanjong Pagar · Peck Seah',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11:30 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.277244, lng: 103.8447081 },
    cuisine: 'Michelin Bib Gourmand Peranakan-Thai',
    rating: 4.4,
    reviewCount: 1486,
    priceRange: '$25–40',
    address: '76 Peck Seah St, Singapore 079331',
    postalCode: '079331',
    hours: 'Daily 11:30 am – 3:00 pm, 5:30 pm – 10:00 pm',
    serviceTag: 'Michelin Bib Gourmand · Serves vegan dishes',
    phone: '+65 6221 6583',
    websiteUrl: 'https://www.wholeearth.com.sg',
    directionsUrl: createGoogleMapDirections('Whole Earth', '76 Peck Seah St, Singapore 079331'),
    mapEmbedUrl: createGoogleMapEmbed('Whole Earth, 76 Peck Seah St, Singapore 079331', {
      lat: 1.277244,
      lng: 103.8447081,
    }),
    description:
      'Singapore’s first and only plant-based restaurant awarded the Michelin Bib Gourmand multiple years running, elevating Peranakan and Thai heritage recipes with fresh herbs and shiitake.',
    vibe: 'Refined, warm heritage dining in Tanjong Pagar',
    highlights: [
      'Penang Rendang — Shiitake Mushrooms in Rich Nyonya Spices',
      'Enchanted Forest — Broccoli & Monkey Head Mushroom in Angelica Sauce',
      'Signature Olive Rice with Thai Cashews & Green Chili',
      'Golden Oat Tofu with Fragrant Curry Leaves',
    ],
    reviews: [
      {
        author: 'Aarti Nair',
        rating: 5,
        text: 'Truly deserving of the Michelin Bib Gourmand. The Penang Rendang paired with Olive Rice is unforgettable for a celebratory dinner.',
        timeAgo: '1 week ago',
      },
      {
        author: 'jonathan_c',
        rating: 5,
        text: 'Warm lighting, attentive service right next to Tanjong Pagar MRT, and every dish bursts with authentic Peranakan spice.',
        timeAgo: '2 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfvJYwEZ22HCwKi1qcOZxwM0b2VWJkcymtnGoKU8H6jwYly7bFM2qQOylOedOGUfifcMyF5Laa_7S-j0Uj0O3b6Xyo6HJmZ-Sw5gPcCwu9SfIN9gyj7Y55Wyc8EJemGm7zjUEE3ROLkL0s=w720-h540-k-no',
        caption: 'Michelin Bib Gourmand Penang Rendang',
        rating: '4.4 ★ (1,486)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcPjMbLMuDiv7fVmhpfqHEGd-Pk6mbY9ZmFGhFArorZ74fO4sQmSaLiCrpALClZuOrduPucqbY2luxxmc5IdO5swn5juUrQ5yNB5akGd-9y4jJ7Pw30lyPH1Fk6P0Zme4pR50TsuaeV159p=w720-h540-k-no',
        caption: 'Signature Wok-Tossed Olive Rice',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeJzG5CwdYIDYE82HeKEc_MgO9g1KPveUxMVSG4NuNOZfLxHTWDTgFcrStlU76Hs7rB3UosC1oaPZ7bqRC5d0bMRCsdRRI7u6F2va_8dLQgShoHghijq9BBBw8pOGMHLhV-amWueQZnef0=w720-h540-k-no',
        caption: 'Enchanted Forest & Nyonya Classics',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLffjxsJDn2uTAHx15riXzcykg9hz0ZYAx-5bz-kBZmREqVz43BKedUUjeNOm5tyRo6N5IaOIQCSsyG_PZnzsYqDYnG9tusA-4nGrmOru4hTvQrcEbq6xVwnsg_3UEbjMXvyNnVjTidos3se=w720-h540-k-no',
        caption: 'Peck Seah Street Heritage Dining',
      },
    ],
  },
  {
    id: asRestaurantId('real-food-orchard-central'),
    region: 'central',
    name: 'Real Food Orchard',
    chineseName: '真食',
    areaName: 'Orchard · Somerset',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11 am',
    popularTimesPeak: 'Peak 6 pm – 8 pm',
    coordinates: { lat: 1.3005153, lng: 103.8403289 },
    cuisine: 'Artisanal Cafe & Organic Sourdough Pasta',
    rating: 4.1,
    reviewCount: 1368,
    priceRange: '$15–30',
    address: '181 Orchard Rd, #02-16 to 19 Orchard Central, Singapore 238896',
    postalCode: '238896',
    hours: 'Daily 11:00 am – 9:30 pm',
    serviceTag: 'Zero processed ingredients · Organic vegetarian cafe',
    phone: '+65 9138 0141',
    websiteUrl: 'https://www.realfoodgrocer.com',
    directionsUrl: createGoogleMapDirections(
      'Real Food Orchard Central',
      '181 Orchard Rd, Orchard Central, Singapore 238896'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Real Food, 181 Orchard Rd, Orchard Central, Singapore 238896',
      { lat: 1.3005153, lng: 103.8403289 }
    ),
    description:
      'Sunlit book-lined sanctuary overlooking Orchard Road serving slow-cooked organic pastas, handmade steamed dumpling soup, and stone-baked sourdough pizzas free from artificial preservatives.',
    vibe: 'Cozy indie bookstore-cafe overlooking Orchard',
    highlights: [
      'Handmade Organic Dumpling Soup (10-Hour Vegetable Broth)',
      'Pesto Genovese Pasta with Roasted Pine Nuts & Cherry Tomatoes',
      'Avocado & Beetroot Millet Burger with Hand-Cut Wedges',
      'Warm Banana Walnut Cake & Organic Oat Latte',
    ],
    reviews: [
      {
        author: 'NATTHA PODOK',
        rating: 5,
        text: 'Such a peaceful oasis right in the middle of Somerset/Orchard. Love the plush sofas, books, and wholesome handmade pastas.',
        timeAgo: '3 weeks ago',
      },
      {
        author: 'Liam H.',
        rating: 4,
        text: 'Their dumpling soup and sourdough pizzas feel so clean and nourishing. Perfect for a long, unhurried dinner conversation.',
        timeAgo: '1 month ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdDstYau1HumLtzahr2EA0Uc-9xwvrHPl93HRLbK6Ke5CkKh5zMYPdyXZ2l6xfB6NYMzdiV4lmutlUM45yeyc6LLjMGItgb-ECubB_REjDq2inmgwYhudZaHSf-M795zWC8UrraGz3edHjZ=w720-h540-k-no',
        caption: 'Artisanal Organic Cafe Plates',
        rating: '4.1 ★ (1,368)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcSPIKdS4esTgXCs7piVOqOpdJayvzMFGlQq0tx8C3lFOvczX6tnglhFOrWrbFp7cU81XjWKWirHc3bwbqdRQMfdoDCzeoTyBk_0VvtXKdUVnyPA-xWbpDumc5WCAUCeubEH-846w=w720-h540-k-no',
        caption: 'Handcrafted Sourdough & Dumpling Soup',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLewEgHW6wKkT7_oGGDkF6qd_06i_XU9WNEVNP-OepGL4Q-Kp0R4uEsRCFK-SSc242iuYCBV5mmHczJR2BVlvKa4sj64kzGS-eRq4Jc7cwgqMyHv1wUqSn-fSHBx8u_iAGKPG2j8XLkVP3CB=w720-h540-k-no',
        caption: 'Fresh Pesto Pasta & All-Day Brunch',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeFHux-iG7V3zB1tJ6i8hpJI7Obyq8_1MKRGNLHEknOiUNqyePfc4RLgX0mo47qwT_sDfcvtvbMCVKg4HBw4jcgCPlZMDF_iwp2LiII5doDqZZ69ze850H6Z7fYeWTFjBVp0YtWpenyDCLk=w720-h540-k-no',
        caption: 'Warm Book-Lined Orchard Central Sanctuary',
      },
    ],
  },
  {
    id: asRestaurantId('herbivore-fortune-centre'),
    region: 'central',
    name: 'Herbivore',
    chineseName: '草食',
    areaName: 'Bugis · Middle Road',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11:30 am',
    popularTimesPeak: 'Peak 6 pm – 8 pm',
    coordinates: { lat: 1.3007314, lng: 103.8519827 },
    cuisine: 'Japanese Zen Bento & Udon',
    rating: 4.4,
    reviewCount: 1373,
    priceRange: '$15–25',
    address: '190 Middle Rd, #01-13/14 Fortune Centre, Singapore 188979',
    postalCode: '188979',
    hours: 'Daily 11:30 am – 3:00 pm, 5:00 pm – 9:00 pm',
    serviceTag: 'Serves vegan & Buddhist-friendly Japanese dishes',
    phone: '+65 6333 1612',
    websiteUrl: 'https://www.herbivore.sg',
    directionsUrl: createGoogleMapDirections(
      'Herbivore',
      '190 Middle Rd, Fortune Centre, Singapore 188979'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Herbivore, 190 Middle Rd, Fortune Centre, Singapore 188979',
      { lat: 1.3007314, lng: 103.8519827 }
    ),
    description:
      'Iconic Fortune Centre Japanese vegetarian kitchen crafting crispy plant-based Katsu Curry, Unagi Donburi made from layered tofu & nori, and chilled Cha Soba sets.',
    vibe: 'Bustling Bugis Japanese izakaya & bento corner',
    highlights: [
      'Signature Vegetarian Unagi Set with Glazed Nori-Tofu Kabayaki',
      'Crispy Plant-Based Tonkatsu Japanese Curry Rice',
      'Tempura Moriawase & Cold Green Tea Cha Soba',
      'Salmon & Tuna Sashimi (Konjac Craft) Deluxe Maki Roll',
    ],
    reviews: [
      {
        author: 'love ling',
        rating: 5,
        text: 'The vegetarian unagi bento is magic! Sweet-savory kabayaki glaze over tender tofu layered with seaweed, followed by a walk around Bugis.',
        timeAgo: '2 weeks ago',
      },
      {
        author: 'Ethan G.',
        rating: 4,
        text: 'Fortune Centre is Singapore’s vegetarian paradise, and Herbivore is the crown jewel for Japanese curry and bento sets.',
        timeAgo: '1 month ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdqotQC3hmDqopp8ClayvPqrqhoWD6Cf5WFy212mAktqfKqRt9fqIKW5Nji1qqMFP2UOlrUMM8RS3akXS8jT1denoNU5JrsQ4VW4wHNISRGPfMJ1rO4ATjfyN7I6A09uiWR74hScsJwsmQa=w720-h540-k-no',
        caption: 'Japanese Zen Bento & Katsu Curry',
        rating: '4.4 ★ (1,373)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcuFcmKGninLdOGArroB1_IzgyOV-f5FFBdT4Wgj2wrhaIqEQYWgp3IDFz4Cj8TPo8zf8qBYDiRzJK70iaQnR-aIUxkaUrM1En63L72Mz5Bqgk2dUi15syrBIBjn39pLH6ppRaGMGJWnkhk=w720-h540-k-no',
        caption: 'Hand-Rolled Vegetarian Maki Platter',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdX7yjuI1CY7yZKIDSMiughWt7L_AQGkao7vw215I71u0YR1O6Jd86MS901e1MoajpCp8gJj987coooQA3aDGEKuMOQtsdxmYUcAqYeciog9k2dCdaQFPkSpoW7TMSbIJR8COLyHgr1kfm7=w720-h540-k-no',
        caption: 'Warm Udon Broth & Crispy Tempura',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfIX1t0LzZ_4BHdjNU4KsDUlGv-yuB106Tg10zaZk65gTeormbWlNJ74ovYwBGJ_Mj8Y7gqrQW95QlbOSRIQU97LklmlWWVO4BJ5btU51Co8X0Sy-7fB01MG5lkGWerCYYbw6_F9HzvIIvx=w720-h540-k-no',
        caption: 'Fortune Centre Japanese Kitchen',
      },
    ],
  },

  // ======================== EAST ========================
  {
    id: asRestaurantId('veganburg-eunos'),
    region: 'east',
    name: 'VeganBurg Singapore',
    chineseName: '维根堡',
    areaName: 'Jalan Eunos · East',
    googleCategory: 'Vegan restaurant',
    openStatusText: 'Opens 11:30 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.3209523, lng: 103.9054528 },
    cuisine: 'Californian Plant-Based Burgers',
    rating: 4.6,
    reviewCount: 4548,
    priceRange: '$15–25',
    address: '44 Jln Eunos, Singapore 419502',
    postalCode: '419502',
    hours: 'Daily 11:30 am – 9:30 pm',
    serviceTag: '100% Vegan · Iconic East-side standalone diner',
    phone: '+65 6844 6868',
    websiteUrl: 'https://www.veganburg.com',
    directionsUrl: createGoogleMapDirections('VEGANBURG Jalan Eunos', '44 Jln Eunos, Singapore 419502'),
    mapEmbedUrl: createGoogleMapEmbed('VEGANBURG Jalan Eunos, 44 Jln Eunos, Singapore 419502', {
      lat: 1.3209523,
      lng: 103.9054528,
    }),
    description:
      'The world’s first 100% plant-based burger joint born right here in Jalan Eunos! Famous for its Creamy Shrooms Burg, Chili Krab Burg, and Seaweed Fries.',
    vibe: 'Playful retro-Californian garden shack in Eunos',
    highlights: [
      'Award-Winning Chili Krab Plant Burg with Sweet-Spicy Chili Sauce',
      'Creamy Garlic Shrooms Burg on Warm Wholemeal Brioche',
      'Char-Grilled Satay Burg with Crushed Peanut Sauce',
      'Signature Nori Seaweed Fries & Sizzling Broccoli',
    ],
    reviews: [
      {
        author: 'Natasha C.',
        rating: 5,
        text: 'Such a fun casual dinner spot! The Creamy Shrooms burger and seaweed fries never miss, and the garden lights at night are great.',
        timeAgo: '6 days ago',
      },
      {
        author: 'Ryan K.',
        rating: 5,
        text: 'An East-side legend with over 4,500 Google reviews. The Chili Krab patty is crispy outside and tender inside.',
        timeAgo: '3 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfSpJrfRUef-228e4EMKvyhS4xKDPnfv4E2pJTvKJODAxTwQHFb1zOGlIoSVCBRePJxbeu0KsyTjPN2afcL8mJgnk1DmkcmPTO2Lc0cCv7AhGiBrl-CWxm7jjyS8QGemRr6ngoz=w720-h540-k-no',
        caption: 'VeganBurg Jalan Eunos Standalone Diner',
        rating: '4.6 ★ (4,548)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcDkJ1zX3FISLTuIj7oMWx8S4pXYZpE56YlVPMYAJiXrayywJQWjH0UxWmf26Sn8r1ZyfXVHUAfrsPKahOHfspjx4AkQfHEckqIG6OuqTBpuCKkFZq2Qic9_F9ZFm7OetUqzYj5NQ=w720-h540-k-no',
        caption: 'Creamy Shrooms & Chili Krab Burgers',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdcBInCRKTTtHUkUPahUTsRYjAlPm85v4QXcniBipEwLy7JSz3Fn3qQ_SGLcsUAr9X09JBqL4IMdSk_XDdtDXP6sGLpgPKVGfzCXoCjRXGxW1HGhLqxHH1-Koz35HVGK7PC2ctFEBolC7ei=w720-h540-k-no',
        caption: 'Crispy Seaweed Fries & Sides',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdMI-XBkBGE6L3IFFvGH-yQL60MxzGUKmrmPDVTop8pWcD7exNDrTJfnMNAcGUn6wlEzHpnPCXHKjTmm0lPCHaRPfD2L05fjffQbyrWvczFeu6OmbbfEHEKiUeiF-TujL1QcozvuY7rYWsK=w720-h540-k-no',
        caption: 'Plant-Based Brioche Burgers & Drinks',
      },
    ],
  },
  {
    id: asRestaurantId('elemen-classic-plq'),
    region: 'east',
    name: 'elemen PLQ Mall',
    chineseName: '元素',
    areaName: 'Paya Lebar Quarter · PLQ',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.3175346, lng: 103.8925141 },
    cuisine: 'Modern Natural 8-Course Fusion',
    rating: 4.0,
    reviewCount: 922,
    priceRange: '$25–35',
    address: '10 Paya Lebar Rd, #03-13 PLQ Mall, Singapore 409057',
    postalCode: '409057',
    hours: 'Daily 11:00 am – 4:00 pm, 5:30 pm – 10:00 pm',
    serviceTag: 'Curated 5- or 8-Course Set Menus · Meatless fine casual',
    phone: '+65 6503 2533',
    websiteUrl: 'https://www.elemengroup.com.sg',
    directionsUrl: createGoogleMapDirections('elemen PLQ Mall', '10 Paya Lebar Rd, PLQ Mall, Singapore 409057'),
    mapEmbedUrl: createGoogleMapEmbed('elemen, 10 Paya Lebar Rd, PLQ Mall, Singapore 409057', {
      lat: 1.3175346,
      lng: 103.8925141,
    }),
    description:
      'Elegant natural-food dining at PLQ Mall offering curated 5-course and 8-course vegetarian dinner sets—from appetizer trio and double-boiled truffle soup to wood-fired pizza and dessert.',
    vibe: 'Sophisticated, relaxed celebratory dining ambiance',
    highlights: [
      'Signature 8-Course Dinner Experience (Appetizer to Dessert)',
      'Wild Mushroom & White Truffle Thin-Crust Pizza',
      'Blue Pea Flower Rice with Tempura Enoki & Nyona Sauce',
      'Double-Boiled Matsutake & Black Truffle Clear Soup',
    ],
    reviews: [
      {
        author: 'Peter Lum',
        rating: 5,
        text: 'Ideal for a celebratory dinner! Getting an 8-course thoughtfully plated vegetarian tasting menu for around $35 is unbeatable.',
        timeAgo: '1 week ago',
      },
      {
        author: 'Brandon T.',
        rating: 4,
        text: 'The truffle mushroom pizza and blue pea rice set are gorgeous. Quiet, classy atmosphere at PLQ.',
        timeAgo: '2 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLc67BK8ShwSI2Q8dRLh4jVqoiv4Vn_RROmOCr2hPFixQMiooSTcjc3kcQgMq8l4l5fulnKdStgXeQhxu2h6OwUtGPFKa5gBDClHvVs_RAWoP12uD6SE3dtvWKNl2iICKA_cCIc8=w720-h540-k-no',
        caption: 'Curated 8-Course Modern Natural Dining',
        rating: '4.0 ★ (922)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLe1WV21j4Jo6IYHoq6VIpllOhUeLaK7yFMFB3GhQ1PRLsZ1TLEKM17C_bKE_8yHffyOk8cBRzULalaiYcFvpjVBzj3qifpuCGS-Z1adAqjPwNPfQgAqYM4_50wZyzK0LMD8u-_2=w720-h540-k-no',
        caption: 'Black Truffle & Wild Mushroom Pizza',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdERcKzrplTjYwA3AJLQ2vykEq_qWCP6cP63M_JF3X-mnAMX0BtbNPuw-aY_us7USDy800brFaFHvvOIOa-v6verdoTfzsQkVbOEZLW-MlpUdj6bP8WstW0Y0Iuy-k4zXa6XG8RDNoB1rbE=w720-h540-k-no',
        caption: 'Artisanal Tasting Plates & Broths',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfvnVcRVIcrl1EDJTONNAhUgntWpe8qrDucBoEoMV1EGCZKosDJ87VJrkTpgX52VNQk6owbZz4nDQZI5mtS5ubjQIjHSt_YpIuVlaqyeGZkZWOiZCWL5tXxNGWeARov4l3aobANtSweAvdC=w720-h540-k-no',
        caption: 'Warm Modern Dining at PLQ Mall',
      },
    ],
  },
  {
    id: asRestaurantId('mother-earth-tampines'),
    region: 'east',
    name: 'Mother Earth Tampines',
    chineseName: '大地之母',
    areaName: 'Tampines Ave 4 · East',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 8 am',
    popularTimesPeak: 'Peak 6 pm – 8 pm',
    coordinates: { lat: 1.3471073, lng: 103.9380376 },
    cuisine: 'Peranakan & Local Claypot Delights',
    rating: 4.0,
    reviewCount: 1441,
    priceRange: '$10–20',
    address: '801 Tampines Ave 4, #01-281, Singapore 520801',
    postalCode: '520801',
    hours: 'Daily 8:00 am – 9:30 pm',
    serviceTag: 'Serves vegan dishes · Heartwarming East-side comfort',
    phone: '+65 6781 1820',
    websiteUrl: 'https://zizaivegetarian.oddle.me',
    directionsUrl: createGoogleMapDirections(
      'Zi Zai Vegetarian Tampines',
      '801 Tampines Ave 4, Singapore 520801'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Zi Zai Vegetarian, 801 Tampines Ave 4, Singapore 520801',
      { lat: 1.3471073, lng: 103.9380376 }
    ),
    description:
      'Beloved East-side neighbourhood treasure near Tampines West MRT serving sizzling claypot bak kut teh, Nonya Assam Pedas, and crispy golden cereal tofu.',
    vibe: 'Homely, air-conditioned East heartland gem',
    highlights: [
      'Herbal Claypot Vegetarian Bak Kut Teh with You Tiao',
      'Nonya Assam Pedas Plant-Based Fish in Banana Leaf',
      'Hotplate Black Pepper Monkey Head Steak',
      'Creamy Pumpkin Golden Salted-Style Tofu',
    ],
    reviews: [
      {
        author: 'S Luke',
        rating: 5,
        text: 'Comfort food at its finest! The herbal bak kut teh and Assam Pedas taste just like grandma’s cooking.',
        timeAgo: '2 weeks ago',
      },
      {
        author: 'Darren P.',
        rating: 4,
        text: 'Right next to Tampines West MRT. Huge variety, super friendly aunties and uncles, and delicious wok dishes.',
        timeAgo: '1 month ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeKv5xj_Ks4sbjGQqdZvQ4j4jw9cQL9L2jS_S-4V73luahcf82Y5RxtWQxNVOM7ZuAoOAWI96vz4RU2cnVyfk1R_FKhhopUYFOW_Wr7PMUi-FYv1YPErFat1JF88mP2HkzPxc45DJmjZSVY=w720-h540-k-no',
        caption: 'Sizzling Claypot & Peranakan Curries',
        rating: '4.0 ★ (1,441)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfSeiZ-DnW9IUPdog9c5luBrGzaA7aMf1yScyi-YNfQD9kmBHg4wH7BkzrLde2JhF-GZJcx3AtELvvTgbn828VZxYD5AqV3kq2DSJXlavXQiY0rNWS7KpbYeSGa9DpQD7rdYQEpYJoz3icj=w720-h540-k-no',
        caption: 'Golden Cereal Tofu & Wok Greens',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLduQVxaKTUxiBettUXevHWeiynpfkevDRwkqjiK5JeFOHC3E02jyuYnHe_gA1z8wUXRpXATrlV0EcywO3JsELyAOa8D1Kyj5i63OmFhEh4z4Haru7TUQ_Cu7hd1TyP3ZuPFulGFLICLH3On=w720-h540-k-no',
        caption: 'Local Zi Char & Hor Fun Classics',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLe6Pvu7MbtAhHzFbq7dHz0-TUaAEcXvjcfJs0AOl8pHArNEZO3PdDF3L2nrcW8hcWt6m2CMscL7kWtggajbYCoICv11kQRMxOvxClBraN359q2r1UUEi_D3zBxDenUTQn6LdKemItM7BUc9=w720-h540-k-no',
        caption: 'Tampines Ave 4 Heartland Dining',
      },
    ],
  },

  // ======================== NORTH ========================
  {
    id: asRestaurantId('nomvnom-yishun-pond'),
    region: 'north',
    name: 'Real Food Yishun Pond',
    chineseName: '真食湖畔',
    areaName: 'Yishun Pond · North',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 7:30 am',
    popularTimesPeak: 'Peak 6 pm – 8 pm',
    coordinates: { lat: 1.4262514, lng: 103.8382939 },
    cuisine: 'Lakeside Western Burgers & Truffle Pizza',
    rating: 4.1,
    reviewCount: 650,
    priceRange: '$15–25',
    address: '30A Yishun Central 1, #01-09, Singapore 768796',
    postalCode: '768796',
    hours: 'Daily 7:30 am – 9:30 pm',
    serviceTag: 'Scenic Yishun Pond waterfront views · Organic cafe',
    phone: '+65 9456 2370',
    websiteUrl: 'https://www.realfoodgrocer.com',
    directionsUrl: createGoogleMapDirections(
      'Real Food Yishun',
      '30A Yishun Central 1, Singapore 768796'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Real Food Yishun, 30A Yishun Central 1, Singapore 768796',
      { lat: 1.4262514, lng: 103.8382939 }
    ),
    description:
      'Glass-walled lakeside bistro perched right on the edge of Yishun Pond Park with views of the spiral lookout tower. Famous for handmade dumpling noodle soup, millet burgers, and sourdough pizzas.',
    vibe: 'Scenic sunset lakeside glasshouse in the North',
    highlights: [
      'Lakeside Millet & Beetroot Burger with Hand-Cut Wedges',
      'Truffle Mushroom Thin-Crust Sourdough Pizza',
      'Handmade Organic Dumpling Noodle Soup by the Pond',
      'Waterfront Sunset Walk around Yishun Pond Lookout Tower',
    ],
    reviews: [
      {
        author: 'Noelle Teoh',
        rating: 5,
        text: 'Floor-to-ceiling windows looking right over Yishun Pond at sunset! Such a scenic and peaceful dinner spot in the North.',
        timeAgo: '1 week ago',
      },
      {
        author: 'Shawn T.',
        rating: 5,
        text: 'The burger and sourdough pizza are phenomenal. Afterwards you can stroll up the spiral tower overlooking the park.',
        timeAgo: '3 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcUS1DEh6NmzlYGJ-TfxUONO4Yo-5Jch8P21Ks3gOF5hDDtbUGaN2madtMLxrQvDuHBTIbbIDMeR1B6VhAziPYzzZBdtBRScsm64QpOWPgnvuwFg7nRisIe7tKkxWBm0i2pupA=w720-h540-k-no',
        caption: 'Lakeside Yishun Pond Dining View',
        rating: '4.1 ★ (650)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLd2OAP75UaSoMaCffw3H0Ddsu3JkeHSOQJU_i4QHq6zBFJvnHPWTMWYB7OYiMkfoLjntFxRijtI9EcYiFfOzsbXMNtMjXdGK2RUO4Pubysm8UDujpc8wba-V5teV3eBHuGA14N3iQ=w720-h540-k-no',
        caption: 'Artisan Sourdough Pizza & Pasta',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfXcoR_fd-5fJGIOSkOu5c2RI1Y__0d_Z6AEpMlpVrkGxm0d6RENABxFjrYJEg4Mu69XEipM6X2FAFW-BJDXB74cC5G_08nww_txh7KZAFjnYMeU1-RIaRtKZ7nNSoSeUk5a936-w=w720-h540-k-no',
        caption: 'Wholesome Plant-Based Burgers & Bowls',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfUTjUjx5eFC2EXUxsSyAySAJdu0aSfRkCgONYD2tqjzcKID5r5-C_kPREuIK_iT4yq0hlsgjCQ7PxapOvwEd-j3_v-LCBlw4joh6KDZ_X1Ur6_a9R-evrq4DiwKsqWejJ16E_lHxrvGzxS=w720-h540-k-no',
        caption: 'Scenic Yishun Pond Waterfront',
      },
    ],
  },
  {
    id: asRestaurantId('greendot-plus-northpoint'),
    region: 'north',
    name: 'Greendot Northpoint',
    chineseName: '绿一点',
    areaName: 'Northpoint City · Yishun',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11 am',
    popularTimesPeak: 'Peak 6 pm – 8 pm',
    coordinates: { lat: 1.4292353, lng: 103.8361403 },
    cuisine: 'Taiwanese-Asian Herbal Soup & Bento',
    rating: 4.3,
    reviewCount: 844,
    priceRange: '$12–22',
    address: '930 Yishun Ave 2, #B2-09/11 Northpoint City, Singapore 769098',
    postalCode: '769098',
    hours: 'Daily 11:00 am – 9:30 pm',
    serviceTag: 'Serves vegan & allium-free dishes · Nourishing bowls',
    phone: '+65 6754 1778',
    websiteUrl: 'https://www.greendot.sg',
    directionsUrl: createGoogleMapDirections(
      'Greendot Northpoint',
      '930 Yishun Ave 2, Northpoint City, Singapore 769098'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'Greendot Northpoint, 930 Yishun Ave 2, Northpoint City, Singapore 769098',
      { lat: 1.4292353, lng: 103.8361403 }
    ),
    description:
      'Wholesome Taiwanese-inspired meat-free dining at Northpoint City serving warming Angelica Herbal Noodles, Rendang Lion Mane Bento sets, and signature Laksa.',
    vibe: 'Bright, leafy modern Asian kitchen',
    highlights: [
      'Signature Rendang Lion Mane Mushroom Bento with Purple Rice',
      'Double-Boiled Angelica Root Herbal Konjac Mee Sua',
      'Nyonya Laksa with Crispy Beancurd Skin & Tau Pok',
      'Crispy Soy Nuggets with Taiwanese Plum Powder',
    ],
    reviews: [
      {
        author: 'Brahmakumar B.',
        rating: 5,
        text: 'Friendly service and very healthy food! Their Rendang Lion Mane Mushroom bento with five-grain rice is my ultimate comfort meal.',
        timeAgo: '4 days ago',
      },
      {
        author: 'Gabriel L.',
        rating: 4,
        text: 'Conveniently located inside Northpoint City. Love the herbal soup and laksa—never feels heavy.',
        timeAgo: '2 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdDPkZyvS3IeoWobYFEaiojLsluDYKBlNRFGK9LydhthMdWAcet396dgsR6XvL8ixlpdWCRRVEnfZBuOkNuW2Ph6UsUl7bYvAX8jI2ye_x4R4dvFkYmwnk0QNfsYuLR9mbtMwm8=w720-h540-k-no',
        caption: 'Rendang Lion Mane Grain Bento',
        rating: '4.3 ★ (844)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLd7fmJybJuBTY_mV8Eg9e6JWIBKrRFmjNaMd-KCZXsYv-hb8d_bWcOqGzhfzldjtBJvEY2HTZ590n7DNV345HXUX9qG1mYLKRObxHZ6Jp8HCClfKlDF0xNSRMDotj917R1diNMCZQ=w720-h540-k-no',
        caption: 'Nourishing Angelica Herbal Soup & Laksa',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdm4TwncvoiA13RDTmFCl_VIcW774WQp53-RHyq4ahYPpdME1wPlFW8essYrRt6vpbRBE_wMpi8IQrZqQjhSmi_BtuIFYo93RoH54-iTD5-546sYZebtoSmklr3GeSAhmhtDO4-94_UQXU=w720-h540-k-no',
        caption: 'Signature Bento Sets & Sides',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfDtwoFd00eDJ6X_TWRMTc7WiHlvNRH8KZaRioxGDx9yWBAx8k7HWm2BAcrCtwTbvNojN0r_ZSdjHlZhBkHrF4mwoXNjQcrXiE9I7Vk0ewr-M2bgB3qQBc13NN7KyTGmpzlMB5fKCy2bvQ=w720-h540-k-no',
        caption: 'Northpoint City Dining Space',
      },
    ],
  },
  {
    id: asRestaurantId('ananda-bhavan-yishun'),
    region: 'north',
    name: 'Ananda Bhavan Yishun',
    chineseName: '阿难陀素食',
    areaName: 'Yishun Central · North',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 7:30 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.42785, lng: 103.83742 },
    cuisine: 'South & North Indian Dosai & Thali',
    rating: 4.2,
    reviewCount: 480,
    priceRange: '$10–20',
    address: '925 Yishun Central 1, #01-213, Singapore 760925',
    postalCode: '760925',
    hours: 'Daily 7:30 am – 10:00 pm',
    serviceTag: '100% Vegetarian since 1924 · Heritage Indian kitchen',
    phone: '+65 6755 9835',
    websiteUrl: 'https://www.anandabhavan.com',
    directionsUrl: createGoogleMapDirections(
      'Ananda Bhavan Vegetarian Yishun',
      '925 Yishun Central 1, Singapore 760925'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      '925 Yishun Central 1, Singapore 760925',
      { lat: 1.42785, lng: 103.83742 }
    ),
    description:
      'Singapore’s oldest Indian vegetarian restaurant (founded 1924), serving crisp golden Masala Dosai, fluffy Chana Bhatura, Paneer Butter Masala, and frothy Madras Filter Coffee.',
    vibe: 'Vibrant heritage Indian spice & masala aroma',
    highlights: [
      'Crispy Golden Paper & Mysore Masala Dosai with 3 Chutneys',
      'Royal North Indian Thali with Paneer Tikka & Garlic Naan',
      'Fluffy Giant Bhatura with Spiced Chickpea Masala',
      'Traditional Pulled Madras Filter Coffee & Mango Lassi',
    ],
    reviews: [
      {
        author: 'Priya S.',
        rating: 5,
        text: 'Nothing beats fresh, crispy masala dosai dipped in coconut chutney and piping hot sambar, finished with filter coffee!',
        timeAgo: '1 week ago',
      },
      {
        author: 'Kenneth Y.',
        rating: 4,
        text: 'Authentic century-old Singapore heritage. Their paneer butter masala and garlic naan are super satisfying.',
        timeAgo: '3 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfiH_Myze8M982_t82b7WcTgSvnVSEjnBNlMV6ZqtF4sYmB6VsJYkg-0xFXxpeTQaTjAJihT3YqqWuEaz2-YJ31sltXWCyz3XvNwhl23sFO-sY62v5d7GLyjKaexg9mgxoqzwAGCQ_6XQ01=w720-h540-k-no',
        caption: 'Heritage Indian Thali & Paneer Masala',
        rating: '4.2 ★ (480)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfQKTNhJ1XF64pNhPbA0kkwnf3ryhDEit0RoBSMlUcoOwSBrKcgI_Gt9GM0foL8zLBcvVy4VurVuWUYDdlrF77SNpZFQJqo5zhHmXrW7Y_-Nrk9ikhcmVQQY4ZXTvEcF8qeTuJcUmi-vUY=w720-h540-k-no',
        caption: 'Crispy Golden Masala Dosai & Chutneys',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcyR9WfPQoLx53NvehbQXf3WgTanzrNuQb0_--xdcz-KqZzJkpXFfKg9PTe62swbU13XzsHNqSbjAABiHoU8K-E4_ijKO4Dn9rYS-BcuyldMSKbHaSlCv83pcxJ3pKeorRSXImrcPFr6yJB=w720-h540-k-no',
        caption: 'North & South Indian Vegetarian Feast',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeY28z8BFiFDgEHtaoPX21SIH8CVzkQ6Xfgqb5ZHM1sAxUzD-1eBQM6ST12zF07deMjzDQDIlLveyIRP7awjy_8VJPGFmr99LIOE9tN_VglB1ogWPLAgTco6iJH8uBfGsNqAiJ2sY6Adt2o=w720-h540-k-no',
        caption: 'Spiced Briyani, Naan & Filter Coffee',
      },
    ],
  },

  // ======================== SOUTH ========================
  {
    id: asRestaurantId('elemen-harbourfront'),
    region: 'south',
    name: 'elemen 元素 (HarbourFront)',
    chineseName: '元素天然素食',
    areaName: 'HarbourFront · VivoCity',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11:30 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.2651258, lng: 103.820149 },
    cuisine: 'Modern Natural Meatless Dining',
    rating: 4.5,
    reviewCount: 890,
    priceRange: '$25–40',
    address: '1 Maritime Square, #02-85 HarbourFront Centre, Singapore 099253',
    postalCode: '099253',
    hours: 'Daily 11:30 am – 4:00 pm, 5:30 pm – 10:00 pm',
    serviceTag: 'HarbourFront waterfront dining · 8-course natural meatless',
    phone: '+65 6904 9568',
    websiteUrl: 'https://www.elemengroup.com.sg',
    directionsUrl: createGoogleMapDirections(
      'elemen HarbourFront',
      '1 Maritime Square, HarbourFront Centre, Singapore 099253'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'elemen, 1 Maritime Square, HarbourFront Centre, Singapore 099253',
      { lat: 1.2651258, lng: 103.820149 }
    ),
    description:
      'Modern natural meatless restaurant at HarbourFront along the Southern Waterfront, celebrating wholesome plant-based ingredients with Truffle Wild Mushroom Risotto, Blue Pea Flower Roll, and Tempura Tofu.',
    vibe: 'Relaxed waterfront dining at HarbourFront',
    highlights: [
      'Wild Mushroom & Black Truffle Risotto',
      'Signature Blue Pea Flower Sushi Roll with Avocado',
      'Braised Monkey Head Mushroom in claypot herbal jus',
      'Chilled Sea Coconut & Snow Pear Dessert',
    ],
    reviews: [
      {
        author: 'MEGUMI NAKAZAWA',
        rating: 5,
        text: 'Lovely dinner spot at HarbourFront! Their 5-course and 8-course meatless sets are super worth it and beautifully plated.',
        timeAgo: '1 week ago',
      },
      {
        author: 'J. Tan',
        rating: 4,
        text: 'Great variety of modern meatless dishes right by the HarbourFront waterfront.',
        timeAgo: '2 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcCsHqUpJ_Bdo0xBm707oDM6MpVzX4cOJjx6RATgAsBMN52JHvdcsOa4JRD7O7vK9KOQ6Xcu10aSgVdBy4Eqwzpr7N1nlX5ZkFOc_60I8emvWdUstfXfsuZa1Wbnke146m7ZZqiyn1IdIS0=w720-h540-k-no',
        caption: 'Modern Natural Meatless Course',
        rating: '4.5 ★ (890)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfWuEiDDjCLUPC3Gu0PmJBlm5V_JKJI91czlKLElBsr4dr9s3byD2C0ISuNyzS6ef1KZ8qTZmbL6V3Cnvvge8RZk1L5W-DMa_IvxhQSJLJTkcMAheG6BXXuvT7Zmo6JypHM5KOAiL115Nf4=w720-h540-k-no',
        caption: 'Truffle Wild Mushroom Risotto & Tempura',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdL0HdrnGlLcqo4iyW6q1ltfO1KFnLi9gpROnLGP0dkGro_xVvZx74N3vZCjUzkDDKtzTtAcgh6zN0BuHbyrE21RnLUmLxu-dd5C170yK4jZeMcGYM7tAkCiFXriLLEBMC8uNUS8CauxffK=w720-h540-k-no',
        caption: 'Blue Pea Flower Roll & Appetizers',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfPqP9Q3PZtI-2UVWqCePq8RNdIzJWfXOBF4NkD36VXtSy6yz8SxxRuDCgYQnQDip8Viw8tXJGMl6LjL95eVxhMm0r4PBtOQAjQx61lfg5VGpI9HJvT5Srkbi6DBHcyjoTpXyfSC7WGjv91=w720-h540-k-no',
        caption: 'HarbourFront Centre Dining Space',
      },
    ],
  },
  {
    id: asRestaurantId('lingzhi-vegetarian'),
    region: 'south',
    name: 'LingZhi Vegetarian',
    chineseName: '灵芝素食',
    areaName: 'Orchard · Palais Renaissance',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: 'Opens 11 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.3066514, lng: 103.8294996 },
    cuisine: 'Fine Chinese Dim Sum & Hotpot',
    rating: 4.6,
    reviewCount: 1768,
    priceRange: '$25–45',
    address: '390 Orchard Rd, #B1-04/05 Palais Renaissance, Singapore 238871',
    postalCode: '238871',
    hours: 'Daily 11:00 am – 3:00 pm, 6:00 pm – 10:00 pm',
    serviceTag: 'TungLok Group fine vegetarian · Zero mock meat focus',
    phone: '+65 6734 3788',
    websiteUrl: 'https://www.lingzhi.com.sg',
    directionsUrl: createGoogleMapDirections(
      'LingZhi Greens',
      '390 Orchard Rd, Palais Renaissance, Singapore 238871'
    ),
    mapEmbedUrl: createGoogleMapEmbed(
      'LingZhi Greens, 390 Orchard Rd, Palais Renaissance, Singapore 238871',
      { lat: 1.3066514, lng: 103.8294996 }
    ),
    description:
      'Helmed by the TungLok Group since 1991, LingZhi crafts gourmet Chinese vegetarian cuisine and handcrafted dim sum using organic bamboo shoots, truffles, and wild mushrooms without relying on gluten mock meats.',
    vibe: 'Refined white-tablecloth Chinese fine dining',
    highlights: [
      'Braised Spinach Tofu with Wild Morel & Bamboo Pith',
      'Crispy Avocados & Mango Kataifi Roll',
      'Satay Celup & Nourishing Cordyceps Flower Individual Hotpot',
      'Handcrafted Steamed Truffle & Mushroom Crystal Dumplings',
    ],
    reviews: [
      {
        author: 'The Red Marker',
        rating: 5,
        text: 'Refined, delicate Chinese vegetarian cooking using real mushrooms, truffles, and fresh produce rather than mock meat.',
        timeAgo: '1 week ago',
      },
      {
        author: 'Raymond H.',
        rating: 5,
        text: 'Wonderful service and tranquil atmosphere at Palais Renaissance for a celebratory dinner. The crispy kataifi roll and truffle dumplings are highlights.',
        timeAgo: '3 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLf9LRsU7XSvkOYMlq1WxO-5XOhKmBB1LRygPvUbTIqaluIU66ShkAmJW3Yhw9Ym7HJp2njkCqIapDmAc7dlwGUKICyiNFyN9luJwraGuRbtyk4B8KvR3X4czHwcpmOiUdrL63JZ=w720-h540-k-no',
        caption: 'Handcrafted Truffle Crystal Dumplings',
        rating: '4.6 ★ (1,768)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfRFQxwKvJJIGeNNKFg0gv-4oL8JPOfli6exht5hFFuWu_GKGu7ya-Fu-ktRB_Sx0-4euyHwoASfQfYPPq7hs-6S_nabQevkP4XMw2Scig6rpXqa1GKwxac7rXRcdeAHKWApzbtav_fz7es=w720-h540-k-no',
        caption: 'Gourmet Chinese Vegetarian Specialties',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeoBCKsM7i3AUAYdGFhNGhZyrTMrocLQr5hP2yaSfJlZGTpyK_1UhvA7vrBCnIiZkrrl5SPw94xuauwR4px0VmwdZiFwMkUeex8RYqMZzk66eugDzW6_VCN9JUdiNgGNO4SugxxFQ=w720-h540-k-no',
        caption: 'Nourishing Double-Boiled Soup & Hotpot',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLfe0MLh5Mn4b57mHlRRP_-EU3U5_bN9G8D0ffLPZnM2qUSvBMqR-Yd9UBQT0knQJSpwiR0ps-6IS4ibHC4g_ytQXXAV4eWzTpnJoB9OjzOdHVWTIGzxlPUMnLzmv6oV_1lSx_7AyLsxX08V=w720-h540-k-no',
        caption: 'Elegant Palais Renaissance Dining Room',
      },
    ],
  },
  {
    id: asRestaurantId('the-kind-bowl-killiney'),
    region: 'south',
    name: 'The Kind Bowl',
    chineseName: '善碗蔬食',
    areaName: 'Killiney Road · Somerset',
    googleCategory: 'Vegan restaurant',
    openStatusText: 'Opens 11 am',
    popularTimesPeak: 'Peak 6:30 pm – 8:30 pm',
    coordinates: { lat: 1.2987396, lng: 103.8394125 },
    cuisine: 'Vietnamese Plant-Based Pho & Baguettes',
    rating: 4.5,
    reviewCount: 1010,
    priceRange: '$15–25',
    address: '71 Killiney Rd, Singapore 239527',
    postalCode: '239527',
    hours: 'Daily 11:00 am – 9:30 pm',
    serviceTag: '100% Plant-Based Vietnamese · Fragrant star-anise broths',
    phone: '+65 9711 7572',
    websiteUrl: 'https://www.thekindbowl.com.sg',
    directionsUrl: createGoogleMapDirections('The Kind Bowl', '71 Killiney Rd, Singapore 239527'),
    mapEmbedUrl: createGoogleMapEmbed('The Kind Bowl, 71 Killiney Rd, Singapore 239527', {
      lat: 1.2987396,
      lng: 103.8394125,
    }),
    description:
      'Charming Vietnamese plant-based cafe along historic Killiney Road serving aromatic 12-hour charred-onion Pho, crispy lemongrass Banh Mi, and Hanoi-style vermicelli bowls.',
    vibe: 'Warm Saigon-style boutique cafe with rattan accents',
    highlights: [
      'The Kind Pho — 12-Hour Spiced Broth with Seared Oyster Mushrooms',
      'Crazy Baguette — Crispy Banh Mi with Lemongrass Soy & Pickles',
      'Grilled Satay Skewers with Fresh Rice Paper Rolls',
      'Traditional Vietnamese Drip Coffee with Creamy Coconut Condensed Milk',
    ],
    reviews: [
      {
        author: 'Cheryl K.',
        rating: 5,
        text: 'Over 1,000 Google reviews for a reason! The Pho broth is so aromatic with charred ginger and cinnamon, and the crispy banh mi is incredible.',
        timeAgo: '3 days ago',
      },
      {
        author: 'Daniel V.',
        rating: 5,
        text: 'Super welcoming botanical interior along Killiney Road. Amazing food, kind staff, and the iced coconut Vietnamese coffee is a must.',
        timeAgo: '2 weeks ago',
      },
    ],
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLeXuccL0NJwjVgItqt37ylIjQJcG17of0O0hmi1aWT-xiDyVmMTz_DDIpZgdPHvNKRwmMyfsvW2PzR06P_wthkDOQrKefKEPll-dJgl9I5uq7kqT-W8M6mv0b-WNRF_UX6zawwZaw=w720-h540-k-no',
        caption: 'Signature 12-Hour Aromatic Kind Pho',
        rating: '4.5 ★ (1,010)',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLdb3IGBV4WdBi2hWxo8LhhhqiieA0aOoo53H7l5dThkqWWRI0iB0VmftPZfyfP7iYZKqK0BDuyIu7_Jh-CjLui0nJ31N97YD7EYBAowMCxdNlZQb46iR-OIimSoRniyVMqZ0HW-=w720-h540-k-no',
        caption: 'Crispy Lemongrass Banh Mi & Summer Rolls',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLf8KdSwFbqI3c_xsfGddUbEH_CK6YfiDhIdhVM0W3CQa4L-Cq_6MGVSzrbkr3GhfdDLuAJmZ3Sh0YNd8Zwyk-zgRcXe9OuhQ2gMWz30Cq3inZ1iR-6SDN4SJKGrPDRRj-8Y2nGR=w720-h540-k-no',
        caption: 'Grilled Satay & Vermicelli Bowls',
      },
      {
        url: 'https://lh3.googleusercontent.com/grass-cs/AABkmLcu28GtCDYnRrhS08kKnNpncHvSbqyGpl9DyCFCvRXiAkDi8zM97YNkLEtMNvkyTVZCr91KNl2CUbmiyo6lHtbmU7AqBPXR4CchJvUl2mriwltJkX_3hPzJhBJViaqhRXEEgHy2H2b0f-8=w720-h540-k-no',
        caption: 'Killiney Road Rattan & Botanical Cafe',
      },
    ],
  },
];

export function isValidRegionId(value: unknown): value is RegionId {
  return (
    typeof value === 'string' &&
    (value === 'north' ||
      value === 'south' ||
      value === 'east' ||
      value === 'west' ||
      value === 'central')
  );
}

export function getRestaurantsByRegion(region: RegionId): readonly Restaurant[] {
  return RESTAURANTS.filter((restaurant) => restaurant.region === region);
}

export function findRestaurantById(id: string): Restaurant | undefined {
  return RESTAURANTS.find((restaurant) => restaurant.id === id);
}

export interface LiveOpeningStatus {
  readonly isOpen: boolean;
  readonly statusBadge: 'Open' | 'Closed';
  readonly detailText: string;
  readonly currentTimeSGT: string;
  readonly scheduleLines: readonly string[];
}

interface ParsedTimeInterval {
  readonly startMin: number;
  readonly endMin: number;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly rawText: string;
}

function parseTimeToken(token: string): number {
  const cleaned = token.trim().toLowerCase();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) {
    return 0;
  }
  let hours = Number(match[1]) % 12;
  const minutes = match[2] ? Number(match[2]) : 0;
  if (match[3] === 'pm') {
    hours += 12;
  }
  return hours * 60 + minutes;
}

function parseIntervalsFromHours(hoursString: string): readonly ParsedTimeInterval[] {
  const stripped = hoursString.replace(/^Daily\s+/i, '').trim();
  const segments = stripped
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const intervals: ParsedTimeInterval[] = [];
  for (const segment of segments) {
    const parts = segment.split(/\s*[–-]\s*/);
    if (parts.length === 2) {
      const startLabel = parts[0].trim();
      const endLabel = parts[1].trim();
      intervals.push({
        startMin: parseTimeToken(startLabel),
        endMin: parseTimeToken(endLabel),
        startLabel,
        endLabel,
        rawText: `${startLabel} – ${endLabel}`,
      });
    }
  }
  return intervals;
}

export function getLiveOpeningStatus(
  hoursString: string,
  now: Date = new Date()
): LiveOpeningStatus {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(now);

  const hour24 = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const currentMinutes = hour24 * 60 + minute;

  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const meridiem = hour24 >= 12 ? 'pm' : 'am';
  const currentTimeSGT = `${hour12}:${String(minute).padStart(2, '0')} ${meridiem} SGT`;

  const intervals = parseIntervalsFromHours(hoursString);
  const scheduleLines = intervals.map((item) => item.rawText);

  for (const interval of intervals) {
    if (currentMinutes >= interval.startMin && currentMinutes < interval.endMin) {
      return {
        isOpen: true,
        statusBadge: 'Open',
        detailText: `Closes ${interval.endLabel}`,
        currentTimeSGT,
        scheduleLines,
      };
    }
  }

  const nextToday = intervals.find((interval) => interval.startMin > currentMinutes);
  if (nextToday) {
    return {
      isOpen: false,
      statusBadge: 'Closed',
      detailText: `Opens ${nextToday.startLabel}`,
      currentTimeSGT,
      scheduleLines,
    };
  }

  const firstInterval = intervals[0];
  return {
    isOpen: false,
    statusBadge: 'Closed',
    detailText: firstInterval ? `Opens ${firstInterval.startLabel}` : 'Closed today',
    currentTimeSGT,
    scheduleLines,
  };
}

