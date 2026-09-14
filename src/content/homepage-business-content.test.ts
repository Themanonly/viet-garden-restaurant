import assert from 'node:assert/strict';
import test from 'node:test';
import { getHomepageBusinessCopy } from '../app/[locale]/page';
import { restaurantProfile } from './restaurant';
import { defaultHomepageContent, type HomepageContent } from './site-settings';

test('homepage keeps the short hero promise separate from editable business content', () => {
  const profile = structuredClone(restaurantProfile);
  profile.name = { fr: 'Restaurant test', en: 'Test restaurant', ar: 'مطعم تجريبي' };
  profile.description = { fr: 'A propos test', en: 'About test', ar: 'نبذة تجريبية' };
  profile.address = { fr: 'Adresse test', en: 'Test address', ar: 'عنوان تجريبي' };

  const copy = getHomepageBusinessCopy(profile, 'en');
  assert.equal(copy.heroName, 'Test restaurant');
  assert.equal(copy.heroStatement, defaultHomepageContent.heroStatement.en);
  assert.notEqual(copy.heroStatement, copy.about);
  assert.equal(copy.about, 'About test');
  assert.equal(copy.address, 'Test address');
});

test('homepage resolves custom managed FR, EN, and AR marketing content without changing profile ownership', () => {
  const profile = structuredClone(restaurantProfile);
  profile.name = { fr: 'Nom FR', en: 'Name EN', ar: 'اسم AR' };
  profile.description = { fr: 'About FR', en: 'About EN', ar: 'نبذة AR' };
  profile.address = { fr: 'Adresse FR', en: 'Address EN', ar: 'عنوان AR' };

  const customContent: HomepageContent = {
    heroEyebrow: { fr: 'Hero eyebrow FR', en: 'Hero eyebrow EN', ar: 'عنوان فرعي بطل AR' },
    heroStatement: { fr: 'Hero statement FR', en: 'Hero statement EN', ar: 'بيان بطل AR' },
    identityEyebrow: { fr: 'Intro eyebrow FR', en: 'Intro eyebrow EN', ar: 'عنوان فرعي مقدمة AR' },
    identityTitle: { fr: 'Intro title FR', en: 'Intro title EN', ar: 'عنوان مقدمة AR' },
  };

  // Test FR resolution
  const frCopy = getHomepageBusinessCopy(profile, 'fr', customContent);
  assert.equal(frCopy.heroName, 'Nom FR', 'Business name comes from Restaurant Profile');
  assert.equal(frCopy.heroEyebrow, 'Hero eyebrow FR', 'Hero eyebrow resolves custom FR value');
  assert.equal(frCopy.heroStatement, 'Hero statement FR', 'Hero statement resolves custom FR value');
  assert.equal(frCopy.identityEyebrow, 'Intro eyebrow FR', 'Intro eyebrow resolves custom FR value');
  assert.equal(frCopy.identityTitle, 'Intro title FR', 'Intro title resolves custom FR value');
  assert.equal(frCopy.about, 'About FR', 'About text comes from Restaurant Profile description');
  assert.equal(frCopy.address, 'Adresse FR', 'Address comes from Restaurant Profile address');

  // Test EN resolution
  const enCopy = getHomepageBusinessCopy(profile, 'en', customContent);
  assert.equal(enCopy.heroName, 'Name EN', 'Business name comes from Restaurant Profile');
  assert.equal(enCopy.heroEyebrow, 'Hero eyebrow EN', 'Hero eyebrow resolves custom EN value');
  assert.equal(enCopy.heroStatement, 'Hero statement EN', 'Hero statement resolves custom EN value');
  assert.equal(enCopy.identityEyebrow, 'Intro eyebrow EN', 'Intro eyebrow resolves custom EN value');
  assert.equal(enCopy.identityTitle, 'Intro title EN', 'Intro title resolves custom EN value');
  assert.equal(enCopy.about, 'About EN', 'About text comes from Restaurant Profile description');

  // Test AR resolution
  const arCopy = getHomepageBusinessCopy(profile, 'ar', customContent);
  assert.equal(arCopy.heroName, 'اسم AR', 'Business name comes from Restaurant Profile');
  assert.equal(arCopy.heroEyebrow, 'عنوان فرعي بطل AR', 'Hero eyebrow resolves custom AR value');
  assert.equal(arCopy.heroStatement, 'بيان بطل AR', 'Hero statement resolves custom AR value');
  assert.equal(arCopy.identityEyebrow, 'عنوان فرعي مقدمة AR', 'Intro eyebrow resolves custom AR value');
  assert.equal(arCopy.identityTitle, 'عنوان مقدمة AR', 'Intro title resolves custom AR value');
  assert.equal(arCopy.about, 'نبذة AR', 'About text comes from Restaurant Profile description');
});

test('homepage falls back to managed defaults only when custom content is unavailable', () => {
  const profile = structuredClone(restaurantProfile);

  // When content param is omitted / undefined
  const defaultCopy = getHomepageBusinessCopy(profile, 'en');
  assert.equal(defaultCopy.heroEyebrow, defaultHomepageContent.heroEyebrow.en);
  assert.equal(defaultCopy.heroStatement, defaultHomepageContent.heroStatement.en);
  assert.equal(defaultCopy.identityEyebrow, defaultHomepageContent.identityEyebrow.en);
  assert.equal(defaultCopy.identityTitle, defaultHomepageContent.identityTitle.en);
});