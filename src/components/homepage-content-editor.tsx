'use client';

import { useEffect, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { HomepageContent, HomepageVisuals } from '../content/site-settings';
import { LocalizedFieldGroup } from './localized-field-group';
import type { AdminUiError, AdminUiMediaDto } from '../content/admin-menu-ui-adapter';

const emptyContent: HomepageContent = {
  heroEyebrow: { fr: '', en: '', ar: '' },
  heroStatement: { fr: '', en: '', ar: '' },
  identityEyebrow: { fr: '', en: '', ar: '' },
  identityTitle: { fr: '', en: '', ar: '' },
};

const emptyVisuals: HomepageVisuals = {
  heroVisualMediaId: 'hero-visual',
  heroPosterMediaId: 'hero-poster',
  identityVisualMediaId: 'identity-visual',
};

export const homepageEditorFields = ['heroEyebrow', 'heroStatement', 'identityEyebrow', 'identityTitle'] as const;

type ServerActions = {
  readAdminHomepageContent: () => Promise<AdminActionResult<HomepageContent>>;
  saveAdminHomepageContent: (content: HomepageContent) => Promise<AdminActionResult<HomepageContent>>;
  readAdminHomepageVisuals?: () => Promise<AdminActionResult<HomepageVisuals>>;
  saveAdminHomepageVisuals?: (visuals: HomepageVisuals) => Promise<AdminActionResult<HomepageVisuals>>;
  readAdminMedia?: () => Promise<AdminActionResult<AdminUiMediaDto[]>>;
};

function clone<T>(value: T): T { return structuredClone(value); }

function fieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path.replace(/^(homepageContent\.|homepageVisuals\.)/, ''), [field.message]]));
}

export function getHomepageFieldErrors(error: AdminUiError | null): Record<string, string[]> { return fieldErrors(error); }

export function isHomepageContentDirty(draft: HomepageContent, saved: HomepageContent): boolean { return JSON.stringify(draft) !== JSON.stringify(saved); }
export function restoreHomepageContent(saved: HomepageContent): HomepageContent { return clone(saved); }
export function applyHomepageSave(saved: HomepageContent, next: HomepageContent): { draft: HomepageContent; saved: HomepageContent } { return { draft: clone(next), saved: clone(next) }; }

export function isHomepageVisualsDirty(draft: HomepageVisuals, saved: HomepageVisuals): boolean { return JSON.stringify(draft) !== JSON.stringify(saved); }
export function restoreHomepageVisuals(saved: HomepageVisuals): HomepageVisuals { return clone(saved); }
export function applyHomepageVisualsSave(saved: HomepageVisuals, next: HomepageVisuals): { draft: HomepageVisuals; saved: HomepageVisuals } { return { draft: clone(next), saved: clone(next) }; }

export function validateHomepageVisuals(draft: HomepageVisuals, mediaList: AdminUiMediaDto[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (draft.heroPosterMediaId) {
    const posterAsset = mediaList.find((asset) => asset.id === draft.heroPosterMediaId);
    if (posterAsset && posterAsset.type !== 'image') {
      errors.heroPosterMediaId = ['Hero poster must be an image asset.'];
    }
  }
  if (draft.identityVisualMediaId) {
    const identityAsset = mediaList.find((asset) => asset.id === draft.identityVisualMediaId);
    if (identityAsset && identityAsset.type !== 'image') {
      errors.identityVisualMediaId = ['Introduction visual must be an image asset.'];
    }
  }
  return errors;
}

export function getMediaDisplayName(asset: AdminUiMediaDto | undefined): string {
  if (!asset) return '';
  return asset.alt.fr || asset.alt.en || asset.alt.ar || asset.id;
}

export function HomepageContentForm({ draft, saved, state, error, onChange, onReset, onSave }: { draft: HomepageContent; saved: HomepageContent; state: 'ready' | 'saving' | 'error'; error: AdminUiError | null; onChange: (field: keyof HomepageContent, locale: 'fr' | 'en' | 'ar', value: string) => void; onReset: () => void; onSave: () => void }) {
  const dirty = isHomepageContentDirty(draft, saved);
  const errors = fieldErrors(error);
  return <div className="admin-editor">
    {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Homepage content could not be saved</h2><p>{error.message}</p></section> : null}
    <section className="admin-section" aria-labelledby="homepage-content-title">
      <div className="admin-section-heading"><div><p className="admin-eyebrow">Content</p><h2 id="homepage-content-title">Homepage marketing text</h2><p className="admin-section-description">Manage the short text shown in the homepage hero and introduction. Business details, buttons, locations, and media are managed elsewhere.</p></div></div>
      <LocalizedFieldGroup id="heroEyebrow" label="Hero small heading" helpText="The short line above the homepage business name." value={draft.heroEyebrow} errors={errors} required onChange={(locale, value) => onChange('heroEyebrow', locale, value)} />
      <LocalizedFieldGroup id="heroStatement" label="Hero statement" helpText="The short promise beneath the homepage business name." value={draft.heroStatement} errors={errors} required onChange={(locale, value) => onChange('heroStatement', locale, value)} />
      <LocalizedFieldGroup id="identityEyebrow" label="Introduction small heading" helpText="The short line above the homepage introduction title." value={draft.identityEyebrow} errors={errors} required onChange={(locale, value) => onChange('identityEyebrow', locale, value)} />
      <LocalizedFieldGroup id="identityTitle" label="Introduction title" helpText="The main title of the homepage introduction." value={draft.identityTitle} errors={errors} required onChange={(locale, value) => onChange('identityTitle', locale, value)} />
    </section>
    <div className="admin-editor-actions"><span className="admin-save-state" aria-live="polite">{state === 'saving' ? 'Saving...' : state === 'error' ? 'Save failed' : dirty ? 'Unsaved changes' : 'Saved'}</span><button type="button" className="admin-text-button" disabled={state === 'saving' || !dirty} onClick={onReset}>Cancel</button><button type="button" className="admin-primary-button" disabled={state === 'saving' || !dirty} onClick={onSave}>{state === 'saving' ? 'Saving...' : 'Save changes'}</button></div>
  </div>;
}

function MediaSelectorField({
  id,
  label,
  helpText,
  value,
  mediaList,
  allowedTypes,
  error,
  onChange,
}: {
  id: keyof HomepageVisuals;
  label: string;
  helpText: string;
  value: string | null;
  mediaList: AdminUiMediaDto[];
  allowedTypes?: Array<'image' | 'video'>;
  error?: string[];
  onChange: (mediaId: string | null) => void;
}) {
  const currentAsset = value ? mediaList.find((asset) => asset.id === value) : undefined;
  const isUnavailable = Boolean(value && !currentAsset);
  const filteredList = allowedTypes ? mediaList.filter((asset) => allowedTypes.includes(asset.type as 'image' | 'video')) : mediaList;

  return (
    <div className="admin-field admin-visual-selector-field" style={{ marginBottom: '1.5rem' }}>
      <label htmlFor={`visual-${id}`} style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
        {label}
      </label>
      <p className="admin-field-help" style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>
        {helpText}
      </p>

      {/* Asset Preview & Name */}
      <div className="admin-media-preview-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        {currentAsset ? (
          <div style={{ width: 80, height: 50, borderRadius: 4, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentAsset.type === 'video' ? (
              <video src={currentAsset.reference} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
            ) : (
              <img src={currentAsset.reference} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
        ) : isUnavailable ? (
          <div className="admin-badge admin-badge-warning" style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: '#fff3cd', color: '#856404', fontSize: '0.85rem' }}>
            Asset unavailable
          </div>
        ) : null}

        {currentAsset ? (
          <span className="admin-media-name" style={{ fontWeight: 500 }}>
            {getMediaDisplayName(currentAsset)}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <select
          id={`visual-${id}`}
          className="admin-select"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          style={{ flex: 1, padding: '0.5rem', borderRadius: 4 }}
        >
          <option value="">-- Choose from Media Library --</option>
          {filteredList.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {getMediaDisplayName(asset)} ({asset.type})
            </option>
          ))}
        </select>
        {value ? (
          <button type="button" className="admin-text-button" onClick={() => onChange(null)}>
            Clear
          </button>
        ) : null}
      </div>

      {error?.map((msg) => (
        <p className="admin-field-error" key={msg} style={{ color: '#d9534f', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {msg}
        </p>
      ))}
    </div>
  );
}

export function HomepageVisualsForm({
  draft,
  saved,
  mediaList,
  state,
  error,
  validationErrors,
  onChange,
  onReset,
  onSave,
}: {
  draft: HomepageVisuals;
  saved: HomepageVisuals;
  mediaList: AdminUiMediaDto[];
  state: 'ready' | 'saving' | 'error';
  error: AdminUiError | null;
  validationErrors: Record<string, string[]>;
  onChange: (field: keyof HomepageVisuals, value: string | null) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const dirty = isHomepageVisualsDirty(draft, saved);
  const serverErrors = fieldErrors(error);
  const combinedErrors = { ...serverErrors, ...validationErrors };
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="admin-editor" style={{ marginTop: '2rem' }}>
      <section className="admin-section" aria-labelledby="homepage-visuals-title">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Visuals</p>
            <h2 id="homepage-visuals-title">Homepage visuals</h2>
            <p className="admin-section-description">
              Select media assets from the Media Library to use for the homepage background video/image, poster, and introduction image.
            </p>
          </div>
        </div>

        <MediaSelectorField
          id="heroVisualMediaId"
          label="Hero visual"
          helpText="Background video or image displayed at the top of the homepage hero section."
          value={draft.heroVisualMediaId}
          mediaList={mediaList}
          allowedTypes={['image', 'video']}
          error={combinedErrors.heroVisualMediaId}
          onChange={(val) => onChange('heroVisualMediaId', val)}
        />

        <MediaSelectorField
          id="heroPosterMediaId"
          label="Hero video poster or fallback image"
          helpText="Image displayed while hero video is loading, or as a background fallback."
          value={draft.heroPosterMediaId}
          mediaList={mediaList}
          allowedTypes={['image']}
          error={combinedErrors.heroPosterMediaId}
          onChange={(val) => onChange('heroPosterMediaId', val)}
        />

        <MediaSelectorField
          id="identityVisualMediaId"
          label="Introduction image"
          helpText="Image displayed in the two-column homepage introduction section."
          value={draft.identityVisualMediaId}
          mediaList={mediaList}
          allowedTypes={['image']}
          error={combinedErrors.identityVisualMediaId}
          onChange={(val) => onChange('identityVisualMediaId', val)}
        />
      </section>

      <div className="admin-editor-actions">
        <span className="admin-save-state" aria-live="polite">
          {state === 'saving' ? 'Saving...' : state === 'error' ? 'Save failed' : dirty ? 'Unsaved changes' : 'Saved'}
        </span>
        <button type="button" className="admin-text-button" disabled={state === 'saving' || !dirty} onClick={onReset}>
          Cancel
        </button>
        <button
          type="button"
          className="admin-primary-button"
          disabled={state === 'saving' || !dirty || hasValidationErrors}
          onClick={onSave}
        >
          {state === 'saving' ? 'Saving...' : 'Save visual changes'}
        </button>
      </div>
    </div>
  );
}

export function HomepageContentEditor({ serverActions }: { serverActions: ServerActions }) {
  const [contentDraft, setContentDraft] = useState<HomepageContent>(emptyContent);
  const [contentSaved, setContentSaved] = useState<HomepageContent>(emptyContent);
  const [contentState, setContentState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [contentError, setContentError] = useState<AdminUiError | null>(null);

  const [visualsDraft, setVisualsDraft] = useState<HomepageVisuals>(emptyVisuals);
  const [visualsSaved, setVisualsSaved] = useState<HomepageVisuals>(emptyVisuals);
  const [visualsState, setVisualsState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [visualsError, setVisualsError] = useState<AdminUiError | null>(null);

  const [mediaList, setMediaList] = useState<AdminUiMediaDto[]>([]);

  const load = async () => {
    const [cVal, vVal, mList] = await Promise.all([
      serverActions.readAdminHomepageContent().then(unwrapAdminAction),
      serverActions.readAdminHomepageVisuals ? serverActions.readAdminHomepageVisuals().then(unwrapAdminAction) : Promise.resolve(emptyVisuals),
      serverActions.readAdminMedia ? serverActions.readAdminMedia().then(unwrapAdminAction) : Promise.resolve([]),
    ]);

    setContentDraft(clone(cVal));
    setContentSaved(clone(cVal));
    setContentError(null);
    setContentState('ready');

    setVisualsDraft(clone(vVal));
    setVisualsSaved(clone(vVal));
    setVisualsError(null);
    setVisualsState('ready');

    setMediaList(mList);
  };

  useEffect(() => {
    load().catch((nextError) => {
      setContentError(nextError as AdminUiError);
      setContentState('error');
      setVisualsError(nextError as AdminUiError);
      setVisualsState('error');
    });
  }, []);

  const updateContent = (field: keyof HomepageContent, locale: 'fr' | 'en' | 'ar', value: string) => {
    setContentDraft((current) => ({ ...current, [field]: { ...current[field], [locale]: value } }));
    setContentError(null);
  };

  const saveContent = async () => {
    setContentState('saving');
    setContentError(null);
    try {
      const value = await serverActions.saveAdminHomepageContent(contentDraft).then(unwrapAdminAction);
      setContentDraft(clone(value));
      setContentSaved(clone(value));
      setContentState('ready');
    } catch (nextError) {
      setContentError(nextError as AdminUiError);
      setContentState('error');
    }
  };

  const resetContent = () => {
    setContentDraft(clone(contentSaved));
    setContentError(null);
    setContentState('ready');
  };

  const updateVisuals = (field: keyof HomepageVisuals, value: string | null) => {
    setVisualsDraft((current) => ({ ...current, [field]: value }));
    setVisualsError(null);
  };

  const saveVisuals = async () => {
    if (!serverActions.saveAdminHomepageVisuals) return;
    setVisualsState('saving');
    setVisualsError(null);
    try {
      const value = await serverActions.saveAdminHomepageVisuals(visualsDraft).then(unwrapAdminAction);
      setVisualsDraft(clone(value));
      setVisualsSaved(clone(value));
      setVisualsState('ready');
    } catch (nextError) {
      setVisualsError(nextError as AdminUiError);
      setVisualsState('error');
    }
  };

  const resetVisuals = () => {
    setVisualsDraft(clone(visualsSaved));
    setVisualsError(null);
    setVisualsState('ready');
  };

  if (contentState === 'loading' || visualsState === 'loading') {
    return <p className="admin-placeholder">Loading homepage settings...</p>;
  }

  const visualValidationErrors = validateHomepageVisuals(visualsDraft, mediaList);

  return (
    <div>
      <HomepageContentForm
        draft={contentDraft}
        saved={contentSaved}
        state={contentState}
        error={contentError}
        onChange={updateContent}
        onReset={resetContent}
        onSave={() => void saveContent()}
      />

      <HomepageVisualsForm
        draft={visualsDraft}
        saved={visualsSaved}
        mediaList={mediaList}
        state={visualsState}
        error={visualsError}
        validationErrors={visualValidationErrors}
        onChange={updateVisuals}
        onReset={resetVisuals}
        onSave={() => void saveVisuals()}
      />
    </div>
  );
}
