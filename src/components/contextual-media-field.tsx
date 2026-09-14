'use client';

import { useId, useRef, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { AdminUiMediaDto } from '../content/admin-menu-ui-adapter';

type MediaType = AdminUiMediaDto['type'];

export function mediaDisplayName(asset: AdminUiMediaDto): string {
  return asset.alt.fr || asset.alt.en || asset.alt.ar || 'Uploaded media';
}

export async function uploadContextualMedia(file: File, sortOrder = 0): Promise<AdminUiMediaDto> {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Uploaded media';
  const form = new FormData();
  form.append('file', file);
  form.append('alt', JSON.stringify({ fr: name, en: name, ar: name }));
  form.append('visible', 'true');
  form.append('sortOrder', String(sortOrder));
  const response = await fetch('/api/admin/media/upload', { method: 'POST', body: form, credentials: 'same-origin' });
  const result = await response.json() as AdminActionResult<AdminUiMediaDto>;
  return unwrapAdminAction(result);
}

export function ContextualMediaField({
  label,
  helpText,
  value,
  media,
  allowedTypes = ['image'],
  optional = true,
  automaticLabel,
  error,
  onChange,
  onMediaAdded,
}: {
  label: string;
  helpText?: string;
  value?: string | null;
  media: AdminUiMediaDto[];
  allowedTypes?: MediaType[];
  optional?: boolean;
  automaticLabel?: string;
  error?: string[];
  onChange: (mediaId: string | null) => void;
  onMediaAdded?: (asset: AdminUiMediaDto) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showExisting, setShowExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const current = value ? media.find((asset) => asset.id === value) : undefined;
  const compatible = media.filter((asset) => asset.visible && allowedTypes.includes(asset.type));
  const accept = allowedTypes.flatMap((type) => type === 'image' ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] : type === 'video' ? ['video/mp4'] : []).join(',');

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const asset = await uploadContextualMedia(file, media.length);
      onMediaAdded?.(asset);
      onChange(asset.id);
      setShowExisting(false);
    } catch (nextError) {
      setUploadError(nextError instanceof Error ? nextError.message : 'The file could not be uploaded.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return <div className="admin-contextual-media">
    <div className="admin-contextual-media-heading"><div><strong>{label}</strong>{helpText ? <p className="admin-field-help">{helpText}</p> : null}</div></div>
    <div className="admin-contextual-media-current">
      {current ? <>
        <div className="admin-contextual-media-preview">{current.type === 'video' ? <video src={current.reference} muted preload="metadata" aria-label={mediaDisplayName(current)} /> : <img src={current.reference} alt={mediaDisplayName(current)} />}</div>
        <span>{mediaDisplayName(current)}</span>
      </> : value ? <span className="admin-media-missing">Asset unavailable. Choose or upload another file.</span> : <span>{automaticLabel ?? 'No media selected'}</span>}
    </div>
    <div className="admin-contextual-media-actions">
      <input ref={inputRef} id={`${id}-upload`} className="admin-visually-hidden-file" type="file" accept={accept} disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <button type="button" className="admin-secondary-button" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? 'Uploading…' : current || value ? 'Change file' : 'Upload file'}</button>
      <button type="button" className="admin-text-button" disabled={uploading} aria-expanded={showExisting} onClick={() => setShowExisting((shown) => !shown)}>{showExisting ? 'Close library' : 'Choose existing'}</button>
      {optional && value ? <button type="button" className="admin-text-button" disabled={uploading} onClick={() => onChange(null)}>{automaticLabel ? 'Use automatic' : 'Remove'}</button> : null}
    </div>
    {showExisting ? <label className="admin-select-field" htmlFor={`${id}-existing`}><span>Existing media</span><select id={`${id}-existing`} value={value ?? ''} onChange={(event) => { onChange(event.target.value || null); if (event.target.value) setShowExisting(false); }}><option value="">{automaticLabel ?? 'No media'}</option>{compatible.map((asset) => <option key={asset.id} value={asset.id}>{mediaDisplayName(asset)}</option>)}</select></label> : null}
    {uploadError ? <p className="admin-field-error" role="alert">{uploadError}</p> : null}
    {error?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}
  </div>;
}
