import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomepageContentForm, HomepageContentEditor, applyHomepageSave, getHomepageFieldErrors, homepageEditorFields, isHomepageContentDirty, restoreHomepageContent } from './homepage-content-editor';
import { defaultHomepageContent, type HomepageContent } from '../content/site-settings';

const actions = {
  readAdminHomepageContent: async () => ({ ok: true as const, value: defaultHomepageContent }),
  saveAdminHomepageContent: async () => ({ ok: true as const, value: defaultHomepageContent }),
};

function createSampleContent(): HomepageContent {
  return structuredClone(defaultHomepageContent);
}

test('homepage editor exposes all localized fields and hides technical data', () => {
  const markup = renderToStaticMarkup(<HomepageContentEditor serverActions={actions} />);
  assert.deepEqual(homepageEditorFields, ['heroEyebrow', 'heroStatement', 'identityEyebrow', 'identityTitle']);
  assert.match(markup, /Loading homepage content/);
  assert.doesNotMatch(markup, /homepage_content|JSON|setting key/);
});

test('homepage editor maps structured field and language validation paths', () => {
  const error = Object.assign(new Error('Homepage validation failed'), {
    info: {
      fields: [
        { path: 'homepageContent.heroEyebrow.fr', message: 'Hero eyebrow FR required' },
        { path: 'homepageContent.identityTitle.ar', message: 'Identity title AR required' },
      ],
    },
  });
  assert.deepEqual(getHomepageFieldErrors(error as never), {
    'heroEyebrow.fr': ['Hero eyebrow FR required'],
    'identityTitle.ar': ['Identity title AR required'],
  });
});

test('homepage form renders all twelve localized textareas with RTL for Arabic fields', () => {
  const content = createSampleContent();
  const markup = renderToStaticMarkup(
    <HomepageContentForm
      draft={content}
      saved={content}
      state="ready"
      error={null}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );
  // Verify 4 localized field groups x 3 languages = 12 textareas
  const textareaMatches = markup.match(/<textarea/g) ?? [];
  assert.equal(textareaMatches.length, 12, 'Must render exactly 12 textareas for FR, EN, AR');

  // Verify 4 Arabic fields render dir="rtl"
  const rtlMatches = markup.match(/dir="rtl"/g) ?? [];
  assert.equal(rtlMatches.length, 4, 'Must render exactly 4 Arabic textareas with dir="rtl"');

  // Verify no technical raw JSON or setting key is exposed
  assert.doesNotMatch(markup, /site_homepage_content|homepage_content|\{[\s\S]*\}/);
});

test('homepage form renders saved state with Save and Cancel buttons disabled when clean', () => {
  const content = createSampleContent();
  const markup = renderToStaticMarkup(
    <HomepageContentForm
      draft={content}
      saved={content}
      state="ready"
      error={null}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );
  assert.match(markup, /Saved/);
  assert.match(markup, /disabled=""/);
});

test('homepage form renders dirty state with Unsaved changes and enabled action buttons', () => {
  const saved = createSampleContent();
  const draft = createSampleContent();
  draft.heroEyebrow.fr = 'Nouveau texte FR';

  const markup = renderToStaticMarkup(
    <HomepageContentForm
      draft={draft}
      saved={saved}
      state="ready"
      error={null}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );
  assert.match(markup, /Unsaved changes/);
  // Ensure primary Save and text Cancel buttons are not disabled
  assert.doesNotMatch(markup, /Cancel[^>]*disabled/);
  assert.doesNotMatch(markup, /Save changes[^>]*disabled/);
});

test('homepage form renders saving state with disabled actions and Saving indicator', () => {
  const saved = createSampleContent();
  const draft = createSampleContent();
  draft.heroStatement.en = 'Updated statement';

  const markup = renderToStaticMarkup(
    <HomepageContentForm
      draft={draft}
      saved={saved}
      state="saving"
      error={null}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );
  assert.match(markup, /Saving\.\.\./);
  assert.match(markup, /disabled=""/);
});

test('homepage form renders field-specific inline error messages beside target localized fields', () => {
  const content = createSampleContent();
  const error = Object.assign(new Error('Homepage content could not be saved'), {
    info: {
      fields: [
        { path: 'homepageContent.heroEyebrow.fr', message: 'Hero eyebrow FR cannot be empty' },
        { path: 'homepageContent.identityTitle.ar', message: 'Identity title AR is required' },
      ],
    },
  });

  const markup = renderToStaticMarkup(
    <HomepageContentForm
      draft={content}
      saved={content}
      state="error"
      error={error as never}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );
  assert.match(markup, /Save failed/);
  assert.match(markup, /Hero eyebrow FR cannot be empty/);
  assert.match(markup, /Identity title AR is required/);
  assert.match(markup, /Homepage content could not be saved/);
});

test('homepage draft transitions detect changes, restore on cancel, and update on save', () => {
  const saved = createSampleContent();
  const draft = createSampleContent();

  assert.equal(isHomepageContentDirty(draft, saved), false);

  draft.heroStatement.en = 'New custom statement';
  assert.equal(isHomepageContentDirty(draft, saved), true);

  // Restore draft on cancel
  const restored = restoreHomepageContent(saved);
  assert.deepEqual(restored, saved);
  assert.equal(isHomepageContentDirty(restored, saved), false);

  // Apply save updates saved and draft state atomically
  const newPersisted = createSampleContent();
  newPersisted.heroStatement.en = 'New custom statement';
  const updatedState = applyHomepageSave(saved, newPersisted);
  assert.deepEqual(updatedState.saved, newPersisted);
  assert.deepEqual(updatedState.draft, newPersisted);
  assert.equal(isHomepageContentDirty(updatedState.draft, updatedState.saved), false);
});
