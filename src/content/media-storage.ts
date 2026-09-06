import crypto from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { UploadedMediaPayload } from './media-upload-storage';
import { SupabaseMediaStorage } from './supabase-media-storage';

export type MediaStorageProvider = 'local' | 'object';

export type StoredMediaObject = {
  storageKey: string;
  reference: string;
  source: 'local' | 'remote';
};

export interface MediaStorage {
  readonly provider: MediaStorageProvider;
  put(upload: UploadedMediaPayload): Promise<StoredMediaObject>;
  read(storageKey: string): Promise<{ bytes: Buffer; contentType: string }>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}

export function getMediaUploadDirectory(): string {
  return process.env.VIET_GARDEN_MEDIA_UPLOAD_DIR
    ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'uploads');
}

export function getMediaStorageProvider(): MediaStorageProvider {
  const configured = process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER?.toLowerCase();
  const provider = configured ?? (process.env.NODE_ENV === 'production' ? undefined : 'local');
  if (!provider) throw new Error('Production requires VIET_GARDEN_MEDIA_STORAGE_PROVIDER=object with Supabase configuration.');
  if (provider !== 'local' && provider !== 'object') throw new Error(`Unsupported media storage provider: ${provider}.`);
  if (process.env.NODE_ENV === 'production' && provider !== 'object') throw new Error('Production requires the object media storage provider.');
  return provider;
}

function getManagedPath(storageKey: string): string {
  const safeKey = path.basename(storageKey);
  if (safeKey !== storageKey || !/^[a-f0-9-]+\.(jpg|png|gif|webp|mp4)$/.test(safeKey)) {
    throw new Error('Invalid managed media storage key.');
  }
  return path.join(getMediaUploadDirectory(), safeKey);
}

function contentTypeFor(extension: string): string {
  return ({ jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4' } as Record<string, string>)[extension] ?? 'application/octet-stream';
}

export class LocalMediaStorage implements MediaStorage {
  readonly provider = 'local' as const;

  async put(upload: UploadedMediaPayload): Promise<StoredMediaObject> {
    const storageKey = `${crypto.randomUUID()}.${upload.extension}`;
    const target = getManagedPath(storageKey);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(getMediaUploadDirectory(), { recursive: true });
    try {
      await writeFile(temporary, upload.bytes);
      await rename(temporary, target);
      return { storageKey, reference: `/media/uploads/${storageKey}`, source: 'local' };
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  async read(storageKey: string): Promise<{ bytes: Buffer; contentType: string }> {
    const bytes = await readFile(getManagedPath(storageKey));
    return { bytes, contentType: contentTypeFor(storageKey.split('.').pop() ?? '') };
  }

  async delete(storageKey: string): Promise<void> {
    await unlink(getManagedPath(storageKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await readFile(getManagedPath(storageKey));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }
}

export function createMediaStorage(): MediaStorage {
  const provider = getMediaStorageProvider();
  if (provider === 'local') return new LocalMediaStorage();
  return new SupabaseMediaStorage();
}
