import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DestructiveActionDialog } from './destructive-action-dialog';

test('destructive dialog renders contextual title, message, and accessible semantics', () => {
  const markup = renderToStaticMarkup(
    <DestructiveActionDialog
      open
      title="Delete this category?"
      description="This removes the category from the menu and may hide any items that use it."
      warning="This action cannot be undone."
      confirmLabel="Delete category"
      cancelLabel="Cancel"
      onCancel={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  assert.match(markup, /Delete this category\?/);
  assert.match(markup, /This removes the category from the menu/);
  assert.match(markup, /This action cannot be undone\./);
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby/);
  assert.match(markup, /Delete category/);
});

test('dependency-blocked dialog shows the reason and keeps destructive action disabled', () => {
  const markup = renderToStaticMarkup(
    <DestructiveActionDialog
      open
      title="Delete this media asset?"
      description="This asset is still used by menu items and removing it may affect published content."
      dependencyMessage="Deletion is blocked while linked menu items still reference this asset."
      confirmLabel="Delete media"
      cancelLabel="Cancel"
      confirmDisabled
      onCancel={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  assert.match(markup, /Deletion is blocked while linked menu items still reference this asset\./);
  assert.match(markup, /This asset is still used by menu items/);
  assert.match(markup, /disabled/);
});
