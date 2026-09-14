import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SITE_ORIGIN, getRestaurantJsonLd, getSeoMetadata, getSiteOrigin } from './seo';
import { restaurantProfile } from './restaurant';
import type { Location } from './location';
import type { MenuAvailability } from './menu';
import sitemap from '../app/sitemap';

test('getSiteOrigin resolves configured URLs, normalizes trailing slashes, and falls back safely', () => {
  const originalNextUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalNetlifyUrl = process.env.URL;

  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.URL;

    assert.equal(getSiteOrigin('https://custom-domain.com/'), 'https://custom-domain.com');
    assert.equal(getSiteOrigin('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(getSiteOrigin('not-a-valid-url'), DEFAULT_SITE_ORIGIN);
    assert.equal(getSiteOrigin('ftp://invalid-protocol.com'), DEFAULT_SITE_ORIGIN);
    assert.equal(getSiteOrigin(''), DEFAULT_SITE_ORIGIN);

    process.env.NEXT_PUBLIC_SITE_URL = 'https://env-domain.ma/';
    assert.equal(getSiteOrigin(), 'https://env-domain.ma');

    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.URL = 'https://netlify-build.netlify.app';
    assert.equal(getSiteOrigin(), 'https://netlify-build.netlify.app');

    delete process.env.URL;
    assert.equal(getSiteOrigin(), DEFAULT_SITE_ORIGIN);
  } finally {
    if (originalNextUrl) process.env.NEXT_PUBLIC_SITE_URL = originalNextUrl;
    else delete process.env.NEXT_PUBLIC_SITE_URL;
    if (originalNetlifyUrl) process.env.URL = originalNetlifyUrl;
    else delete process.env.URL;
  }
});

test('public business metadata generates dynamic titles and descriptions for homepage and menu page across locales', () => {
  const profile = structuredClone(restaurantProfile);
  profile.name = { fr: 'Mon Bistro', en: 'My Bistro', ar: 'بيسترو الخاص بي' };
  profile.description = { fr: 'Cuisine délicieuse', en: 'Delicious food', ar: 'طعام لديد' };

  const homeFr = getSeoMetadata('fr', 'home', profile);
  assert.equal(homeFr.title.fr, 'Mon Bistro');
  assert.equal(homeFr.description.fr, 'Cuisine délicieuse');
  assert.equal(homeFr.canonicalPath, '/fr');

  const homeAr = getSeoMetadata('ar', 'home', profile);
  assert.equal(homeAr.title.ar, 'بيسترو الخاص بي');
  assert.equal(homeAr.canonicalPath, '/ar');

  const menuEn = getSeoMetadata('en', 'menu', profile);
  assert.equal(menuEn.title.en, 'Menu | My Bistro');
  assert.equal(menuEn.description.en, 'Delicious food');
  assert.equal(menuEn.canonicalPath, '/en/menu');

  const menuAr = getSeoMetadata('ar', 'menu', profile);
  assert.equal(menuAr.title.ar, 'القائمة | بيسترو الخاص بي');
});

test('getRestaurantJsonLd generates correct schema, uses primary location, dynamic schedule, and excludes fixed geo', () => {
  const profile = structuredClone(restaurantProfile);
  profile.name = { fr: 'Bistro Lotus', en: 'Lotus Bistro', ar: 'لوتس بيسترو' };
  profile.description = { fr: 'Saveurs asiatiques', en: 'Asian flavors', ar: 'نكهات آسيوية' };
  profile.contacts = [
    { id: '1', type: 'phone', value: '+212600000000', displayValue: '06 00 00 00 00', enabled: true, sortOrder: 0, primary: true, label: { fr: 'Tél', en: 'Tel', ar: 'هاتف' } },
  ];

  const locations: Location[] = [
    {
      id: 'loc-1',
      profileId: profile.id,
      name: { fr: 'Succursale Rabat', en: 'Rabat Branch', ar: 'فرع الرباط' },
      address: { fr: '10 Av Agdal', en: '10 Agdal Ave', ar: '10 شارع أقدال' },
      city: 'Rabat',
      postalCode: '10000',
      googleMapsUrl: 'https://maps.google.com/?q=Rabat',
      isPrimary: true,
      enabled: true,
      sortOrder: 0,
    },
  ];

  const availability: MenuAvailability = {
    status: 'open',
    schedule: {
      monday: [{ opensAt: '11:00', closesAt: '15:00' }, { opensAt: '18:00', closesAt: '23:00' }],
      tuesday: [{ opensAt: '11:00', closesAt: '23:00' }],
      wednesday: [],
      thursday: [{ opensAt: '11:00', closesAt: '23:00' }],
      friday: [{ opensAt: '14:00', closesAt: '23:30' }],
      saturday: [],
      sunday: [],
    },
    temporaryClosure: { active: false, message: {} },
    manualOverride: 'open',
    statusMessage: {},
  };

  const jsonLd = getRestaurantJsonLd('en', profile, locations, availability, 'https://my-restaurant.com') as Record<string, unknown>;

  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'Restaurant');
  assert.equal(jsonLd['@id'], 'https://my-restaurant.com/#restaurant');
  assert.equal(jsonLd.name, 'Lotus Bistro');
  assert.equal(jsonLd.description, 'Asian flavors');
  assert.equal(jsonLd.url, 'https://my-restaurant.com/en');
  assert.equal(jsonLd.hasMenu, 'https://my-restaurant.com/en/menu');
  assert.equal(jsonLd.telephone, '+212600000000');
  assert.equal(jsonLd.acceptsReservations, true);
  assert.strictEqual(typeof jsonLd.acceptsReservations, 'boolean');

  // Schema corrections: servesCuisine exists, servableCuisine does not
  assert.deepEqual(jsonLd.servesCuisine, ['Vietnamese', 'Asian', 'Sushi']);
  assert.equal('servableCuisine' in jsonLd, false);

  // geo is removed
  assert.equal('geo' in jsonLd, false);

  // Address uses primary location
  const addr = jsonLd.address as { streetAddress: string; addressLocality: string; postalCode: string };
  assert.equal(addr.streetAddress, '10 Agdal Ave');
  assert.equal(addr.addressLocality, 'Rabat');
  assert.equal(addr.postalCode, '10000');

  // Opening hours specification generated dynamically
  const hours = jsonLd.openingHoursSpecification as Array<{ dayOfWeek: string; opens: string; closes: string }>;
  assert.equal(Array.isArray(hours), true);
  assert.equal(hours.length, 5); // 2 on Mon, 1 Tue, 1 Thu, 1 Fri

  const mondayHours = hours.filter((h) => h.dayOfWeek === 'Monday');
  assert.equal(mondayHours.length, 2);
  assert.equal(mondayHours[0]?.opens, '11:00');
  assert.equal(mondayHours[0]?.closes, '15:00');
  assert.equal(mondayHours[1]?.opens, '18:00');
  assert.equal(mondayHours[1]?.closes, '23:00');

  // Wednesday, Saturday, Sunday are closed and omitted
  assert.equal(hours.some((h) => h.dayOfWeek === 'Wednesday'), false);
  assert.equal(hours.some((h) => h.dayOfWeek === 'Saturday'), false);
});

test('getRestaurantJsonLd handles missing location, contacts, and schedule safely without errors', () => {
  const profile = structuredClone(restaurantProfile);
  profile.contacts = [];
  profile.socialLinks = [];
  delete (profile as Partial<typeof profile>).address;

  const jsonLd = getRestaurantJsonLd('fr', profile, [], undefined, 'https://fallback-site.com') as Record<string, unknown>;

  assert.equal(jsonLd.name, profile.name.fr);
  assert.equal(jsonLd.url, 'https://fallback-site.com/fr');
  assert.equal('telephone' in jsonLd, false);
  assert.equal('address' in jsonLd, false);
  assert.equal('openingHoursSpecification' in jsonLd, false);
  assert.equal('sameAs' in jsonLd, false);
  assert.equal(jsonLd.acceptsReservations, true);
});

test('sitemap entries use the central site origin resolver', () => {
  const originalNextUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-sitemap-domain.com';
    const entries = sitemap();
    assert.equal(entries.length, 6);
    for (const entry of entries) {
      assert.ok(entry.url.startsWith('https://custom-sitemap-domain.com/'));
    }
  } finally {
    if (originalNextUrl) process.env.NEXT_PUBLIC_SITE_URL = originalNextUrl;
    else delete process.env.NEXT_PUBLIC_SITE_URL;
  }
});