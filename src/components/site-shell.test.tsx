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
  assert.equal((markup.match(/https:\/\/maps\.google\.com\/\?q=test/g) ?? []).length, 1);
  assert.match(markup, /A Vietnamese table in Casablanca, generous plates, and moments made to share\./);
  assert.match(markup, /<div class="footer-column"><p class="footer-label">Social Links<\/p>[\s\S]*?<\/div><div id="location-details"/);
  assert.equal((markup.match(/id="contact-details"/g) ?? []).length, 1);
  assert.equal((markup.match(/id="location-details"/g) ?? []).length, 1);
});