import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteShell } from './site-shell';
import { restaurantProfile } from '../content/restaurant';

test('footer anchors target Contact Information and Find Us independently', () => {
  const markup = renderToStaticMarkup(
    <SiteShell locale="en" profile={restaurantProfile}>
      <main>Home</main>
    </SiteShell>,
  );

  assert.match(markup, /<div id="contact-details" class="footer-column">[\s\S]*?Contact Information/);
  assert.match(markup, /<div id="location-details" class="footer-column">[\s\S]*?Find Us[\s\S]*?Google Maps/);
  assert.match(markup, /<div class="footer-column"><p class="footer-label">Social Links<\/p>[\s\S]*?<\/div><div id="location-details"/);
  assert.equal((markup.match(/id="contact-details"/g) ?? []).length, 1);
  assert.equal((markup.match(/id="location-details"/g) ?? []).length, 1);
});