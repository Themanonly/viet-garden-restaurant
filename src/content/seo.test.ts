import assert from 'node:assert/strict';
import test from 'node:test';
import { getRestaurantJsonLd, getSeoMetadata } from './seo';
import { restaurantProfile } from './restaurant';

test('public business metadata uses the stored localized profile values', () => {
  const profile = structuredClone(restaurantProfile);
  profile.name = { fr: 'Restaurant test', en: 'Test restaurant', ar: 'مطعم تجريبي' };
  profile.description = { fr: 'Description test', en: 'Test description', ar: 'وصف تجريبي' };
  profile.address = { fr: 'Adresse test', en: 'Test address', ar: 'عنوان تجريبي' };
  profile.city = 'Rabat';
  profile.postalCode = '10000';

  assert.equal(getSeoMetadata('en', 'home', profile).title.en, 'Test restaurant');
  assert.equal(getSeoMetadata('en', 'home', profile).description.en, 'Test description');

  const jsonLd = getRestaurantJsonLd('en', profile) as { name: string; description: string; address: { streetAddress: string; addressLocality: string; postalCode: string } };
  assert.equal(jsonLd.name, 'Test restaurant');
  assert.equal(jsonLd.description, 'Test description');
  assert.equal(jsonLd.address.streetAddress, 'Test address');
  assert.equal(jsonLd.address.addressLocality, 'Rabat');
  assert.equal(jsonLd.address.postalCode, '10000');
});