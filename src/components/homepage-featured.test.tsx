import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FeaturedSection, MenuItem } from '../content/menu';
import type { MediaAsset } from '../content/models';
import { HomepageFeatured } from './homepage-featured';

const section: FeaturedSection = { id: 'best', title: { fr: 'Nos signatures', en: 'Our signatures', ar: 'أطباقنا المميزة' }, description: { en: 'Selected by the kitchen.' }, itemIds: ['pho'], active: true, sortOrder: 0 };
const item: MenuItem = { id: 'pho', categoryId: 'soups', name: { fr: 'Pho', en: 'Pho', ar: 'فو' }, description: { en: 'A fragrant broth.' }, price: { amount: 95, currency: 'MAD' }, mediaId: 'pho-photo', active: true, sortOrder: 0 };
const media: MediaAsset = { id: 'pho-photo', type: 'image', source: 'local', reference: '/media/pho.jpg', alt: { en: 'Pho bowl' }, visible: true, sortOrder: 0 };

test('homepage featured content uses managed section, item, media, price, and locale data', () => {
  const markup = renderToStaticMarkup(<HomepageFeatured section={section} items={[item]} mediaById={new Map([[media.id, media]])} locale="en" />);
  assert.match(markup, /Our signatures/);
  assert.match(markup, /Selected by the kitchen/);
  assert.match(markup, /Pho bowl/);
  assert.match(markup, /A fragrant broth/);
  assert.match(markup, /95/);
  assert.match(markup, /Explore the full menu/);
  assert.match(markup, /href="\/en\/menu"/);
});

test('homepage featured content hides safely without an active section or selected items', () => {
  assert.equal(renderToStaticMarkup(<HomepageFeatured items={[]} mediaById={new Map()} locale="fr" />), '');
  assert.equal(renderToStaticMarkup(<HomepageFeatured section={section} items={[]} mediaById={new Map()} locale="ar" />), '');
});

test('homepage featured content keeps a graceful visual placeholder when media is missing', () => {
  const markup = renderToStaticMarkup(<HomepageFeatured section={section} items={[item]} mediaById={new Map()} locale="ar" />);
  assert.match(markup, /homepage-dish-placeholder/);
  assert.match(markup, /أطباقنا المميزة/);
  assert.doesNotMatch(markup, /src="undefined"/);
});
