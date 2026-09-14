import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicLocations } from './public-locations';
import type { Location } from '../content/location';

function location(id: string, order: number, primary = false): Location {
  return { id, profileId: 'profile-test', name: { fr: `Nom ${id}`, en: `Name ${id}`, ar: `فرع ${id}` }, address: { fr: `Adresse ${id}`, en: `Address ${id}`, ar: `عنوان ${id}` }, city: 'Rabat', postalCode: '10000', googleMapsUrl: `https://maps.example/${id}`, isPrimary: primary, enabled: true, sortOrder: order };
}

test('public locations renders enabled locations in sort order with primary and map actions', () => {
  const markup = renderToStaticMarkup(<PublicLocations locations={[location('b', 1), location('a', 0, true)]} locale="en" />);
  assert.ok(markup.indexOf('Name a') < markup.indexOf('Name b'));
  assert.match(markup, /Primary/);
  assert.equal((markup.match(/Open in Google Maps/g) ?? []).length, 2);
});

test('public locations hides completely when there are no enabled locations', () => {
  assert.equal(renderToStaticMarkup(<PublicLocations locations={[]} locale="ar" />), '');
});

test('single location uses singular heading, omits primary badge, and supports missing Maps URL', () => {
  const single = location('single', 0, true);
  single.googleMapsUrl = undefined;
  const markup = renderToStaticMarkup(<PublicLocations locations={[single]} locale="en" />);
  assert.match(markup, /Our location/);
  assert.match(markup, /Find Us/);
  assert.notEqual(markup.indexOf('Find Us'), markup.indexOf('Our location'));
  assert.doesNotMatch(markup, /Primary/);
  assert.doesNotMatch(markup, /Open in Google Maps/);
  assert.doesNotMatch(markup, /href="undefined"/);
});

test('locations heading hierarchy remains distinct in all locales', () => {
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const markup = renderToStaticMarkup(<PublicLocations locations={[location('single', 0)]} locale={locale} />);
    const eyebrow = locale === 'fr' ? 'Nous trouver' : locale === 'en' ? 'Find Us' : 'اعثر علينا';
    const heading = locale === 'fr' ? 'Notre adresse' : locale === 'en' ? 'Our location' : 'موقعنا';
    assert.match(markup, new RegExp(`<p class="identity-eyebrow">${eyebrow}</p>`));
    assert.match(markup, new RegExp(`<h2 id="locations-title">${heading}</h2>`));
    assert.notEqual(eyebrow, heading);
  }
});

test('multiple locations keep valid Maps actions while missing Maps cards stay non-clickable', () => {
  const missing = location('missing', 0, true);
  missing.googleMapsUrl = undefined;
  const valid = location('valid', 1);
  const markup = renderToStaticMarkup(<PublicLocations locations={[missing, valid]} locale="fr" />);
  assert.match(markup, /Nos adresses/);
  assert.match(markup, /Principal/);
  assert.equal((markup.match(/Ouvrir dans Google Maps/g) ?? []).length, 1);
  assert.doesNotMatch(markup, /href="undefined"/);
});
