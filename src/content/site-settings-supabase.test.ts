import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultHomepageContent, homepageContentSettingKey, SupabaseSiteSettingsRepository } from './site-settings';
import type { SupabaseDatabaseClient } from './supabase-database';

class FakeSettingsDatabase implements SupabaseDatabaseClient {
  rows: { key: string; value: string }[] = [];
  failUpsert = false;

  async select<T>(): Promise<T[]> {
    return this.rows as T[];
  }
  async insert<T>(): Promise<T[]> {
    return [];
  }
  async update<T>(): Promise<T[]> {
    return [];
  }
  async remove<T>(): Promise<T[]> {
    return [];
  }
  async rpc<T>(): Promise<T> {
    return undefined as T;
  }
  async upsert<T>(table: string, rows: unknown[], onConflict: string): Promise<T[]> {
    assert.equal(table, 'site_settings');
    assert.equal(onConflict, 'key');
    if (this.failUpsert) {
      throw new Error('simulated upsert failure');
    }
    const incoming = rows as { key: string; value: string }[];
    for (const item of incoming) {
      const idx = this.rows.findIndex((r) => r.key === item.key);
      if (idx >= 0) {
        this.rows[idx] = item;
      } else {
        this.rows.push(item);
      }
    }
    return rows as T[];
  }
}

test('Supabase site settings serializes and reads Homepage content while preserving flags and exact stable keys', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
    { key: homepageContentSettingKey, value: JSON.stringify(defaultHomepageContent) },
  ];

  const repository = new SupabaseSiteSettingsRepository(database);
  const customContent = {
    heroEyebrow: { fr: 'HeEy FR', en: 'HeEy EN', ar: 'HeEy AR' },
    heroStatement: { fr: 'HeSt FR', en: 'HeSt EN', ar: 'HeSt AR' },
    identityEyebrow: { fr: 'IdEy FR', en: 'IdEy EN', ar: 'IdEy AR' },
    identityTitle: { fr: 'IdTi FR', en: 'IdTi EN', ar: 'IdTi AR' },
  };

  await repository.updateSettings({ homepageContent: customContent });

  // 1. Verify stable row key
  assert.equal(homepageContentSettingKey, 'homepage_content', 'Stable row key must be homepage_content');
  const targetRow = database.rows.find((row) => row.key === homepageContentSettingKey);
  assert.ok(targetRow, 'Row with homepage_content key must exist in database');

  // 2. Verify all FR, EN, AR values serialized for all four fields
  const parsedSerialized = JSON.parse(targetRow.value);
  assert.deepEqual(parsedSerialized.heroEyebrow, { fr: 'HeEy FR', en: 'HeEy EN', ar: 'HeEy AR' });
  assert.deepEqual(parsedSerialized.heroStatement, { fr: 'HeSt FR', en: 'HeSt EN', ar: 'HeSt AR' });
  assert.deepEqual(parsedSerialized.identityEyebrow, { fr: 'IdEy FR', en: 'IdEy EN', ar: 'IdEy AR' });
  assert.deepEqual(parsedSerialized.identityTitle, { fr: 'IdTi FR', en: 'IdTi EN', ar: 'IdTi AR' });

  // 3. Verify website-enabled and maintenance mode flags remain intact and unchanged
  assert.equal(database.rows.find((r) => r.key === 'site_public_website_enabled')?.value, 'true');
  assert.equal(database.rows.find((r) => r.key === 'site_maintenance_mode')?.value, 'false');

  // 4. Verify roundtrip read settings returns updated content
  const updatedSettings = await repository.getSettings();
  assert.deepEqual(updatedSettings.homepageContent, customContent);
  assert.equal(updatedSettings.publicWebsiteEnabled, true);
  assert.equal(updatedSettings.maintenanceMode, false);
});

test('Supabase missing Homepage content falls back to the safe default', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
  ];
  assert.deepEqual((await new SupabaseSiteSettingsRepository(database).getSettings()).homepageContent, defaultHomepageContent);
});

test('Supabase invalid Homepage JSON fails through persistence validation', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [{ key: homepageContentSettingKey, value: '{bad' }];
  await assert.rejects(new SupabaseSiteSettingsRepository(database).getSettings(), /Persisted homepage content is invalid/);
});

test('Supabase structurally invalid Homepage content rejects missing localized values', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
    { key: homepageContentSettingKey, value: JSON.stringify({ ...defaultHomepageContent, identityTitle: { ...defaultHomepageContent.identityTitle, ar: '' } }) },
  ];
  await assert.rejects(new SupabaseSiteSettingsRepository(database).getSettings(), /Homepage content field identityTitle/);
});

test('Supabase failed Homepage update preserves the previously readable state', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [
    { key: 'site_public_website_enabled', value: 'true' },
    { key: 'site_maintenance_mode', value: 'false' },
    { key: homepageContentSettingKey, value: JSON.stringify(defaultHomepageContent) },
  ];
  database.failUpsert = true;

  await assert.rejects(
    new SupabaseSiteSettingsRepository(database).updateSettings({
      homepageContent: { ...defaultHomepageContent, heroStatement: { ...defaultHomepageContent.heroStatement, en: 'Failed update' } },
    }),
    /simulated upsert failure/
  );

  const currentSettings = await new SupabaseSiteSettingsRepository({ ...database, select: database.select.bind(database) } as unknown as SupabaseDatabaseClient).getSettings();
  assert.equal(currentSettings.homepageContent.heroStatement.en, defaultHomepageContent.heroStatement.en);
});
