import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminShell } from './admin-shell';
import { adminNavigation, adminNavigationGroups, getActiveAdminNavigationItem } from './admin-navigation';

test('admin shell renders a titled operations shell and semantic navigation', () => {
  const markup = renderToStaticMarkup(<AdminShell title="Categories"><p>Categories shell</p></AdminShell>);

  assert.match(markup, /<main class="admin-main">/);
  assert.match(markup, /<h1>Categories<\/h1>/);
  assert.match(markup, /aria-label="Admin navigation"/);
  assert.match(markup, /aria-label="Business admin"/);
});

test('admin navigation exposes the admin destinations grouped by area', () => {
  assert.deepEqual(adminNavigation.map((item) => item.href), [
    '/admin/business',
    '/admin/status',
    '/admin/contact',
    '/admin/contact',
    '/admin/categories',
    '/admin/items',
    '/admin/featured',
    '/admin/promotions',
    '/admin/media',
  ]);
  assert.deepEqual(adminNavigationGroups.map((group) => group.label), ['Business', 'Menu', 'Content', 'Media']);
});

test('admin navigation resolves the active destination and preserves route compatibility', () => {
  assert.equal(getActiveAdminNavigationItem('/admin/items')?.label, 'Menu Items');
  assert.equal(getActiveAdminNavigationItem('/admin/status')?.label, 'Hours & Status');
  assert.equal(getActiveAdminNavigationItem('/unknown'), undefined);
});