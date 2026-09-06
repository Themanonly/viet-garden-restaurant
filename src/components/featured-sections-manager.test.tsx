import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AdminUiCategoryDto, AdminUiError, AdminUiFeaturedSectionDto, AdminUiMenuItemDto } from '../content/admin-menu-ui-adapter';
import {
  addFeaturedItemId,
  confirmFeaturedSectionDeletion,
  FeaturedErrorSummary,
  FeaturedSectionEditor,
  FeaturedSectionList,
  getFeaturedSectionActiveUpdate,
  getFeaturedSectionTitle,
  getFeaturedItemDisplayName,
  getReorderedFeaturedItemIds,
  getReorderedFeaturedSectionIds,
  removeFeaturedItemId,
} from './featured-sections-manager';

type TestSection = AdminUiFeaturedSectionDto;

const item = (id: string, sortOrder: number, active = true): AdminUiMenuItemDto => ({
  id,
  categoryId: 'soupes',
  name: { fr: `Item ${id}`, en: `Item ${id}`, ar: `عنصر ${id}` },
  description: {},
  price: { amount: 10 + sortOrder, currency: 'MAD' },
  sortOrder,
  active,
});

const category: AdminUiCategoryDto = { id: 'soupes', name: { fr: 'Soupes', en: 'Soups', ar: 'الشوربات' }, description: {}, sortOrder: 0, active: true };
const section = (id: string, sortOrder: number, itemIds = ['one', 'two']): TestSection => ({ id, title: { fr: `Titre ${id}`, en: `Title ${id}`, ar: `عنوان ${id}` }, description: { fr: 'Description', en: 'Description', ar: 'وصف' }, itemIds, sortOrder, active: true });

const error = (fields: { path: string; message: string }[]): AdminUiError => Object.assign(new Error('Featured validation failed'), { info: { code: 'invalid-menu', message: 'Featured validation failed', resource: 'featured-section', fields } }) as AdminUiError;

test('Featured helpers preserve localized labels, active state, and section order', () => {
  const sections = [section('one', 0), section('two', 1)];
  assert.equal(getFeaturedSectionTitle({ id: 'ar-only', title: { ar: 'الأكثر مبيعًا' } }), 'الأكثر مبيعًا');
  assert.equal(getFeaturedItemDisplayName(item('one', 0)), 'Item one');
  assert.deepEqual(getReorderedFeaturedSectionIds(sections, 1, -1), ['two', 'one']);
  assert.equal(getReorderedFeaturedSectionIds(sections, 0, -1), null);
  assert.deepEqual(getFeaturedSectionActiveUpdate(section('one', 0)), { active: false });
});

test('Featured item selection adds, removes, and reorders stable IDs without duplication', () => {
  assert.deepEqual(addFeaturedItemId(['one'], 'two'), ['one', 'two']);
  assert.deepEqual(addFeaturedItemId(['one'], 'one'), ['one']);
  assert.deepEqual(removeFeaturedItemId(['one', 'two', 'three'], 1), ['one', 'three']);
  assert.deepEqual(getReorderedFeaturedItemIds(['one', 'two', 'three'], 1, 1), ['one', 'three', 'two']);
  assert.equal(getReorderedFeaturedItemIds(['one'], 0, 1), null);
});

test('Featured list renders localized visibility, selected count, controls, and long labels', () => {
  const longArabic = 'عنوان عربي طويل جدًا لاختبار تخطيط قسم المنتجات المميزة';
  const markup = renderToStaticMarkup(<FeaturedSectionList sections={[{ ...section('long', 0), title: { fr: 'Titre tres long pour la gestion', en: 'Long featured title', ar: longArabic }, itemIds: ['one', 'two', 'three'] }]} managerState="ready" onMove={() => undefined} onEdit={() => undefined} onDelete={() => undefined} onToggle={() => undefined} />);
  assert.match(markup, /Long featured title/);
  assert.match(markup, /3 selected items/);
  assert.match(markup, /Deactivate/);
  assert.match(markup, /Move Titre tres long pour la gestion up/);
  assert.match(markup, new RegExp(longArabic));
});

test('Featured editor exposes FR, EN, AR, ordering, active state, and item details', () => {
  const draft = { id: 'section', title: { fr: 'Top des ventes', en: 'Best Sellers', ar: 'الأكثر مبيعًا' }, description: { fr: '', en: '', ar: '' }, itemIds: ['one'], sortOrder: 0, active: true };
  const markup = renderToStaticMarkup(<FeaturedSectionEditor draft={draft} editingId="section" items={[item('one', 0), item('two', 1, false)]} categories={[category]} state="ready" errors={{}} onChange={() => undefined} onCancel={() => undefined} onSave={() => undefined} />);
  assert.match(markup, /id="title-fr"/);
  assert.match(markup, /id="title-en"/);
  assert.match(markup, /id="title-ar"/);
  assert.match(markup, /Sort order/);
  assert.match(markup, /Item two - 11\.00 MAD/);
  assert.match(markup, /Remove/);
  assert.match(markup, /Select an item/);
});

test('Featured validation renders structured field errors and deletion requires confirmation', () => {
  const validation = renderToStaticMarkup(<FeaturedErrorSummary error={error([{ path: 'title.fr', message: 'French title is required.' }, { path: 'itemIds', message: 'Featured item does not exist.' }])} />);
  assert.match(validation, /title\.fr/);
  assert.match(validation, /itemIds/);
  const sectionToDelete = section('delete-me', 0);
  assert.equal(confirmFeaturedSectionDeletion(sectionToDelete, () => false), false);
  assert.equal(confirmFeaturedSectionDeletion(sectionToDelete, (message) => message.includes('delete-me')), true);
});
