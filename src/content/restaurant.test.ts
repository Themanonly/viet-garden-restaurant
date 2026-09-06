import assert from 'node:assert/strict';
import test from 'node:test';
import { localizedPathname } from './restaurant';

test('localized pathname preserves equivalent routes and hashes', () => {
  assert.equal(localizedPathname('en', '/fr'), '/en');
  assert.equal(localizedPathname('ar', '/en/menu', '#menu-category-salades'), '/ar/menu#menu-category-salades');
  assert.equal(localizedPathname('fr', '/ar/menu', '#menu-category-soupes'), '/fr/menu#menu-category-soupes');
});
