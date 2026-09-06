'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type {
  AdminUiCategoryDto,
  AdminUiError,
  AdminUiManagementStateDto,
  AdminUiMediaCreateInput,
  AdminUiMediaDto,
  AdminUiMediaReplacementInput,
  AdminUiMenuItemDto,
} from '../content/admin-menu-ui-adapter';
import { unwrapAdminAction } from '../content/admin-action-client';
import { LocalizedFieldGroup } from './localized-field-group';

type MediaManagerState = 'loading' | 'ready' | 'saving' | 'saved' | 'validation-error' | 'error';
type MediaDraft = AdminUiMediaCreateInput & { id: string; selectedFile?: File };

type MediaOperations = {
  getManagementState: () => Promise<AdminUiManagementStateDto>;
  listMedia: () => Promise<AdminUiMediaDto[]>;
  registerMedia: (input: AdminUiMediaCreateInput) => Promise<AdminUiMediaDto>;
  replaceMedia: (id: string, input: AdminUiMediaReplacementInput) => Promise<AdminUiMediaDto>;
  removeMedia: (id: string) => Promise<void>;
  setCanonicalBrandLogo: (id: string) => Promise<AdminUiMediaDto>;
};

export type MediaLibraryServerActions = {
  getManagementState: () => Promise<AdminActionResult<AdminUiManagementStateDto>>;
  listMedia: () => Promise<AdminActionResult<AdminUiMediaDto[]>>;
  registerMedia: (input: AdminUiMediaCreateInput) => Promise<AdminActionResult<AdminUiMediaDto>>;
  replaceMedia: (id: string, input: AdminUiMediaReplacementInput) => Promise<AdminActionResult<AdminUiMediaDto>>;
  removeMedia: (id: string) => Promise<AdminActionResult<void>>;
  setCanonicalBrandLogo: (id: string) => Promise<AdminActionResult<AdminUiMediaDto>>;
};

type MediaLibraryManagerProps = { adapter?: MediaOperations; serverActions?: MediaLibraryServerActions };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function errorFromUnknown(error: unknown): AdminUiError {
  if (error && typeof error === 'object' && 'info' in error) return error as AdminUiError;
  const message = error instanceof Error ? error.message : 'The media operation could not be completed.';
  return Object.assign(new Error(message), { info: { code: 'admin-media-operation-failed', message, resource: 'media' } }) as AdminUiError;
}

function fieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path, [field.message]]));
}

export function getMediaAltText(asset: Pick<AdminUiMediaDto, 'id' | 'alt'>): string {
  return asset.alt.fr ?? asset.alt.en ?? asset.alt.ar ?? asset.id;
}

export function getMediaUsageLabel(asset: Pick<AdminUiMediaDto, 'usageCount'>): string {
  return asset.usageCount === 0 ? 'Unused' : `${asset.usageCount} menu item${asset.usageCount === 1 ? '' : 's'}`;
}

export function getMediaActiveUpdate(asset: Pick<AdminUiMediaDto, 'visible'>): { visible: boolean } {
  return { visible: !asset.visible };
}

export function confirmMediaDeletion(asset: Pick<AdminUiMediaDto, 'id' | 'alt'>, confirmDelete: (message: string) => boolean): boolean {
  return confirmDelete(`Delete media asset "${getMediaAltText(asset)}" (${asset.id})?`);
}

function categoryName(category: AdminUiCategoryDto | undefined): string {
  return category?.name.fr ?? category?.name.en ?? category?.name.ar ?? category?.id ?? 'Unknown category';
}

function itemName(item: AdminUiMenuItemDto | undefined, itemId: string): string {
  return item?.name.fr ?? item?.name.en ?? item?.name.ar ?? itemId;
}

function emptyDraft(): MediaDraft {
  return { id: '', type: 'image', source: 'remote', reference: '', alt: {}, visible: true, sortOrder: 0 };
}

function toDraft(asset: AdminUiMediaDto): MediaDraft {
  return { id: asset.id, type: asset.type, source: asset.source, reference: asset.reference, alt: clone(asset.alt), visible: asset.visible, sortOrder: asset.sortOrder };
}

async function uploadMediaFile(draft: MediaDraft, editingId: string | null): Promise<AdminUiMediaDto> {
  if (!draft.selectedFile) throw new Error('Select a file to upload.');
  const form = new FormData();
  form.append('file', draft.selectedFile);
  if (editingId) form.append('assetId', editingId);
  form.append('alt', JSON.stringify(draft.alt));
  form.append('visible', String(draft.visible));
  form.append('sortOrder', String(Number(draft.sortOrder)));
  const response = await fetch('/api/admin/media/upload', { method: 'POST', body: form });
  const result = await response.json() as AdminActionResult<AdminUiMediaDto>;
  return unwrapAdminAction(result);
}

export function MediaLibraryManager({ adapter, serverActions }: MediaLibraryManagerProps) {
  const operations = useMemo(() => adapter ?? (serverActions ? {
    getManagementState: () => serverActions.getManagementState().then(unwrapAdminAction),
    listMedia: () => serverActions.listMedia().then(unwrapAdminAction),
    registerMedia: (input: AdminUiMediaCreateInput) => serverActions.registerMedia(input).then(unwrapAdminAction),
    replaceMedia: (id: string, input: AdminUiMediaReplacementInput) => serverActions.replaceMedia(id, input).then(unwrapAdminAction),
    removeMedia: (id: string) => serverActions.removeMedia(id).then(unwrapAdminAction),
    setCanonicalBrandLogo: (id: string) => serverActions.setCanonicalBrandLogo(id).then(unwrapAdminAction),
  } : undefined), [adapter, serverActions]);
  if (!operations) throw new Error('Media operations are not configured.');

  const [managementState, setManagementState] = useState<AdminUiManagementStateDto | null>(null);
  const [media, setMedia] = useState<AdminUiMediaDto[]>([]);
  const [draft, setDraft] = useState<MediaDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managerState, setManagerState] = useState<MediaManagerState>('loading');
  const [error, setError] = useState<AdminUiError | null>(null);

  const load = async () => {
    const [nextState, nextMedia] = await Promise.all([operations.getManagementState(), operations.listMedia()]);
    setManagementState(nextState);
    setMedia(nextMedia.sort((first, second) => first.sortOrder - second.sortOrder));
  };

  useEffect(() => {
    load().then(() => setManagerState('ready')).catch((nextError) => { setError(errorFromUnknown(nextError)); setManagerState('error'); });
  }, []);

  const errors = fieldErrors(error);
  const itemById = new Map((managementState?.items ?? []).map((item) => [item.id, item]));
  const categoryById = new Map((managementState?.categories ?? []).map((category) => [category.id, category]));
  const updateDraft = (nextDraft: MediaDraft) => { setDraft(nextDraft); setManagerState('ready'); setError(null); };
  const openCreate = () => { setDraft(emptyDraft()); setEditingId(null); setError(null); setManagerState('ready'); };
  const openEdit = (asset: AdminUiMediaDto) => { setDraft(toDraft(asset)); setEditingId(asset.id); setError(null); setManagerState('ready'); };
  const closeEditor = () => { setDraft(null); setEditingId(null); setError(null); setManagerState('ready'); };

  const save = async () => {
    if (!draft) return;
    setManagerState('saving');
    setError(null);
    try {
      if (draft.selectedFile) {
        await uploadMediaFile(draft, editingId);
      } else if (editingId) {
        await operations.replaceMedia(editingId, { type: draft.type, source: draft.source, reference: draft.reference.trim(), alt: clone(draft.alt), visible: draft.visible, sortOrder: Number(draft.sortOrder) });
      } else {
        await operations.registerMedia({ id: draft.id.trim(), type: draft.type, source: draft.source, reference: draft.reference.trim(), alt: clone(draft.alt), visible: draft.visible, sortOrder: Number(draft.sortOrder) });
      }
      await load();
      setDraft(null);
      setEditingId(null);
      setManagerState('saved');
    } catch (nextError) {
      const nextAdminError = errorFromUnknown(nextError);
      setError(nextAdminError);
      setManagerState(nextAdminError.info.fields?.length ? 'validation-error' : 'error');
    }
  };

  const remove = async (asset: AdminUiMediaDto) => {
    if (asset.usageCount > 0) {
      setError(errorFromUnknown(new Error(`Media asset cannot be deleted while ${getMediaUsageLabel(asset).toLowerCase()} reference it.`)));
      setManagerState('error');
      return;
    }
    if (!confirmMediaDeletion(asset, (message) => window.confirm(message))) return;
    setManagerState('saving');
    setError(null);
    try {
      await operations.removeMedia(asset.id);
      await load();
      setManagerState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setManagerState('error');
    }
  };

  const toggleVisible = async (asset: AdminUiMediaDto) => {
    setManagerState('saving');
    setError(null);
    try {
      await operations.replaceMedia(asset.id, { type: asset.type, source: asset.source, reference: asset.reference, alt: clone(asset.alt), visible: !asset.visible, sortOrder: asset.sortOrder });
      await load();
      setManagerState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setManagerState('error');
    }
  };

  if (managerState === 'loading') return <p className="admin-placeholder">Loading media library...</p>;
  if (!managementState) return <MediaErrorSummary error={error ?? errorFromUnknown(null)} />;

  const setCanonicalBrandLogo = async (asset: AdminUiMediaDto) => {
    setManagerState('saving');
    setError(null);
    try {
      await operations.setCanonicalBrandLogo(asset.id);
      await load();
      setManagerState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setManagerState('error');
    }
  };

  return <div className="admin-media-manager">
    {error && !draft ? <MediaErrorSummary error={error} /> : null}
    <div className="admin-list-toolbar"><div><p className="admin-eyebrow">Asset references</p><p className="admin-list-count">{media.length} media records</p></div><button type="button" className="admin-primary-button" onClick={openCreate}>Add Media</button></div>
    <p className="admin-media-note">This library manages existing media references and URLs. Binary file uploads are not supported by the current repository.</p>
    {media.length === 0 ? <p className="admin-empty-state">No media records found.</p> : <MediaList media={media} itemById={itemById} categoryById={categoryById} managerState={managerState} onEdit={openEdit} onDelete={remove} onToggleVisible={toggleVisible} onSetCanonicalLogo={setCanonicalBrandLogo} />}
    {draft ? <MediaEditor draft={draft} editingId={editingId} state={managerState} errors={errors} onChange={updateDraft} onCancel={closeEditor} onSave={save} /> : null}
  </div>;
}

export function MediaList({ media, itemById, categoryById, managerState, onEdit, onDelete, onToggleVisible, onSetCanonicalLogo }: { media: AdminUiMediaDto[]; itemById: Map<string, AdminUiMenuItemDto>; categoryById: Map<string, AdminUiCategoryDto>; managerState: MediaManagerState; onEdit: (asset: AdminUiMediaDto) => void; onDelete: (asset: AdminUiMediaDto) => void; onToggleVisible: (asset: AdminUiMediaDto) => void; onSetCanonicalLogo?: (asset: AdminUiMediaDto) => void }) {
  return <div className="admin-media-list" aria-label="Media library">{media.map((asset) => <article className="admin-media-row" key={asset.id}>
    <MediaPreview asset={asset} />
    <div className="admin-media-main"><div className="admin-media-heading"><h2>{getMediaAltText(asset)}</h2><span className={asset.visible ? 'admin-state is-active' : 'admin-state'}>{asset.visible ? 'Visible' : 'Hidden'}</span></div><p className="admin-media-meta"><span className="admin-media-code">{asset.id}</span><span>{asset.type}</span><span>{asset.source}</span><span>{getMediaUsageLabel(asset)}</span></p><p className="admin-media-reference" title={asset.reference}>{asset.reference}</p><div className="admin-media-usage"><strong>Used by</strong>{asset.referencedBy.length === 0 ? <span>Nothing currently references this asset.</span> : asset.referencedBy.map((reference) => <span key={`${asset.id}-${reference.itemId}`}>{itemName(itemById.get(reference.itemId), reference.itemId)} <small>{categoryName(categoryById.get(reference.categoryId))}</small></span>)}</div></div>
    <div className="admin-media-actions"><button type="button" className="admin-text-button" onClick={() => onEdit(asset)}>Replace</button>{asset.type === 'image' ? <button type="button" className="admin-text-button" onClick={() => onSetCanonicalLogo?.(asset)} disabled={asset.isCanonicalLogo || managerState === 'saving'}>{asset.isCanonicalLogo ? 'Canonical logo' : 'Use as logo'}</button> : null}<button type="button" className="admin-text-button" onClick={() => onToggleVisible(asset)} disabled={managerState === 'saving'}>{asset.visible ? 'Hide' : 'Show'}</button><button type="button" className="admin-text-button is-danger" onClick={() => onDelete(asset)} disabled={asset.usageCount > 0 || managerState === 'saving'} title={asset.usageCount > 0 ? 'Deletion is blocked while menu items reference this media.' : undefined}>Delete</button></div>
  </article>)}</div>;
}

function MediaPreview({ asset }: { asset: AdminUiMediaDto }) {
  if (asset.source === 'brand' && asset.reference.endsWith('.svg')) {
    return <div className="admin-media-preview admin-media-preview-unavailable">Preview unavailable</div>;
  }
  if (asset.type === 'video') return <div className="admin-media-preview"><video src={asset.reference} muted preload="metadata" aria-label={getMediaAltText(asset)} /></div>;
  return <div className="admin-media-preview"><img src={asset.reference} alt={getMediaAltText(asset)} /></div>;
}

export function MediaEditor({ draft, editingId, state, errors, onChange, onCancel, onSave }: { draft: MediaDraft; editingId: string | null; state: MediaManagerState; errors: Record<string, string[]>; onChange: (draft: MediaDraft) => void; onCancel: () => void; onSave: () => void }) {
  const editorRef = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editorRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!draft.selectedFile) { setPreviewUrl(null); return undefined; }
    const nextUrl = URL.createObjectURL(draft.selectedFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [draft.selectedFile]);
  const updateLocalized = (locale: 'fr' | 'en' | 'ar', value: string) => onChange({ ...draft, alt: { ...draft.alt, [locale]: value } });
  return <form className="admin-media-editor" ref={editorRef} tabIndex={-1} onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Replace media reference' : 'Register media reference'}</p><h2>{editingId ? 'Replace media' : 'Add Media'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div>
    <p className="admin-media-note">Use a local path or remote URL, or upload an image/video file. Replacing media preserves the stable ID and existing menu item references.</p>
    <div className="admin-media-upload-field"><label htmlFor="media-file">Upload file</label><input id="media-file" type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; onChange({ ...draft, selectedFile: file, type: file.type.startsWith('video/') ? 'video' : 'image', source: 'local', reference: '' }); }} />{draft.selectedFile ? <div className="admin-media-selected-file"><strong>{draft.selectedFile.name}</strong><span>{draft.selectedFile.type || 'Unknown type'} · {(draft.selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>{previewUrl ? draft.selectedFile.type.startsWith('video/') ? <video src={previewUrl} controls muted /> : <img src={previewUrl} alt="Selected upload preview" /> : null}</div> : <p className="admin-media-note">No file selected. URL/reference registration remains available below.</p>}</div>
    <div className="admin-media-editor-grid"><div className="admin-field"><label htmlFor="media-id">Media ID</label><input id="media-id" value={draft.id} disabled={Boolean(editingId)} required={!draft.selectedFile} placeholder={draft.selectedFile ? 'Generated on upload' : undefined} onChange={(event) => onChange({ ...draft, id: event.target.value })} aria-invalid={Boolean(errors.id?.length)} />{errors.id?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div><label className="admin-select-field">Type<select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as 'image' | 'video' })}><option value="image">Image</option><option value="video">Video</option></select></label><label className="admin-select-field">Source<select value={draft.source} onChange={(event) => onChange({ ...draft, source: event.target.value as 'local' | 'remote' | 'brand' })}><option value="local">Local</option><option value="remote">Remote</option><option value="brand">Brand</option></select></label><div className="admin-field"><label htmlFor="media-reference">Reference URL or path</label><input id="media-reference" value={draft.reference} required={!draft.selectedFile} placeholder={draft.selectedFile ? 'Generated on upload' : undefined} onChange={(event) => onChange({ ...draft, reference: event.target.value })} aria-invalid={Boolean(errors.reference?.length)} />{errors.reference?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div><div className="admin-field"><label htmlFor="media-sort-order">Sort order</label><input id="media-sort-order" type="number" min="0" step="1" value={draft.sortOrder} onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value) })} aria-invalid={Boolean(errors.sortOrder?.length)} />{errors.sortOrder?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div><label className="admin-checkbox-label"><input type="checkbox" checked={draft.visible} onChange={(event) => onChange({ ...draft, visible: event.target.checked })} /> Visible</label></div>
    <LocalizedFieldGroup id="alt" label="Alternative text" value={draft.alt} errors={errors} onChange={updateLocalized} />
    <div className="admin-editor-actions"><span className={`admin-save-state is-${state}`} aria-live="polite">{state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : state === 'validation-error' ? 'Validation error' : state === 'error' ? 'Could not save' : 'Unsaved changes'}</span><button type="submit" className="admin-primary-button" disabled={state === 'saving'}>{state === 'saving' ? 'Saving...' : draft.selectedFile ? editingId ? 'Upload replacement' : 'Upload media' : editingId ? 'Replace media' : 'Register media'}</button></div>
  </form>;
}

export function MediaErrorSummary({ error }: { error: AdminUiError }) {
  return <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Media action failed</h2><p>{error.message}</p>{error.info.details?.length ? <ul>{error.info.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}{error.info.fields?.length ? <ul>{error.info.fields.map((field) => <li key={field.path}><strong>{field.path}</strong>: {field.message}</li>)}</ul> : null}</section>;
}
