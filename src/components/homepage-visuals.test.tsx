import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  defaultHomepageVisuals,
  defaultHomepageContent,
  homepageVisualsSettingKey,
  homepageContentSettingKey,
  SupabaseSiteSettingsRepository,
  SiteSettingsService,
  type HomepageVisuals,
} from '../content/site-settings';
import {
  HomepageVisualsForm,
  getMediaDisplayName,
  isHomepageVisualsDirty,
  restoreHomepageVisuals,
  applyHomepageVisualsSave,
  validateHomepageVisuals,
} from './homepage-content-editor';
import type { AdminUiMediaDto } from '../content/admin-menu-ui-adapter';
import type { SupabaseDatabaseClient } from '../content/supabase-database';

const sampleMediaCatalog: AdminUiMediaDto[] = [
  {
    id: 'hero-visual',
    type: 'video',
    source: 'local',
    reference: '/media/viet-garden-hero-hq.mp4',
    alt: { fr: 'Vidéo Hero FR', en: 'Hero Video EN', ar: 'فيديو AR' },
    usageCount: 1,
    visible: true,
    sortOrder: 1,
    referencedBy: [],
  },
  {
    id: 'hero-poster',
    type: 'image',
    source: 'local',
    reference: '/media/viet-garden-hero-poster.jpg',
    alt: { fr: 'Poster Hero FR', en: 'Hero Poster EN', ar: 'ملصق AR' },
    usageCount: 1,
    visible: true,
    sortOrder: 2,
    referencedBy: [],
  },
  {
    id: 'identity-visual',
    type: 'image',
    source: 'local',
    reference: '/media/viet-garden-identity-premium.jpg',
    alt: { fr: 'Image Intro FR', en: 'Intro Image EN', ar: 'صورة AR' },
    usageCount: 1,
    visible: true,
    sortOrder: 3,
    referencedBy: [],
  },
  {
    id: 'extra-image',
    type: 'image',
    source: 'local',
    reference: '/media/extra.jpg',
    alt: { fr: 'Image Extra FR', en: 'Extra Image EN', ar: 'إضافي AR' },
    usageCount: 0,
    visible: true,
    sortOrder: 4,
    referencedBy: [],
  },
];

class FakeSettingsDb implements SupabaseDatabaseClient {
  rows: { key: string; value: string }[] = [];
  async select<T>(): Promise<T[]> { return this.rows as T[]; }
  async insert<T>(): Promise<T[]> { return []; }
  async update<T>(): Promise<T[]> { return []; }
  async remove<T>(): Promise<T[]> { return []; }
  async rpc<T>(): Promise<T> { return undefined as T; }
  async upsert<T>(_table: string, rows: unknown[]): Promise<T[]> {
    const incoming = rows as { key: string; value: string }[];
    for (const item of incoming) {
      const idx = this.rows.findIndex((r) => r.key === item.key);
      if (idx >= 0) this.rows[idx] = item;
      else this.rows.push(item);
    }
    return rows as T[];
  }
}

test('default homepage visual settings provide standard hero visual, poster, and identity media IDs', () => {
  assert.equal(defaultHomepageVisuals.heroVisualMediaId, 'hero-visual');
  assert.equal(defaultHomepageVisuals.heroPosterMediaId, 'hero-poster');
  assert.equal(defaultHomepageVisuals.identityVisualMediaId, 'identity-visual');
});

test('Supabase site settings repository serializes and reads homepage visuals while preserving text content', async () => {
  const db = new FakeSettingsDb();
  db.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
    { key: homepageContentSettingKey, value: JSON.stringify(defaultHomepageContent) },
    { key: homepageVisualsSettingKey, value: JSON.stringify(defaultHomepageVisuals) },
  ];
  const repo = new SupabaseSiteSettingsRepository(db);

  const updatedVisuals: HomepageVisuals = {
    heroVisualMediaId: 'extra-image',
    heroPosterMediaId: 'hero-poster',
    identityVisualMediaId: 'identity-visual',
  };

  await repo.updateSettings({ homepageVisuals: updatedVisuals });

  // 1. Verify homepage_visuals row key stored
  const row = db.rows.find((r) => r.key === homepageVisualsSettingKey);
  assert.ok(row);
  assert.equal(JSON.parse(row.value).heroVisualMediaId, 'extra-image');

  // 2. Verify text content remains unchanged
  const settings = await repo.getSettings();
  assert.deepEqual(settings.homepageContent, defaultHomepageContent);
  assert.deepEqual(settings.homepageVisuals, updatedVisuals);
});

test('text content updates preserve visual settings and visual updates preserve text content', async () => {
  const db = new FakeSettingsDb();
  db.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
    { key: homepageContentSettingKey, value: JSON.stringify(defaultHomepageContent) },
    { key: homepageVisualsSettingKey, value: JSON.stringify(defaultHomepageVisuals) },
  ];
  const repo = new SupabaseSiteSettingsRepository(db);
  const service = new SiteSettingsService(repo);

  // Update text
  const customContent = { ...defaultHomepageContent, heroStatement: { fr: 'Nouveau', en: 'New', ar: 'جديد' } };
  await service.updateSettings({ homepageContent: customContent });
  let current = await service.getSettings();
  assert.deepEqual(current.homepageVisuals, defaultHomepageVisuals);
  assert.equal(current.homepageContent.heroStatement.en, 'New');

  // Update visuals
  const customVisuals = { ...defaultHomepageVisuals, heroVisualMediaId: 'extra-image' };
  await service.updateSettings({ homepageVisuals: customVisuals });
  current = await service.getSettings();
  assert.equal(current.homepageContent.heroStatement.en, 'New');
  assert.equal(current.homepageVisuals.heroVisualMediaId, 'extra-image');
});

test('validateHomepageVisuals rejects video assets assigned to poster or identity image controls', () => {
  const invalidPoster: HomepageVisuals = {
    heroVisualMediaId: 'hero-visual',
    heroPosterMediaId: 'hero-visual',
    identityVisualMediaId: 'identity-visual',
  };
  const errors = validateHomepageVisuals(invalidPoster, sampleMediaCatalog);
  assert.deepEqual(errors.heroPosterMediaId, ['Hero poster must be an image asset.']);

  const validVisuals: HomepageVisuals = {
    heroVisualMediaId: 'hero-visual',
    heroPosterMediaId: 'hero-poster',
    identityVisualMediaId: 'identity-visual',
  };
  assert.deepEqual(validateHomepageVisuals(validVisuals, sampleMediaCatalog), {});
});

test('getMediaDisplayName resolves human readable localized title and avoids exposing raw storage paths', () => {
  const asset = sampleMediaCatalog[0];
  assert.equal(getMediaDisplayName(asset), 'Vidéo Hero FR');
  assert.equal(getMediaDisplayName(undefined), '');
});

test('HomepageVisualsForm renders media choices, human-readable titles, previews, and clean admin UI', () => {
  const markup = renderToStaticMarkup(
    <HomepageVisualsForm
      draft={defaultHomepageVisuals}
      saved={defaultHomepageVisuals}
      mediaList={sampleMediaCatalog}
      state="ready"
      error={null}
      validationErrors={{}}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );

  assert.match(markup, /Homepage visuals/);
  assert.match(markup, /Vidéo Hero FR/);
  assert.match(markup, /Poster Hero FR/);
  assert.match(markup, /Image Intro FR/);
  assert.doesNotMatch(markup, /homepage_visuals|site_settings/);
  assert.match(markup, /Saved/);
  assert.match(markup, /disabled=""/);
});

test('HomepageVisualsForm displays asset unavailable badge when assigned media ID is missing from catalog', () => {
  const missingDraft: HomepageVisuals = {
    heroVisualMediaId: 'deleted-media-id',
    heroPosterMediaId: 'hero-poster',
    identityVisualMediaId: 'identity-visual',
  };

  const markup = renderToStaticMarkup(
    <HomepageVisualsForm
      draft={missingDraft}
      saved={missingDraft}
      mediaList={sampleMediaCatalog}
      state="ready"
      error={null}
      validationErrors={{}}
      onChange={() => undefined}
      onReset={() => undefined}
      onSave={() => undefined}
    />
  );

  assert.match(markup, /Asset unavailable/);
});

test('homepage visuals pure transition helpers detect dirty state, restore on cancel, and update state on save', () => {
  const saved = structuredClone(defaultHomepageVisuals);
  const draft = structuredClone(defaultHomepageVisuals);

  assert.equal(isHomepageVisualsDirty(draft, saved), false);

  draft.heroPosterMediaId = 'extra-image';
  assert.equal(isHomepageVisualsDirty(draft, saved), true);

  const restored = restoreHomepageVisuals(saved);
  assert.deepEqual(restored, saved);
  assert.equal(isHomepageVisualsDirty(restored, saved), false);

  const newSaved = { ...saved, heroPosterMediaId: 'extra-image' };
  const updated = applyHomepageVisualsSave(saved, newSaved);
  assert.deepEqual(updated.saved, newSaved);
  assert.deepEqual(updated.draft, newSaved);
  assert.equal(isHomepageVisualsDirty(updated.draft, updated.saved), false);
});

test('cleared homepage visuals persist as null and remain cleared after reload', async () => {
  const db = new FakeSettingsDb();
  db.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
    { key: homepageContentSettingKey, value: JSON.stringify(defaultHomepageContent) },
    { key: homepageVisualsSettingKey, value: JSON.stringify(defaultHomepageVisuals) },
  ];
  const repo = new SupabaseSiteSettingsRepository(db);

  await repo.updateSettings({
    homepageVisuals: {
      heroVisualMediaId: null,
      heroPosterMediaId: null,
      identityVisualMediaId: null,
    },
  });

  assert.deepEqual((await repo.getSettings()).homepageVisuals, {
    heroVisualMediaId: null,
    heroPosterMediaId: null,
    identityVisualMediaId: null,
  });
});
