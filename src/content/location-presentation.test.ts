import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocationAddressParts, getLocationCountLabel } from './location-presentation';
import type { Location } from './location';

const base: Location = { id: 'location-test', profileId: 'profile-test', name: { fr: 'Nom', en: 'Name', ar: 'الاسم' }, address: { fr: '80 Rue, Rabat 10000', en: '80 Street, Rabat 10000', ar: '80 شارع، الرباط 10000' }, city: 'Rabat', postalCode: '10000', isPrimary: true, enabled: true, sortOrder: 0 };

test('location presentation formats singular and plural counts', () => {
  assert.equal(getLocationCountLabel(1), '1 location');
  assert.equal(getLocationCountLabel(2), '2 locations');
  assert.equal(getLocationCountLabel(0), '0 locations');
});

test('location presentation does not duplicate complete city and postal metadata', () => {
  assert.equal(getLocationAddressParts(base, 'en').meta, undefined);
  assert.equal(getLocationAddressParts({ ...base, address: { fr: '80 Rue', en: '80 Street', ar: '80 شارع' } }, 'en').meta, 'Rabat 10000');
  assert.equal(getLocationAddressParts(base, 'ar').meta, undefined);
});