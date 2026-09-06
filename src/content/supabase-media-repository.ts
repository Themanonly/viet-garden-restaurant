import type { MediaAsset } from './models';
import { MediaRepositoryError, validateMediaAsset, type MediaRepository } from './media-repository';
import { createMediaStorage, type MediaStorage } from './media-storage';
import type { UploadedMediaPayload } from './media-upload-storage';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';

export type SupabaseMediaRow = {
  id: string;
  type: MediaAsset['type'];
  source: MediaAsset['source'];
  storage_bucket: string | null;
  storage_key: string | null;
  reference_url: string;
  alt: MediaAsset['alt'];
  visible: boolean;
  sort_order: number;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function equalsId(id: string): string {
  return `id=eq.${encodeURIComponent(id)}`;
}

function toAsset(row: SupabaseMediaRow): MediaAsset {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    reference: row.reference_url,
    alt: clone(row.alt),
    visible: row.visible,
    sortOrder: row.sort_order,
    ...(row.storage_key ? { storageKey: row.storage_key } : {}),
  };
}

export class SupabaseMediaRepository implements MediaRepository {
  constructor(
    private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient(),
    private readonly storage: MediaStorage,
    private readonly storageBucket?: string,
  ) {}

  async listMedia(): Promise<MediaAsset[]> {
    const rows = await this.database.select<SupabaseMediaRow>('media', 'select=*&order=sort_order.asc');
    return rows.map(toAsset).map(clone);
  }

  async getMedia(assetId: string): Promise<MediaAsset | undefined> {
    const rows = await this.database.select<SupabaseMediaRow>('media', `select=*&${equalsId(assetId)}`);
    return rows[0] ? clone(toAsset(rows[0])) : undefined;
  }

  async registerMedia(asset: MediaAsset): Promise<MediaAsset> {
    const errors = validateMediaAsset(asset);
    if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
    const rows = await this.database.insert<SupabaseMediaRow>('media', [this.toRow(asset)]);
    if (!rows[0]) throw new MediaRepositoryError('write-failed', `Media asset could not be created: ${asset.id}.`);
    return clone(toAsset(rows[0]));
  }

  async replaceMedia(assetId: string, replacement: Omit<MediaAsset, 'id'>): Promise<MediaAsset> {
    const previous = await this.getMedia(assetId);
    if (!previous) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
    const nextAsset = { id: assetId, ...replacement };
    const errors = validateMediaAsset(nextAsset);
    if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
    const rows = await this.database.update<SupabaseMediaRow>('media', equalsId(assetId), this.toRow(nextAsset));
    if (!rows[0]) throw new MediaRepositoryError('write-failed', `Media asset could not be replaced: ${assetId}.`);
    if (previous.storageKey && previous.storageKey !== nextAsset.storageKey) await this.storage.delete(previous.storageKey);
    return clone(toAsset(rows[0]));
  }

  async removeMedia(assetId: string): Promise<void> {
    const previous = await this.getMedia(assetId);
    if (!previous) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
    const rows = await this.database.remove<SupabaseMediaRow>('media', equalsId(assetId));
    if (!rows[0]) throw new MediaRepositoryError('write-failed', `Media asset could not be removed: ${assetId}.`);
    if (previous.storageKey) await this.storage.delete(previous.storageKey);
  }

  async registerUploadedMedia(asset: MediaAsset, upload: UploadedMediaPayload): Promise<MediaAsset> {
    const stored = await this.storage.put(upload);
    try {
      return await this.registerMedia({ ...asset, reference: stored.reference, storageKey: stored.storageKey, source: 'remote' });
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  async replaceUploadedMedia(assetId: string, replacement: Omit<MediaAsset, 'id' | 'reference' | 'storageKey'>, upload: UploadedMediaPayload): Promise<MediaAsset> {
    const previous = await this.getMedia(assetId);
    if (!previous) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
    const stored = await this.storage.put(upload);
    let metadataCommitted = false;
    try {
      const nextAsset = { ...replacement, id: assetId, reference: stored.reference, storageKey: stored.storageKey, source: 'remote' as const };
      const errors = validateMediaAsset(nextAsset);
      if (errors.length > 0) throw new MediaRepositoryError('invalid-media', errors.join(' '));
      const rows = await this.database.update<SupabaseMediaRow>('media', equalsId(assetId), this.toRow(nextAsset));
      if (!rows[0]) throw new MediaRepositoryError('write-failed', `Media asset could not be replaced: ${assetId}.`);
      metadataCommitted = true;
      if (previous.storageKey && previous.storageKey !== stored.storageKey) await this.storage.delete(previous.storageKey);
      return clone(toAsset(rows[0]));
    } catch (error) {
      if (!metadataCommitted) await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  private toRow(asset: MediaAsset): SupabaseMediaRow {
    return {
      id: asset.id,
      type: asset.type,
      source: asset.source,
      storage_bucket: asset.storageKey ? this.storageBucket ?? 'viet-garden-media' : null,
      storage_key: asset.storageKey ?? null,
      reference_url: asset.reference,
      alt: clone(asset.alt),
      visible: asset.visible,
      sort_order: asset.sortOrder,
    };
  }
}

export function createSupabaseMediaRepository(database?: SupabaseDatabaseClient, storage?: MediaStorage): SupabaseMediaRepository {
  const selectedStorage = storage ?? createMediaStorage();
  return new SupabaseMediaRepository(database, selectedStorage, process.env.SUPABASE_STORAGE_BUCKET ?? 'viet-garden-media');
}
