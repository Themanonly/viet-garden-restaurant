import assert from 'node:assert/strict';
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPersistentMediaRepository } from './media-repository';
import { validateUploadedMedia } from './media-upload-storage';

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 1]);
const alt = { fr: 'Upload test', en: 'Upload test', ar: 'اختبار الرفع' };

test('upload validation accepts supported signatures and rejects unsafe types', () => {
  assert.equal(validateUploadedMedia(png, 'image', 'png').extension, 'png');
  assert.equal(validateUploadedMedia(mp4, 'video', 'mp4').type, 'video');
  assert.throws(() => validateUploadedMedia(new Uint8Array([1, 2, 3]), 'image', 'png'), /content does not match/);
  assert.throws(() => validateUploadedMedia(png, 'image', 'svg'), /Unsupported/);
});

test('uploaded binaries persist, replace by stable ID, and delete with metadata', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-upload-boundary-'));
  const mediaPath = path.join(directory, 'media-state.json');
  const uploadPath = path.join(directory, 'uploads');
  const previousUploadDir = process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
  process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = uploadPath;
  try {
    const repository = createPersistentMediaRepository(mediaPath);
    const created = await repository.registerUploadedMedia!({ id: 'upload-test', type: 'image', source: 'local', reference: '', alt, visible: true, sortOrder: 999 }, validateUploadedMedia(png, 'image', 'png'));
    assert.match(created.reference, /^\/media\/uploads\/[a-f0-9-]+\.png$/);
    assert.equal(created.storageKey?.includes('..'), false);
    await access(path.join(uploadPath, created.storageKey!));
    const replaced = await repository.replaceUploadedMedia!(created.id, { type: 'video', source: 'local', alt, visible: true, sortOrder: 999 }, validateUploadedMedia(mp4, 'video', 'mp4'));
    assert.equal(replaced.id, created.id);
    assert.equal(replaced.type, 'video');
    assert.notEqual(replaced.storageKey, created.storageKey);
    await assert.rejects(() => access(path.join(uploadPath, created.storageKey!)));
    await access(path.join(uploadPath, replaced.storageKey!));
    await repository.removeMedia(replaced.id);
    await assert.rejects(() => access(path.join(uploadPath, replaced.storageKey!)));
    assert.equal((await repository.listMedia()).some((asset) => asset.id === 'upload-test'), false);
  } finally {
    if (previousUploadDir === undefined) delete process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
    else process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = previousUploadDir;
    await rm(directory, { recursive: true, force: true });
  }
});

test('metadata failure cleans up the newly written upload', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-upload-cleanup-'));
  const mediaPath = path.join(directory, 'media-state.json');
  const uploadPath = path.join(directory, 'uploads');
  const previousUploadDir = process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
  process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = uploadPath;
  try {
    const repository = createPersistentMediaRepository(mediaPath);
    await assert.rejects(() => repository.registerUploadedMedia!({ id: 'invalid-upload', type: 'image', source: 'local', reference: '', alt: {}, visible: true, sortOrder: 1 }, validateUploadedMedia(png, 'image', 'png')));
    assert.deepEqual(await readdir(uploadPath).catch(() => []), []);
    assert.equal((await repository.listMedia()).some((asset) => asset.id === 'invalid-upload'), false);
  } finally {
    if (previousUploadDir === undefined) delete process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
    else process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = previousUploadDir;
    await rm(directory, { recursive: true, force: true });
  }
});
