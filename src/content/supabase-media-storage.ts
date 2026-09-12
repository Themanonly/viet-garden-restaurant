import crypto from 'node:crypto';
import type { UploadedMediaPayload } from './media-upload-storage';
import type { MediaStorage, StoredMediaObject } from './media-storage';

export type SupabaseStorageConfig = {
  projectUrl: string;
  serviceRoleKey: string;
  bucket: string;
};

type SupabaseResponse = { ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string> };
export type SupabaseStorageHttpClient = {
  request(input: RequestInfo | URL, init?: RequestInit): Promise<SupabaseResponse>;
};

function requireConfig(): SupabaseStorageConfig {
  const projectUrl = process.env.SUPABASE_URL ?? process.env.SUPABASE_PROJECT_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!projectUrl || !serviceRoleKey || !bucket) throw new Error('Supabase media storage requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.');
  let normalizedUrl: URL;
  try {
    normalizedUrl = new URL(projectUrl);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL.');
  }
  if (normalizedUrl.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
  return { projectUrl: normalizedUrl.toString().replace(/\/$/, ''), serviceRoleKey, bucket };
}

function defaultClient(): SupabaseStorageHttpClient {
  return { request: (input, init) => fetch(input, init) };
}

function contentTypeFor(extension: string): string {
  return ({
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    rtf: 'application/rtf',
    csv: 'text/csv',
    json: 'application/json',
    md: 'text/markdown',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as Record<string, string>)[extension] ?? 'application/octet-stream';
}

function safeKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, '/');
  if (normalized !== storageKey || !/^uploads\/[a-f0-9-]+\.(jpg|png|gif|webp|mp4|mp3|wav|aac|ogg|pdf|doc|docx|txt|rtf|csv|json|md|ppt|pptx|xls|xlsx)$/.test(normalized)) throw new Error('Invalid managed Supabase media storage key.');
  return normalized;
}

function encodePath(value: string): string {
  return value.split('/').map(encodeURIComponent).join('/');
}

export class SupabaseMediaStorage implements MediaStorage {
  readonly provider = 'object' as const;
  private readonly config: SupabaseStorageConfig;
  private readonly client: SupabaseStorageHttpClient;

  constructor(config: SupabaseStorageConfig = requireConfig(), client: SupabaseStorageHttpClient = defaultClient()) {
    this.config = config;
    this.client = client;
  }

  async put(upload: UploadedMediaPayload): Promise<StoredMediaObject> {
    const storageKey = `uploads/${crypto.randomUUID()}.${upload.extension}`;
    const bytes = Buffer.from(upload.bytes);
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], { type: contentTypeFor(upload.extension) });
    const response = await this.client.request(this.objectUrl(storageKey), {
      method: 'POST',
      headers: this.headers({ 'Content-Type': contentTypeFor(upload.extension), 'x-upsert': 'false' }),
      body: blob,
    });
    if (!response.ok) throw new Error(`Supabase media upload failed with status ${response.status}.`);
    return { storageKey, reference: `${this.config.projectUrl}/storage/v1/object/public/${encodeURIComponent(this.config.bucket)}/${encodePath(storageKey)}`, source: 'remote' };
  }

  async read(storageKey: string): Promise<{ bytes: Buffer; contentType: string }> {
    const safe = safeKey(storageKey);
    const response = await this.client.request(this.objectUrl(safe), { headers: this.headers() });
    if (!response.ok) throw new Error(`Supabase media read failed with status ${response.status}.`);
    return { bytes: Buffer.from(await response.arrayBuffer()), contentType: contentTypeFor(safe.split('.').pop() ?? '') };
  }

  async delete(storageKey: string): Promise<void> {
    const safe = safeKey(storageKey);
    const response = await this.client.request(`${this.config.projectUrl}/storage/v1/object/${encodeURIComponent(this.config.bucket)}`, {
      method: 'DELETE',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: [safe] }),
    });
    if (!response.ok && response.status !== 404) throw new Error(`Supabase media deletion failed with status ${response.status}.`);
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await this.read(storageKey);
      return true;
    } catch (error) {
      if (error instanceof Error && /status 404/.test(error.message)) return false;
      throw error;
    }
  }

  private objectUrl(storageKey: string): string {
    return `${this.config.projectUrl}/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${encodePath(safeKey(storageKey))}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: this.config.serviceRoleKey, Authorization: `Bearer ${this.config.serviceRoleKey}`, ...extra };
  }
}

export function getSupabaseMediaStorageConfig(): SupabaseStorageConfig {
  return requireConfig();
}
