import assert from 'node:assert/strict';
import test from 'node:test';
import { getHomepageBusinessCopy } from '../app/[locale]/page';
import { homepageHero, restaurantProfile } from './restaurant';

test('homepage keeps the short hero promise separate from editable business content', () => {
  const profile = structuredClone(restaurantProfile);
  profile.name = { fr: 'Restaurant test', en: 'Test restaurant', ar: 'مطعم تجريبي' };
  profile.description = { fr: 'A propos test', en: 'About test', ar: 'نبذة تجريبية' };
  profile.address = { fr: 'Adresse test', en: 'Test address', ar: 'عنوان تجريبي' };

  const copy = getHomepageBusinessCopy(profile, 'en');
  assert.equal(copy.heroName, 'Test restaurant');
  assert.equal(copy.heroStatement, homepageHero.statement.en);
  assert.notEqual(copy.heroStatement, copy.about);
  assert.equal(copy.about, 'About test');
  assert.equal(copy.address, 'Test address');
});