import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MediaAsset } from './models';
import { mediaCatalog } from './media';
import { createMediaStorage, type MediaStorage } from './media-storage';
import type { UploadedMediaPayload } from './media-upload-storage';
import { getApplicationDataProvider } from './application-provider';
import { createSupabaseMediaRepository } from './supabase-media-repository';

export interface MediaRepository {
  listMedia(): Promise<MediaAsset[]>;
  getMedia(assetId: string): Promise<MediaAsset | undefined>;
  registerMedia(asset: MediaAsset): Promise<MediaAsset>;
  replaceMedia(assetId: string, replacement: Omit<MediaAsset, 'id'>): Promise<MediaAsset>;
  removeMedia(assetId: string): Promise<void>;
  registerUploadedMedia?(asset: MediaAsset, upload: UploadedMediaPayload): Promise<MediaAsset>;
  replaceUploadedMedia?(assetId: string, replacement: Omit<MediaAsset, 'id' | 'reference' | 'storageKey'>, upload: UploadedMediaPayload): Promise<MediaAsset>;
}

export class MediaRepositoryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'MediaRepositoryError';
  }
}

export class MediaPersistenceError extends MediaRepositoryError {
  constructor(code: 'read-failed' | 'write-failed' | 'invalid-persisted-media', message: string) {
    super(code, message);
    this.name = 'MediaPersistenceError';
  }
}

export function validateMediaAsset(asset: MediaAsset): string[] {
  const errors: string[] = [];
  if (!asset.id.trim()) errors.push('Media assets require a stable ID.');
  if (!asset.reference.trim()) errors.push(`Media asset requires a reference: ${asset.id}.`);
  if (!asset.alt.fr?.trim()) errors.push(`Media asset requires French alt text: ${asset.id}.`);
  if (!Number.isFinite(asset.sortOrder) || asset.sortOrder < 0) errors.push(`Invalid media ordering: ${asset.id}.`);
  return errors;
}

function cloneAsset(asset: MediaAsset): MediaAsset {
  return { ...asset, alt: { ...asset.alt } };
}

function cloneAssets(assets: MediaAsset[]): MediaAsset[] {
  return assets.map(cloneAsset);
}

function validateAssets(assets: MediaAsset[], source: string): MediaAsset[] {
  const errors = assets.flatMap((asset) => validateMediaAsset(asset));
  const ids = new Set<string>();
  assets.forEach((asset) => {
    if (ids.has(asset.id)) errors.push(`Duplicate media asset ID: ${asset.id}.`);
    ids.add(asset.id);
  });
  if (errors.length > 0) {
    throw new MediaPersistenceError('invalid-persisted-media', `Invalid ${source} media state: ${errors.join(' ')}`);
  }
  return cloneAssets(assets);
}

function migrateLegacyBrandLogo(assets: MediaAsset[]): MediaAsset[] {
  return assets.map((asset) => asset.id === 'brand-logo' && asset.reference === '/media/brand-logo.svg'
    ? { ...asset, reference: '/media/viet-garden-logo.png', source: 'brand' }
    : asset);
}

const defaultMediaStatePath = process.env.VIET_GARDEN_MEDIA_STATE_PATH
  ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'media-state.json');
const operationQueues = new Map<string, Promise<unknown>>();
const lockedPaths = new Set<string>();

async function enqueue<T>(filePath: string, action: () => Promise<T>): Promise<T> {
  const previous = operationQueues.get(filePath) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(action);
  operationQueues.set(filePath, current);
  try {
    return await current;
  } finally {
    if (operationQueues.get(filePath) === current) operationQueues.delete(filePath);
  }
}

export class FileMediaPersistenceRepository implements MediaRepository {
  constructor(private readonly filePath: string = defaultMediaStatePath, private readonly storage: MediaStorage = createMediaStorage()) {}

  async listMedia(): Promise<MediaAsset[]> {
    return this.readState();
  }

  async getMedia(assetId: string): Promise<MediaAsset | undefined> {
    const assets = await this.readState();
    const asset = assets.find((candidate) => candidate.id === assetId);
    return asset ? cloneAsset(asset) : undefined;
  }

  async registerMedia(asset: MediaAsset): Promise<MediaAsset> {
    return this.mutate((assets) => {
      if (assets.some((candidate) => candidate.id === asset.id)) {
        throw new MediaRepositoryError('duplicate-media-id', `Media asset already exists: ${asset.id}.`);
      }
      const errors = validateMediaAsset(asset);
      if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
      assets.push(cloneAsset(asset));
      return cloneAsset(asset);
    });
  }

  async replaceMedia(assetId: string, replacement: Omit<MediaAsset, 'id'>): Promise<MediaAsset> {
    const result = await this.mutate((assets) => {
      const index = assets.findIndex((candidate) => candidate.id === assetId);
      if (index < 0) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
      const asset = { id: assetId, ...replacement };
      const errors = validateMediaAsset(asset);
      if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
      const previousStorageKey = assets[index].storageKey;
      assets[index] = cloneAsset(asset);
      return { asset: cloneAsset(asset), previousStorageKey };
    });
    if (result.previousStorageKey) await this.storage.delete(result.previousStorageKey);
    return result.asset;
  }

  async removeMedia(assetId: string): Promise<void> {
    const result = await this.mutate((assets) => {
      const index = assets.findIndex((candidate) => candidate.id === assetId);
      if (index < 0) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
      const removed = assets.splice(index, 1)[0];
      return { removed, stillReferenced: Boolean(removed.storageKey && assets.some((candidate) => candidate.storageKey === removed.storageKey)) };
    });
    if (result.removed.storageKey && !result.stillReferenced) await this.storage.delete(result.removed.storageKey);
  }

  async registerUploadedMedia(asset: MediaAsset, upload: UploadedMediaPayload): Promise<MediaAsset> {
    const stored = await this.storage.put(upload);
    try {
      return await this.mutate((assets) => {
        if (assets.some((candidate) => candidate.id === asset.id)) {
          throw new MediaRepositoryError('duplicate-media-id', `Media asset already exists: ${asset.id}.`);
        }
        const nextAsset = { ...asset, reference: stored.reference, storageKey: stored.storageKey };
        const errors = validateMediaAsset(nextAsset);
        if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
        assets.push(cloneAsset(nextAsset));
        return cloneAsset(nextAsset);
      });
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  async replaceUploadedMedia(assetId: string, replacement: Omit<MediaAsset, 'id' | 'reference' | 'storageKey'>, upload: UploadedMediaPayload): Promise<MediaAsset> {
    const stored = await this.storage.put(upload);
    try {
      const result = await this.mutate((assets) => {
        const index = assets.findIndex((candidate) => candidate.id === assetId);
        if (index < 0) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
        const nextAsset = { ...replacement, id: assetId, reference: stored.reference, storageKey: stored.storageKey };
        const errors = validateMediaAsset(nextAsset);
        if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
        const previous = assets[index];
        assets[index] = cloneAsset(nextAsset);
        return { asset: cloneAsset(nextAsset), previousStorageKey: previous.storageKey, previousStillReferenced: Boolean(previous.storageKey && assets.some((candidate) => candidate.storageKey === previous.storageKey)) };
      });
      if (result.previousStorageKey && !result.previousStillReferenced) await this.storage.delete(result.previousStorageKey);
      return result.asset;
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  private async readState(): Promise<MediaAsset[]> {
    try {
      const persisted = await readFile(this.filePath, 'utf8');
      const assets = validateAssets(JSON.parse(persisted) as MediaAsset[], 'persisted');
      const migrated = migrateLegacyBrandLogo(assets);
      if (migrated.some((asset, index) => asset.reference !== assets[index]?.reference)) await this.writeState(migrated);
      return migrated;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof MediaPersistenceError) throw error;
        throw new MediaPersistenceError('read-failed', `The current media state could not be read from ${this.filePath}.`);
      }
      const seed = validateAssets(mediaCatalog, 'seed');
      await this.writeState(seed);
      return seed;
    }
  }

  private async mutate<T>(change: (assets: MediaAsset[]) => T): Promise<T> {
    return enqueue(this.filePath, async () => {
      lockedPaths.add(this.filePath);
      try {
        const current = await this.readState();
        const next = cloneAssets(current);
        const result = change(next);
        await this.writeState(validateAssets(next, 'replacement'));
        return result;
      } finally {
        lockedPaths.delete(this.filePath);
      }
    });
  }

  private async writeState(assets: MediaAsset[]): Promise<void> {
    const nextAssets = validateAssets(assets, 'replacement');
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = `${this.filePath}.${process.pid}.${Date.now()}.bak`;
    const write = async () => {
      let movedPrevious = false;
      try {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        await writeFile(temporaryPath, JSON.stringify(nextAssets, null, 2), 'utf8');
        try {
          await rename(this.filePath, backupPath);
          movedPrevious = true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        await rename(temporaryPath, this.filePath);
        if (movedPrevious) await unlink(backupPath);
      } catch (error) {
        await unlink(temporaryPath).catch(() => undefined);
        if (movedPrevious) {
          await unlink(this.filePath).catch(() => undefined);
          await rename(backupPath, this.filePath).catch(() => undefined);
        }
        throw new MediaPersistenceError('write-failed', `The current media state could not be persisted to ${this.filePath}.`);
      }
    };
    if (lockedPaths.has(this.filePath)) await write();
    else await enqueue(this.filePath, write);
  }
}

export class LocalMediaRepository implements MediaRepository {
  private assets: MediaAsset[];

  constructor(initialAssets: MediaAsset[] = mediaCatalog) {
    this.assets = initialAssets.map(cloneAsset);
  }

  async listMedia(): Promise<MediaAsset[]> {
    return this.assets.map(cloneAsset);
  }

  async getMedia(assetId: string): Promise<MediaAsset | undefined> {
    const asset = this.assets.find((candidate) => candidate.id === assetId);
    return asset ? cloneAsset(asset) : undefined;
  }

  async registerMedia(asset: MediaAsset): Promise<MediaAsset> {
    const errors = validateMediaAsset(asset);
    if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
    if (this.assets.some((candidate) => candidate.id === asset.id)) {
      throw new MediaRepositoryError('duplicate-media-id', `Media asset already exists: ${asset.id}.`);
    }
    this.assets.push(cloneAsset(asset));
    return cloneAsset(asset);
  }

  async replaceMedia(assetId: string, replacement: Omit<MediaAsset, 'id'>): Promise<MediaAsset> {
    const index = this.assets.findIndex((candidate) => candidate.id === assetId);
    if (index < 0) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
    const asset = { id: assetId, ...replacement };
    const errors = validateMediaAsset(asset);
    if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
    this.assets[index] = cloneAsset(asset);
    return cloneAsset(asset);
  }

  async removeMedia(assetId: string): Promise<void> {
    const index = this.assets.findIndex((candidate) => candidate.id === assetId);
    if (index < 0) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
    this.assets.splice(index, 1);
  }
}

export function createMediaRepository(): MediaRepository {
  if (getApplicationDataProvider() === 'supabase') return createSupabaseMediaRepository();
  return new FileMediaPersistenceRepository();
}

export function createPersistentMediaRepository(filePath?: string): FileMediaPersistenceRepository {
  return new FileMediaPersistenceRepository(filePath);
}
