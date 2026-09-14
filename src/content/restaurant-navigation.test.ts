import assert from 'node:assert/strict';
import test from 'node:test';
import { footerAnchorIds, restaurantProfile, routeHref } from './restaurant';

test('Find Us and Contact use independent footer anchors', () => {
  assert.equal(footerAnchorIds.contact, 'contact-details');
  assert.equal(footerAnchorIds.location, 'location-details');
  assert.equal(routeHref('fr', 'location'), '/fr#locations');
  assert.equal(routeHref('en', 'contact'), '/en#contact-details');
  assert.equal(routeHref('ar', 'location'), '/ar#locations');
  assert.notEqual(routeHref('fr', 'location'), routeHref('fr', 'contact'));
  assert.equal(restaurantProfile.orderingChannels.find((channel) => channel.type === 'glovo')?.url, 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas');
});

test('restaurant ordering preserves the migrated Glovo channel', () => {
  const glovoOrders = restaurantProfile.orderingChannels.filter((channel) => channel.type === 'glovo');
  assert.equal(glovoOrders.length, 1);
  assert.deepEqual(glovoOrders[0]?.ctaText, { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' });
});
