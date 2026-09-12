import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { defaultSiteSettings, FileSiteSettingsRepository, SiteSettingsService } from './site-settings';

test('site settings default to a public and operational website', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-site-settings-'));
  const filePath = path.join(directory, 'site-settings.json');

  try {
    const repository = new FileSiteSettingsRepository(filePath);
    const settings = await repository.getSettings();
    assert.deepEqual(settings, defaultSiteSettings);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('site settings update persists and stores the current state', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-site-settings-'));
  const filePath = path.join(directory, 'site-settings.json');

  try {
    const repository = new FileSiteSettingsRepository(filePath);
    const updated = await repository.updateSettings({ publicWebsiteEnabled: true, maintenanceMode: true });

    assert.equal(updated.publicWebsiteEnabled, true);
    assert.equal(updated.maintenanceMode, true);
    assert.match(await readFile(filePath, 'utf8'), /"maintenanceMode": true/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('site settings service preserves default values when a partial update is made', async () => {
  const repository = new FileSiteSettingsRepository(path.join(await mkdtemp(path.join(os.tmpdir(), 'viet-garden-site-settings-')), 'site-settings.json'));
  const service = new SiteSettingsService(repository);

  const updated = await service.updateSettings({ maintenanceMode: true });
  assert.equal(updated.publicWebsiteEnabled, true);
  assert.equal(updated.maintenanceMode, true);
});

test('site settings validation blocks impossible state transitions', async () => {
  const repository = new FileSiteSettingsRepository(path.join(await mkdtemp(path.join(os.tmpdir(), 'viet-garden-site-settings-')), 'site-settings.json'));
  const service = new SiteSettingsService(repository);

  await assert.rejects(() => service.updateSettings({ publicWebsiteEnabled: false, maintenanceMode: true }), /Maintenance mode requires the public website to remain enabled/);
});
