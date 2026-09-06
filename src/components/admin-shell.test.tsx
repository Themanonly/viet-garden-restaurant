import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminShell } from './admin-shell';
import { adminNavigation, getActiveAdminNavigationItem } from './admin-navigation';

test('admin shell renders a titled workspace and semantic navigation', () => {
  const markup = renderToStaticMarkup(<AdminShell title="Categories"><p>Categories workspace</p></AdminShell>);

  assert.match(markup, /<main class="admin-main">/);
  assert.match(markup, /<h1>Categories<\/h1>/);
  assert.match(markup, /aria-label="Admin navigation"/);
});

test('admin navigation exposes exactly five primary destinations', () => {
  assert.deepEqual(adminNavigation.map((item) => item.href), [
    '/admin/status',
    '/admin/categories',
    '/admin/items',
    '/admin/featured',
    '/admin/media',
  ]);
});

test('admin navigation resolves the active destination', () => {
  assert.equal(getActiveAdminNavigationItem('/admin/items')?.label, 'Menu Items');
  assert.equal(getActiveAdminNavigationItem('/unknown'), undefined);
});