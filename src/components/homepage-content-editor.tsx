'use client';

import { useEffect, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { HomepageContent } from '../content/site-settings';
import { LocalizedFieldGroup } from './localized-field-group';
import type { AdminUiError } from '../content/admin-menu-ui-adapter';

const emptyContent: HomepageContent = {
  heroEyebrow: { fr: '', en: '', ar: '' },
  heroStatement: { fr: '', en: '', ar: '' },
  identityEyebrow: { fr: '', en: '', ar: '' },
  identityTitle: { fr: '', en: '', ar: '' },
};

type ServerActions = {
  readAdminHomepageContent: () => Promise<AdminActionResult<HomepageContent>>;
  saveAdminHomepageContent: (content: HomepageContent) => Promise<AdminActionResult<HomepageContent>>;
};

function clone(value: HomepageContent): HomepageContent { return structuredClone(value); }
function fieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path.replace(/^homepageContent\./, ''), [field.message]]));
}

export function HomepageContentEditor({ serverActions }: { serverActions: ServerActions }) {
  const [draft, setDraft] = useState<HomepageContent>(emptyContent);
  const [saved, setSaved] = useState<HomepageContent>(emptyContent);
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState<AdminUiError | null>(null);

  const load = async () => {
    const value = await serverActions.readAdminHomepageContent().then(unwrapAdminAction);
    setDraft(clone(value)); setSaved(clone(value)); setError(null); setState('ready');
  };
  useEffect(() => { load().catch((nextError) => { setError(nextError as AdminUiError); setState('error'); }); }, []);

  const update = (field: keyof HomepageContent, locale: 'fr' | 'en' | 'ar', value: string) => {
    setDraft((current) => ({ ...current, [field]: { ...current[field], [locale]: value } }));
    setError(null);
  };
  const save = async () => {
    setState('saving'); setError(null);
    try { const value = await serverActions.saveAdminHomepageContent(draft).then(unwrapAdminAction); setDraft(clone(value)); setSaved(clone(value)); setState('ready'); }
    catch (nextError) { setError(nextError as AdminUiError); setState('error'); }
  };
  const reset = () => { setDraft(clone(saved)); setError(null); setState('ready'); };
  const errors = fieldErrors(error);
  if (state === 'loading') return <p className="admin-placeholder">Loading homepage content...</p>;

  return <div className="admin-editor">
    {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Homepage content could not be saved</h2><p>{error.message}</p></section> : null}
    <section className="admin-section" aria-labelledby="homepage-content-title">
      <div className="admin-section-heading"><div><p className="admin-eyebrow">Content</p><h2 id="homepage-content-title">Homepage marketing text</h2><p className="admin-section-description">Manage the short text shown in the homepage hero and introduction. Business details, buttons, locations, and media are managed elsewhere.</p></div></div>
      <LocalizedFieldGroup id="heroEyebrow" label="Hero small heading" helpText="The short line above the homepage business name." value={draft.heroEyebrow} errors={errors} required onChange={(locale, value) => update('heroEyebrow', locale, value)} />
      <LocalizedFieldGroup id="heroStatement" label="Hero statement" helpText="The short promise beneath the homepage business name." value={draft.heroStatement} errors={errors} required onChange={(locale, value) => update('heroStatement', locale, value)} />
      <LocalizedFieldGroup id="identityEyebrow" label="Introduction small heading" helpText="The short line above the homepage introduction title." value={draft.identityEyebrow} errors={errors} required onChange={(locale, value) => update('identityEyebrow', locale, value)} />
      <LocalizedFieldGroup id="identityTitle" label="Introduction title" helpText="The main title of the homepage introduction." value={draft.identityTitle} errors={errors} required onChange={(locale, value) => update('identityTitle', locale, value)} />
    </section>
    <div className="admin-editor-actions"><span className="admin-save-state" aria-live="polite">{state === 'saving' ? 'Saving...' : state === 'error' ? 'Save failed' : 'Saved'}</span><button type="button" className="admin-text-button" disabled={state === 'saving'} onClick={reset}>Cancel</button><button type="button" className="admin-primary-button" disabled={state === 'saving'} onClick={() => void save()}>{state === 'saving' ? 'Saving...' : 'Save changes'}</button></div>
  </div>;
}
