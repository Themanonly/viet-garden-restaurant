import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteShell } from './site-shell';
import { restaurantProfile } from '../content/restaurant';

test('footer anchors target Contact Information and Find Us independently', () => {
  const profile = structuredClone(restaurantProfile);
  profile.address = { fr: 'Rue Test', en: 'Test Street', ar: 'شارع تجريبي' };
  profile.city = 'Rabat';
  profile.postalCode = '10000';
  profile.googleMapsUrl = 'https://maps.google.com/?q=test';
  const markup = renderToStaticMarkup(
    <SiteShell locale="en" profile={profile}>
      <main>Home</main>
    </SiteShell>,
  );

  assert.match(markup, /<div id="contact-details" class="footer-column">[\s\S]*?Contact Information/);
  assert.match(markup, /<div id="location-details" class="footer-column">[\s\S]*?Find Us[\s\S]*?Test Street[\s\S]*?Rabat 10000[\s\S]*?Open in Google Maps/);
  assert.match(markup, /class="footer-location-copy">[\s\S]*?Test Street[\s\S]*?Open in Google Maps[\s\S]*?<\/span>/);
  assert.equal((markup.match(/https:\/\/maps\.google\.com\/\?q=test/g) ?? []).length, 1);
  assert.match(markup, /A Vietnamese table in Casablanca, generous plates, and moments made to share\./);
  assert.match(markup, /<div class="footer-column"><p class="footer-label">Social Links<\/p>[\s\S]*?<\/div><div id="location-details"/);
  assert.equal((markup.match(/id="contact-details"/g) ?? []).length, 1);
  assert.equal((markup.match(/id="location-details"/g) ?? []).length, 1);
});

test('localized location cards keep one destination without duplicating complete addresses', () => {
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const profile = structuredClone(restaurantProfile);
    const markup = renderToStaticMarkup(<SiteShell locale={locale} profile={profile}><main>Home</main></SiteShell>);
    const locationMarkup = markup.match(/<div id="location-details"[\s\S]*?<\/div><\/div>/)?.[0] ?? '';
    assert.equal((locationMarkup.match(/https:\/\/www\.google\.com\/maps/g) ?? []).length, 1);
    assert.match(locationMarkup, locale === 'ar' ? /فتح في خرائط Google/ : locale === 'fr' ? /Ouvrir dans Google Maps/ : /Open in Google Maps/);
    assert.doesNotMatch(locationMarkup, /class="footer-location-meta"/);
  }
});

test('city changes remain visible in the location card when the address is not updated', () => {
  const profile = structuredClone(restaurantProfile);
  profile.city = 'Rabat';
  const markup = renderToStaticMarkup(<SiteShell locale="en" profile={profile}><main>Home</main></SiteShell>);
  assert.match(markup, /class="footer-location-meta">Rabat 20250/);
});

test('header ordering uses a generic localized action and targets the dedicated ordering section', () => {
  const profile = structuredClone(restaurantProfile);
  profile.orderingChannels = [
    { id: 'glovo', name: { fr: 'Glovo', en: 'Glovo', ar: 'Glovo' }, type: 'glovo', url: 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas', ctaText: { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' }, enabled: true, sortOrder: 0 },
    { id: 'yassir', name: { fr: 'Yassir', en: 'Yassir', ar: 'ياسر' }, type: 'yassir', url: 'https://example.test/yassir', ctaText: { fr: 'Commander sur Yassir', en: 'Order on Yassir', ar: 'اطلب عبر ياسر' }, enabled: true, sortOrder: 1 },
  ];

  const enMarkup = renderToStaticMarkup(<SiteShell locale="en" profile={profile}><main>Home</main></SiteShell>);
  assert.match(enMarkup, /href="\/en#ordering-details"/);
  assert.match(enMarkup, />Order Online<\/a>/);
  assert.doesNotMatch(enMarkup, />Glovo<\/a>/);

  const frMarkup = renderToStaticMarkup(<SiteShell locale="fr" profile={profile}><main>Home</main></SiteShell>);
  assert.match(frMarkup, />Commander<\/a>/);

  const arMarkup = renderToStaticMarkup(<SiteShell locale="ar" profile={profile}><main>Home</main></SiteShell>);
  assert.match(arMarkup, />اطلب الآن<\/a>/);
});

test('header ordering action is omitted and footer ordering section stays hidden when no channels are enabled', () => {
  const profile = structuredClone(restaurantProfile);
  profile.orderingChannels = [
    { id: 'glovo', name: { fr: 'Glovo', en: 'Glovo', ar: 'Glovo' }, type: 'glovo', url: 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas', ctaText: { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' }, enabled: false, sortOrder: 0 },
  ];

  const markup = renderToStaticMarkup(<SiteShell locale="en" profile={profile}><main>Home</main></SiteShell>);
  assert.doesNotMatch(markup, /href="#ordering-details"/);
  assert.doesNotMatch(markup, /id="ordering-details"/);
  assert.doesNotMatch(markup, /Order Online/);
});

test('footer ordering section renders all enabled channels in sort order and excludes disabled ones', () => {
  const profile = structuredClone(restaurantProfile);
  profile.orderingChannels = [
    { id: 'yassir', name: { fr: 'Yassir', en: 'Yassir', ar: 'ياسر' }, type: 'yassir', url: 'https://example.test/yassir', ctaText: { fr: 'Commander sur Yassir', en: 'Order on Yassir', ar: 'اطلب عبر ياسر' }, enabled: true, sortOrder: 2 },
    { id: 'glovo', name: { fr: 'Glovo', en: 'Glovo', ar: 'Glovo' }, type: 'glovo', url: 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas', ctaText: { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' }, enabled: true, sortOrder: 0 },
    { id: 'disabled', name: { fr: 'Désactivé', en: 'Disabled', ar: 'معطل' }, type: 'other', url: 'https://example.test/disabled', ctaText: { fr: 'Commander', en: 'Order', ar: 'اطلب' }, enabled: false, sortOrder: 1 },
  ];

  const markup = renderToStaticMarkup(<SiteShell locale="en" profile={profile}><main>Home</main></SiteShell>);
  const orderingMarkup = markup.match(/<div id="ordering-details"[\s\S]*?<\/div>/)?.[0] ?? '';
  assert.match(orderingMarkup, /id="ordering-details"/);
  assert.match(orderingMarkup, /Order on Glovo/);
  assert.match(orderingMarkup, /Order on Yassir/);
  assert.doesNotMatch(orderingMarkup, /Disabled|Order\s+on\s+Disabled/);
  assert.ok(orderingMarkup.indexOf('Order on Glovo') < orderingMarkup.indexOf('Order on Yassir'));
});

test('ordering content stays out of the Find Us column and missing media falls back without broken-image markup', () => {
  const profile = structuredClone(restaurantProfile);
  profile.orderingChannels = [
    { id: 'glovo', name: { fr: 'Glovo', en: 'Glovo', ar: 'Glovo' }, type: 'glovo', url: 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas', logoMediaId: 'missing-logo', ctaText: { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' }, enabled: true, sortOrder: 0 },
  ];

  const media: NonNullable<React.ComponentProps<typeof SiteShell>['media']> = [{ id: 'existing-logo', type: 'image', source: 'remote', reference: 'https://example.test/logo.png', alt: { fr: 'Logo', en: 'Logo', ar: 'شعار' }, visible: true, sortOrder: 0 }];
  const markup = renderToStaticMarkup(<SiteShell locale="en" profile={profile} media={media}><main>Home</main></SiteShell>);

  const locationIndex = markup.indexOf('id="location-details"');
  const orderingIndex = markup.indexOf('id="ordering-details"');
  assert.ok(locationIndex >= 0 && orderingIndex > locationIndex, 'ordering section should come after the location block');
  assert.ok(markup.indexOf('Order on Glovo') > orderingIndex, 'ordering content should reside inside the dedicated ordering block');
  assert.doesNotMatch(markup, /onError=|broken-image|img[^>]*src=""/);
  assert.match(markup, /id="ordering-details"/);
});

test('single missing Maps URL renders footer location content without a false destination', () => {
  const profile = structuredClone(restaurantProfile);
  const markup = renderToStaticMarkup(<SiteShell locale="en" profile={profile} locations={[{ id: 'location-no-map', profileId: profile.id, name: profile.name, address: profile.address, city: profile.city, postalCode: profile.postalCode, isPrimary: true, enabled: true, sortOrder: 0 }]}><main>Home</main></SiteShell>);
  const locationMarkup = markup.match(/<div id="location-details"[\s\S]*?<\/div>/)?.[0] ?? '';
  assert.doesNotMatch(locationMarkup, /href="undefined"|Open in Google Maps/);
  assert.match(locationMarkup, /80 Bd Moulay Slimane/);
});

test('multiple footer locations use the dedicated Locations action', () => {
  const first = { id: 'a', profileId: restaurantProfile.id, name: restaurantProfile.name, address: restaurantProfile.address, city: restaurantProfile.city, postalCode: restaurantProfile.postalCode, googleMapsUrl: restaurantProfile.googleMapsUrl, isPrimary: true, enabled: true, sortOrder: 0 };
  const second = { ...first, id: 'b', isPrimary: false, sortOrder: 1 };
  const markup = renderToStaticMarkup(<SiteShell locale="en" profile={restaurantProfile} locations={[first, second]}><main>Home</main></SiteShell>);
  assert.match(markup, /href="\/en#locations"/);
  assert.doesNotMatch(markup, /Open in Google Maps/);
});