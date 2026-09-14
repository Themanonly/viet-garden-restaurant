import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultHomepageContent, homepageContentSettingKey, SupabaseSiteSettingsRepository } from './site-settings';
import type { SupabaseDatabaseClient } from './supabase-database';

class FakeSettingsDatabase implements SupabaseDatabaseClient {
  rows: { key: string; value: string }[] = [];
  async select<T>(): Promise<T[]> { return this.rows as T[]; }
  async insert<T>(): Promise<T[]> { return []; }
  async update<T>(): Promise<T[]> { return []; }
  async remove<T>(): Promise<T[]> { return []; }
  async rpc<T>(): Promise<T> { return undefined as T; }
  async upsert<T>(table: string, rows: unknown[], onConflict: string): Promise<T[]> { assert.equal(table, 'site_settings'); assert.equal(onConflict, 'key'); this.rows = rows as { key: string; value: string }[]; return rows as T[]; }
}

test('Supabase site settings serializes and reads Homepage content while preserving flags', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [{ key: 'site_public_website_enabled', value: 'true' }, { key: 'site_maintenance_mode', value: 'false' }, { key: homepageContentSettingKey, value: JSON.stringify(defaultHomepageContent) }];
  const repository = new SupabaseSiteSettingsRepository(database);
  const content = { ...defaultHomepageContent, heroStatement: { ...defaultHomepageContent.heroStatement, en: 'Managed EN' } };
  await repository.updateSettings({ homepageContent: content });
  assert.equal(JSON.parse(database.rows.find((row) => row.key === homepageContentSettingKey)?.value ?? '{}').heroStatement.en, 'Managed EN');
  assert.deepEqual((await repository.getSettings()).homepageContent, content);
});

test('Supabase missing Homepage content falls back to the safe default', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [{ key: 'site_public_website_enabled', value: 'true' }, { key: 'site_maintenance_mode', value: 'false' }];
  assert.deepEqual((await new SupabaseSiteSettingsRepository(database).getSettings()).homepageContent, defaultHomepageContent);
});

test('Supabase invalid Homepage JSON fails through persistence validation', async () => {
  const database = new FakeSettingsDatabase();
  database.rows = [{ key: homepageContentSettingKey, value: '{bad' }];
  await assert.rejects(new SupabaseSiteSettingsRepository(database).getSettings(), /Persisted homepage content is invalid/);
});
