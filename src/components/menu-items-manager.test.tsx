import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AdminUiCategoryDto, AdminUiMenuItemDto } from '../content/admin-menu-ui-adapter';
import { getItemDisplayName, getReorderedItemIds, ItemEditor } from './menu-items-manager';

const item = (id: string, sortOrder: number): AdminUiMenuItemDto => ({
  id,
  categoryId: 'soupes',
  name: { fr: `Item ${id}`, en: `Item ${id}`, ar: `عنصر ${id}` },
  description: {},
  price: { amount: 10, currency: 'MAD' },
  sortOrder,
  active: true,
});

test('item list helpers preserve localized fallback and category ordering', () => {
  const items = [item('one', 0), item('two', 1), item('three', 2)];
  assert.equal(getItemDisplayName({ ...items[0], name: { ar: 'الاسم' } }), 'الاسم');
  assert.deepEqual(getReorderedItemIds(items, 1, -1), ['two', 'one', 'three']);
  assert.deepEqual(getReorderedItemIds(items, 1, 1), ['one', 'three', 'two']);
  assert.equal(getReorderedItemIds(items, 0, -1), null);
});

test('long localized item names remain representable as text content', () => {
  const longName = 'اسم عنصر طويل جدًا لاختبار تخطيط قائمة الإدارة';
  assert.equal(getItemDisplayName({ ...item('long', 0), name: { fr: 'Nom exceptionnellement long pour un test administrateur', en: 'Exceptionally long administrative item name', ar: longName } }), 'Nom exceptionnellement long pour un test administrateur');
  assert.match(renderToStaticMarkup(<span>{longName}</span>), /اسم عنصر طويل جدًا/);
});

test('core item editor keeps essential fields prominent and hides raw technical identifiers from the default form', () => {
  const category: AdminUiCategoryDto = { id: 'soups', name: { fr: 'Soupes', en: 'Soups', ar: 'الحساء' }, sortOrder: 0, active: true };
  const markup = renderToStaticMarkup(
    <ItemEditor
      draft={{ id: 'menu-item-abc', categoryId: category.id, name: { fr: 'Soupe pho', en: 'Pho soup', ar: 'حساء فو' }, description: { fr: 'Description', en: 'Description', ar: 'وصف' }, price: { amount: 75, currency: 'MAD' }, active: true, sortOrder: 3 }}
      editingId="menu-item-abc"
      categories={[category]}
      media={[]}
      state="ready"
      errors={{}}
      onChange={() => {}}
      onCancel={() => {}}
      onSave={() => {}}
    />,
  );

  assert.match(markup, /Category/i);
  assert.match(markup, /Price/i);
  assert.match(markup, /Active/i);
  assert.doesNotMatch(markup, /Item ID/i);
  assert.doesNotMatch(markup, /Sort order/i);
});