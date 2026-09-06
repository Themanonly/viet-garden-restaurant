import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FileMediaPersistenceRepository } from './media-repository';
import { createMediaStorage, LocalMediaStorage, type MediaStorage } from './media-storage';
import { SupabaseMediaStorage } from './supabase-media-storage';
import { validateUploadedMedia } from './media-upload-storage';
import { GET as serveUploadedMedia } from '../app/media/uploads/[filename]/route';

const png = validateUploadedMedia(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]), 'image', 'png');

class MemoryMediaStorage implements MediaStorage {
  readonly provider = 'local' as const;
  private readonly values = new Map<string, Uint8Array>();

  async put(upload: typeof png): Promise<{ storageKey: string; reference: string; source: 'local' | 'remote' }> {
    const storageKey = `memory-${this.values.size}.png`;
    this.values.set(storageKey, upload.bytes);
    return { storageKey, reference: `/media/uploads/${storageKey}`, source: 'local' as const };
  }

  async read(storageKey: string) {
    const bytes = this.values.get(storageKey);
    if (!bytes) throw new Error('missing');
    return { bytes: Buffer.from(bytes), contentType: 'image/png' };
  }

  async delete(storageKey: string) { this.values.delete(storageKey); }
  async exists(storageKey: string) { return this.values.has(storageKey); }
  has(storageKey: string) { return this.values.has(storageKey); }
}

test('application Media repository uses the MediaStorage contract for upload lifecycle', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-storage-contract-'));
  const storage = new MemoryMediaStorage();
  try {
    const repository = new FileMediaPersistenceRepository(path.join(directory, 'media-state.json'), storage);
    const created = await repository.registerUploadedMedia!({ id: 'storage-contract', type: 'image', source: 'local', reference: '', alt: { fr: 'Storage contract' }, visible: true, sortOrder: 999 }, png);
    assert.equal(created.reference, '/media/uploads/memory-0.png');
    assert.equal(created.storageKey, 'memory-0.png');
    assert.equal(storage.has('memory-0.png'), true);
    assert.equal((await repository.getMedia(created.id))?.reference, created.reference);
    await repository.replaceUploadedMedia!(created.id, { type: 'image', source: 'local', alt: created.alt, visible: true, sortOrder: 999 }, png);
    assert.equal((await repository.getMedia(created.id))?.storageKey, 'memory-1.png');
    assert.equal(storage.has('memory-0.png'), false);
    await repository.removeMedia(created.id);
    assert.equal(storage.has('memory-1.png'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('storage provider selection defaults to local and resolves the object provider when configured', () => {
  const previousProvider = process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER;
  const previousProjectUrl = process.env.SUPABASE_URL;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousBucket = process.env.SUPABASE_STORAGE_BUCKET;
  try {
    delete process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER;
    assert.equal(createMediaStorage() instanceof LocalMediaStorage, true);

    process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER = 'object';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_STORAGE_BUCKET;
    assert.throws(() => createMediaStorage(), /Supabase media storage requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET\./);

    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_STORAGE_BUCKET = 'media';
    assert.equal(createMediaStorage() instanceof SupabaseMediaStorage, true);
  } finally {
    if (previousProvider === undefined) delete process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER;
    else process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER = previousProvider;

    if (previousProjectUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousProjectUrl;

    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;

    if (previousBucket === undefined) delete process.env.SUPABASE_STORAGE_BUCKET;
    else process.env.SUPABASE_STORAGE_BUCKET = previousBucket;
  }
});

test('storage records expose keys and public references, never absolute filesystem paths', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-storage-public-'));
  const previous = process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
  process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = directory;
  try {
    const storage = new LocalMediaStorage();
    const stored = await storage.put(png);
    assert.equal(stored.reference.startsWith('/media/uploads/'), true);
    assert.equal(stored.reference.includes(directory), false);
    assert.equal(path.isAbsolute(stored.storageKey), false);
    await storage.delete(stored.storageKey);
  } finally {
    if (previous === undefined) delete process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
    else process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('uploaded media serving reads through the storage abstraction', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-media-route-'));
  const previous = process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
  process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = directory;
  try {
    const stored = await new LocalMediaStorage().put(png);
    const response = await serveUploadedMedia(new Request(`http://example.test/media/uploads/${stored.storageKey}`), { params: Promise.resolve({ filename: stored.storageKey }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal((await response.arrayBuffer()).byteLength, png.bytes.byteLength);
    await new LocalMediaStorage().delete(stored.storageKey);
  } finally {
    if (previous === undefined) delete process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR;
    else process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
