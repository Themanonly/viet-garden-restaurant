import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AdminUiCategoryDto, AdminUiError, AdminUiMediaDto, AdminUiMenuItemDto } from '../content/admin-menu-ui-adapter';
import { confirmMediaDeletion, filterMediaAssets, getMediaActiveUpdate, getMediaAltText, getMediaUsageLabel, MediaEditor, MediaErrorSummary, MediaList } from './media-library-manager';

const category: AdminUiCategoryDto = { id: 'soupes', name: { fr: 'Soupes', en: 'Soups', ar: 'الشوربات' }, description: {}, sortOrder: 0, active: true };
const item: AdminUiMenuItemDto = { id: 'soupes-pho', categoryId: 'soupes', name: { fr: 'Soupe pho', en: 'Pho soup', ar: 'حساء فو' }, description: {}, price: { amount: 75, currency: 'MAD' }, mediaId: 'used-image', sortOrder: 0, active: true };
const asset = (id: string, usageCount: number): AdminUiMediaDto => ({ id, type: 'image', source: 'remote', reference: `https://example.com/${id}-with-a-very-long-reference-path-that-must-wrap-safely.jpg`, alt: { fr: `Asset ${id}`, en: `Asset ${id} EN`, ar: `صورة ${id}` }, visible: true, sortOrder: 1, usageCount, referencedBy: usageCount ? [{ itemId: item.id, categoryId: item.categoryId }] : [] });
const error = (fields: { path: string; message: string }[]): AdminUiError => Object.assign(new Error('Media validation failed'), { info: { code: 'invalid-media', message: 'Media validation failed', resource: 'media', fields } }) as AdminUiError;

const noop = () => undefined;

test('media helpers expose usage, visibility, and explicit confirmation', () => {
  assert.equal(getMediaAltText(asset('used-image', 1)), 'Asset used-image');
  assert.equal(getMediaUsageLabel(asset('unused-image', 0)), 'Unused');
  assert.equal(getMediaUsageLabel(asset('used-image', 1)), '1 menu item');
  assert.deepEqual(getMediaActiveUpdate(asset('used-image', 1)), { visible: false });
  assert.equal(confirmMediaDeletion(asset('unused-image', 0), () => false), false);
  assert.equal(confirmMediaDeletion(asset('unused-image', 0), (message) => message.includes('unused-image')), true);
});

test('media list renders previews, usage names, and blocks referenced deletion', () => {
  const markup = renderToStaticMarkup(<MediaList media={[asset('used-image', 1), asset('unused-image', 0)]} itemById={new Map([[item.id, item]])} categoryById={new Map([[category.id, category]])} managerState="ready" onEdit={noop} onDelete={noop} onToggleVisible={noop} />);
  assert.match(markup, /Soupe pho/);
  assert.match(markup, /Soupes/);
  assert.match(markup, /Not currently used/);
  assert.match(markup, /disabled=""/);
});

test('media filtering keeps the list simple and business-friendly', () => {
  const list = [asset('used-image', 1), asset('unused-image', 0)];
  assert.equal(filterMediaAssets(list, 'used', 'all').length, 1);
  assert.equal(filterMediaAssets(list, '', 'video').length, 0);
  assert.equal(filterMediaAssets(list, 'unused', 'image').length, 1);
});

test('media editor preserves stable ID for replacement and exposes supported fields', () => {
  const current = asset('used-image', 1);
  const draft = { id: current.id, type: current.type, source: current.source, reference: current.reference, alt: current.alt, visible: current.visible, sortOrder: current.sortOrder };
  const markup = renderToStaticMarkup(<MediaEditor draft={draft} editingId={current.id} state="ready" errors={{}} onChange={noop} onCancel={noop} onSave={noop} />);
  assert.match(markup, /Replace media/);
  assert.match(markup, /id="media-id"[^>]*disabled=""/);
  assert.match(markup, /id="media-reference"/);
  assert.match(markup, /id="alt-fr"/);
  assert.match(markup, /id="alt-ar" dir="rtl"/);
  assert.match(markup, /Replac/);
});

test('media registration editor and structured errors remain visible', () => {
  const draft = { id: '', type: 'image' as const, source: 'remote' as const, reference: '', alt: {}, visible: true, sortOrder: 0 };
  const editor = renderToStaticMarkup(<MediaEditor draft={draft} editingId={null} state="ready" errors={{}} onChange={noop} onCancel={noop} onSave={noop} />);
  assert.match(editor, /Register media/);
  assert.match(editor, /Use a local path or remote URL/);
  const summary = renderToStaticMarkup(<MediaErrorSummary error={error([{ path: 'reference', message: 'Reference is required.' }, { path: 'alt.fr', message: 'French alt text is required.' }])} />);
  assert.match(summary, /reference/);
  assert.match(summary, /alt\.fr/);
});
