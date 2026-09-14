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
