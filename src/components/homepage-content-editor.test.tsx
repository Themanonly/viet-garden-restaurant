import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomepageContentEditor, getHomepageFieldErrors, homepageEditorFields } from './homepage-content-editor';
import { defaultHomepageContent } from '../content/site-settings';

const actions = { readAdminHomepageContent: async () => ({ ok: true as const, value: defaultHomepageContent }), saveAdminHomepageContent: async () => ({ ok: true as const, value: defaultHomepageContent }) };

test('homepage editor exposes all localized fields and hides technical data', () => {
  const markup = renderToStaticMarkup(<HomepageContentEditor serverActions={actions} />);
  assert.deepEqual(homepageEditorFields, ['heroEyebrow', 'heroStatement', 'identityEyebrow', 'identityTitle']);
  assert.match(markup, /Loading homepage content/);
  assert.doesNotMatch(markup, /homepage_content|JSON|setting key/);
});

test('homepage editor maps structured field and language validation paths', () => {
  const error = Object.assign(new Error('Homepage validation failed'), { info: { fields: [{ path: 'homepageContent.heroEyebrow.fr', message: 'FR required' }, { path: 'homepageContent.identityTitle.ar', message: 'AR required' }] } });
  assert.deepEqual(getHomepageFieldErrors(error as never), { 'heroEyebrow.fr': ['FR required'], 'identityTitle.ar': ['AR required'] });
});
