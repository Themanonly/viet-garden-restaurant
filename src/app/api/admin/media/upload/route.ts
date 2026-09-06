import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { AdminAuthorizationError, requireAdminRequest } from '../../../../../content/admin-auth';
import { AdminApplicationError, type AdminErrorInfo } from '../../../../../content/admin-menu-service';
import { getAdminMenuUiAdapter } from '../../../../../content/admin-ui-adapter-instance';
import { validateUploadedMedia, type UploadedMediaType } from '../../../../../content/media-upload-storage';
import type { AdminUiMediaCreateInput, AdminUiMediaReplacementInput } from '../../../../../content/admin-menu-ui-adapter';

export const runtime = 'nodejs';

const extensionByType: Record<string, { type: UploadedMediaType; extension: 'jpg' | 'png' | 'gif' | 'webp' | 'mp4' }> = {
  'image/jpeg': { type: 'image', extension: 'jpg' },
  'image/png': { type: 'image', extension: 'png' },
  'image/gif': { type: 'image', extension: 'gif' },
  'image/webp': { type: 'image', extension: 'webp' },
  'video/mp4': { type: 'video', extension: 'mp4' },
};

function failure(code: string, message: string, field?: string): AdminErrorInfo {
  return { code, message, resource: 'media', ...(field ? { field, fields: [{ code, message, path: field }] } : {}) };
}

function parseLocalized(value: FormDataEntryValue | null, field: string): Record<string, string> {
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    return Object.fromEntries(Object.entries(parsed).filter(([key, item]) => ['fr', 'en', 'ar'].includes(key) && typeof item === 'string'));
  } catch {
    throw new AdminApplicationError({ ...failure('invalid-localized-field', `Invalid localized ${field}.`, field) });
  }
}

function parseNumber(value: FormDataEntryValue | null, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new AdminApplicationError({ ...failure('invalid-media-field', `Invalid ${field}.`, field) });
  return parsed;
}

function jsonResponse(result: { ok: true; value: unknown } | { ok: false; error: AdminErrorInfo }, status = 200) {
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
    const form = await request.formData();
    const fileEntry = form.get('file');
    if (!(fileEntry instanceof File)) return jsonResponse({ ok: false, error: failure('media-file-required', 'Select an image or MP4 video file.', 'file') }, 400);
    const descriptor = extensionByType[fileEntry.type];
    if (!descriptor) return jsonResponse({ ok: false, error: failure('unsupported-media-type', 'Only JPEG, PNG, GIF, WebP, and MP4 files are supported.', 'file') }, 415);
    const filenameExtension = fileEntry.name.toLowerCase().split('.').pop();
    const validExtensions = descriptor.type === 'image' ? (descriptor.extension === 'jpg' ? ['jpg', 'jpeg'] : [descriptor.extension]) : ['mp4'];
    if (!filenameExtension || !validExtensions.includes(filenameExtension)) return jsonResponse({ ok: false, error: failure('unsupported-media-extension', 'The file extension does not match the supported media type.', 'file') }, 415);
    const bytes = new Uint8Array(await fileEntry.arrayBuffer());
    const upload = validateUploadedMedia(bytes, descriptor.type, descriptor.extension);
    const alt = parseLocalized(form.get('alt'), 'alt text');
    const metadata = {
      type: descriptor.type,
      source: 'local' as const,
      alt,
      visible: form.get('visible') !== 'false',
      sortOrder: parseNumber(form.get('sortOrder'), 'sort order'),
    };
    const adapter = getAdminMenuUiAdapter();
    const assetId = typeof form.get('assetId') === 'string' && String(form.get('assetId')).trim() ? String(form.get('assetId')) : `upload-${crypto.randomUUID()}`;
    const value = form.get('assetId') ? await adapter.replaceUploadedMedia(assetId, metadata as AdminUiMediaReplacementInput, upload) : await adapter.registerUploadedMedia({ id: assetId, reference: '', ...metadata } as AdminUiMediaCreateInput, upload);
    return jsonResponse({ ok: true, value });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return jsonResponse({ ok: false, error: failure(error.status === 401 ? 'admin-authentication-required' : 'admin-authorization-required', error.message) }, error.status);
    if (error instanceof AdminApplicationError) return jsonResponse({ ok: false, error: error.info }, 400);
    return jsonResponse({ ok: false, error: failure('media-upload-failed', 'The media upload could not be completed.', 'file') }, 400);
  }
}
