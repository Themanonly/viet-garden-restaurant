import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminApplicationError } from '../content/admin-menu-service';
import type { AdminUiCategoryDto, AdminUiManagementStateDto } from '../content/admin-menu-ui-adapter';
import { CategoryEditor, CategoryList, confirmCategoryDeletion, createCategoryDraft, getCategoryActiveUpdate, getCategoryFieldErrors, getCategoryItemCounts, getReorderedCategoryIds, saveCategory } from './category-editor';

const categories: AdminUiCategoryDto[] = [
  { id: 'first', name: { fr: 'Premier', en: 'First', ar: 'الأول' }, description: { fr: 'Desc', en: 'Desc', ar: 'وصف' }, sortOrder: 0, active: true },
  { id: 'second', name: { fr: 'Deuxième', en: 'Second', ar: 'الثاني' }, sortOrder: 1, active: false },
];

const state: AdminUiManagementStateDto = {
  availability: { status: 'open', schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, temporaryClosure: { active: false, message: {} }, manualOverride: 'none', statusMessage: {} },
  effectiveStatus: 'open',
  categories,
  items: [{ id: 'item-1', categoryId: 'first', name: { fr: 'Item' }, price: { amount: 10, currency: 'MAD' }, sortOrder: 0, active: true }],
  featuredSections: [],
};

test('category list renders deterministic order, counts, status, and actions', () => {
  const markup = renderToStaticMarkup(<CategoryList categories={categories} itemCounts={getCategoryItemCounts(state)} busy={false} onMove={() => undefined} onEdit={() => undefined} onDelete={() => undefined} onToggle={() => undefined} />);
  assert.ok(markup.indexOf('Premier') < markup.indexOf('Deuxième'));
  assert.match(markup, /1 items/);
  assert.match(markup, /0 items/);
  assert.match(markup, /Active/);
  assert.match(markup, /Inactive/);
  assert.match(markup, /Edit/);
  assert.match(markup, /Delete/);
});

test('category drafts preserve localized names, optional descriptions, and active state', () => {
  const draft = createCategoryDraft();
  assert.deepEqual(draft, { id: '', name: {}, description: {}, active: true });
  const markup = renderToStaticMarkup(<CategoryEditor adapter={{} as never} draft={{ id: 'first', name: categories[0].name, description: categories[0].description ?? {}, active: false }} editingId="first" state="ready" onDraftChange={() => undefined} onCancel={() => undefined} onSaved={() => undefined} onError={() => undefined} />);
  assert.match(markup, /category-name-fr/);
  assert.match(markup, /category-name-en/);
  assert.match(markup, /category-name-ar/);
  assert.match(markup, /category-description-fr/);
  assert.match(markup, /dir="rtl"/);
});

test('create and edit editors use clear context and hide automatic IDs from normal editing', () => {
  const createMarkup = renderToStaticMarkup(<CategoryEditor adapter={{} as never} draft={createCategoryDraft()} editingId={null} state="ready" onDraftChange={() => undefined} onCancel={() => undefined} onSaved={() => undefined} onError={() => undefined} />);
  const editMarkup = renderToStaticMarkup(<CategoryEditor adapter={{} as never} draft={{ id: 'first', name: categories[0].name, description: categories[0].description ?? {}, active: true }} editingId="first" state="ready" onDraftChange={() => undefined} onCancel={() => undefined} onSaved={() => undefined} onError={() => undefined} />);

  assert.match(createMarkup, /Create category/);
  assert.doesNotMatch(createMarkup, /Category ID/);
  assert.match(editMarkup, /Edit category/);
  assert.doesNotMatch(editMarkup, /Category ID/);
});

test('create and edit delegate through the adapter methods', async () => {
  const draft = { id: 'new-category', name: { fr: 'Nouveau', en: 'New', ar: 'جديد' }, description: {}, active: true };
  let created = false;
  let updated = false;
  const adapter = { createCategory: async (input: Omit<typeof draft, 'id'>) => { created = !('id' in input); return categories[0]; }, updateCategory: async (id: string) => { updated = id === 'first'; return categories[0]; } } as never;
  await saveCategory(adapter, draft, null);
  await saveCategory(adapter, { ...draft, id: 'first' }, 'first');
  assert.equal(created, true);
  assert.equal(updated, true);
});

test('structured category field paths are displayed without parsing messages', () => {
  const error = new AdminApplicationError({ code: 'invalid-menu', message: 'Category validation failed', resource: 'category', fields: [{ code: 'missing-translation', message: 'French name required', path: 'name.fr' }, { code: 'missing-translation', message: 'Arabic description invalid', path: 'description.ar' }] });
  assert.deepEqual(getCategoryFieldErrors(error), { 'name.fr': ['French name required'], 'description.ar': ['Arabic description invalid'] });
});

test('category-in-use remains a structured deletion error', () => {
  const error = new AdminApplicationError({ code: 'category-in-use', message: 'Category cannot be deleted while menu items reference it.', resource: 'category' });
  assert.equal(error.info.code, 'category-in-use');
  assert.equal(error.info.resource, 'category');
});

test('activation, deterministic reorder, and destructive confirmation use explicit helpers', () => {
  assert.deepEqual(getCategoryActiveUpdate(categories[1]), { active: true });
  assert.deepEqual(getReorderedCategoryIds(categories, 1, -1), ['second', 'first']);
  assert.equal(getReorderedCategoryIds(categories, 0, -1), null);
  let message = '';
  assert.equal(confirmCategoryDeletion(categories[0], (nextMessage) => { message = nextMessage; return false; }), false);
  assert.match(message, /Delete category/);
});