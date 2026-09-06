import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { defaultBrandLogoMediaId, FileBrandSettingsRepository } from './brand-settings';

test('brand logo setting defaults and persists through fresh repositories', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-brand-settings-'));
  const filePath = path.join(directory, 'brand-settings.json');
  try {
    const first = new FileBrandSettingsRepository(filePath);
    assert.equal(await first.getBrandLogoMediaId(), defaultBrandLogoMediaId);
    await first.setBrandLogoMediaId('existing-image');
    assert.equal(await new FileBrandSettingsRepository(filePath).getBrandLogoMediaId(), 'existing-image');
    assert.match(await readFile(filePath, 'utf8'), /existing-image/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
