import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { mediaCatalog } from './media';
import { createPersistentMediaRepository, MediaPersistenceError } from './media-repository';

test('persistent Media repository seeds the complete canonical catalog', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-seed-'));
  const filePath = path.join(directory, 'media-state.json');
  try {
    const repository = createPersistentMediaRepository(filePath);
    const assets = await repository.listMedia();
    assert.equal(assets.length, mediaCatalog.length);
    assert.deepEqual(assets.map((asset) => asset.id), mediaCatalog.map((asset) => asset.id));
    assert.deepEqual(assets.map((asset) => asset.reference), mediaCatalog.map((asset) => asset.reference));
    assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')), mediaCatalog);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Media mutations survive fresh repository instances, replacement, and deletion', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-fresh-'));
  const filePath = path.join(directory, 'media-state.json');
  const temporary = { id: 'media-persistence-temp', type: 'image' as const, source: 'remote' as const, reference: 'https://example.test/original.jpg', alt: { fr: 'Temporary media', en: 'Temporary media', ar: 'وسائط مؤقتة' }, visible: true, sortOrder: 999 };
  try {
    const first = createPersistentMediaRepository(filePath);
    await first.registerMedia(temporary);
    assert.equal((await createPersistentMediaRepository(filePath).getMedia(temporary.id))?.reference, temporary.reference);
    await createPersistentMediaRepository(filePath).replaceMedia(temporary.id, { ...temporary, reference: 'https://example.test/replaced.jpg' });
    const replaced = await createPersistentMediaRepository(filePath).getMedia(temporary.id);
    assert.equal(replaced?.id, temporary.id);
    assert.equal(replaced?.reference, 'https://example.test/replaced.jpg');
    await createPersistentMediaRepository(filePath).removeMedia(temporary.id);
    assert.equal(await createPersistentMediaRepository(filePath).getMedia(temporary.id), undefined);
    assert.equal((await createPersistentMediaRepository(filePath).listMedia()).length, mediaCatalog.length);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Media mutation survives a separate Node process', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-restart-'));
  const filePath = path.join(directory, 'media-state.json');
  const scriptPath = path.join(directory, 'media-child.ts');
  const modulePath = pathToFileURL(path.resolve('src/content/media-repository.ts')).href;
  const temporary = { id: 'media-process-restart-temp', type: 'image', source: 'local', reference: '/media/restart-temp.jpg', alt: { fr: 'Restart test' }, visible: true, sortOrder: 998 };
  const script = `(async () => { const { createPersistentMediaRepository } = await import(process.argv[2]); const repository = createPersistentMediaRepository(process.env.VIET_GARDEN_MEDIA_STATE_PATH); if (process.argv[3] === 'write') await repository.registerMedia(${JSON.stringify(temporary)}); else process.stdout.write(JSON.stringify(await repository.getMedia('media-process-restart-temp'))); })();`;
  try {
    await writeFile(scriptPath, script, 'utf8');
    const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
    const write = spawnSync(process.execPath, [tsxCli, scriptPath, modulePath, 'write'], { cwd: path.resolve('.'), env: { ...process.env, VIET_GARDEN_MEDIA_STATE_PATH: filePath }, encoding: 'utf8' });
    assert.equal(write.status, 0, write.stderr);
    const read = spawnSync(process.execPath, [tsxCli, scriptPath, modulePath, 'read'], { cwd: path.resolve('.'), env: { ...process.env, VIET_GARDEN_MEDIA_STATE_PATH: filePath }, encoding: 'utf8' });
    assert.equal(read.status, 0, read.stderr);
    assert.equal(JSON.parse(read.stdout).reference, temporary.reference);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid persisted Media state is rejected without being overwritten', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-invalid-'));
  const filePath = path.join(directory, 'media-state.json');
  try {
    await writeFile(filePath, JSON.stringify([{ id: 'broken', type: 'image', source: 'remote', reference: '', alt: {}, visible: true, sortOrder: 0 }]), 'utf8');
    await assert.rejects(() => createPersistentMediaRepository(filePath).listMedia(), (error: unknown) => error instanceof MediaPersistenceError && error.code === 'invalid-persisted-media');
    assert.match(await readFile(filePath, 'utf8'), /"broken"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
