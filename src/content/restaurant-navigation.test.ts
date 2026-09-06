import assert from 'node:assert/strict';
import test from 'node:test';
import { restaurantProfile, routeHref } from './restaurant';

test('Find Us and Contact share the homepage information anchor', () => {
  assert.equal(routeHref('fr', 'location'), '/fr#contact-information');
  assert.equal(routeHref('en', 'contact'), '/en#contact-information');
  assert.equal(routeHref('ar', 'location'), '/ar#contact-information');
  assert.equal(restaurantProfile.ordering.find((order) => order.source === 'glovo')?.url, 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas');
});

test('restaurant ordering has one localized Glovo source', () => {
  const glovoOrders = restaurantProfile.ordering.filter((order) => order.source === 'glovo');
  assert.equal(glovoOrders.length, 1);
  assert.deepEqual(glovoOrders[0]?.label, { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' });
});
