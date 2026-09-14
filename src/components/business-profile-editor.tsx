'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { LocalizedText, Locale, RestaurantProfile } from '../content/models';
import { LocalizedFieldGroup } from './localized-field-group';

type BusinessDraft = Pick<RestaurantProfile, 'name' | 'description'>;

type ServerActions = {
  readProfile: () => Promise<AdminActionResult<RestaurantProfile>>;
  saveProfile: (input: Partial<BusinessDraft>) => Promise<AdminActionResult<RestaurantProfile>>;
};

export const businessInformationLocationHref = '/admin/locations';
export const businessInformationEditableFields = ['name', 'description'] as const;

function emptyDraft(): BusinessDraft {
  return {
    name: { fr: '', en: '', ar: '' },
    description: { fr: '', en: '', ar: '' },
  };
}

function cloneDraft(profile: RestaurantProfile): BusinessDraft {
  return {
    name: { ...profile.name },
    description: { ...profile.description },
  };
}

function updateLocalizedText(current: LocalizedText, locale: Locale, value: string): LocalizedText {
  return { ...current, [locale]: value };
}

export function BusinessProfileEditor({ serverActions }: { serverActions: ServerActions }) {
  const [draft, setDraft] = useState<BusinessDraft | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const load = useMemo(() => async () => {
    const nextProfile = await serverActions.readProfile().then(unwrapAdminAction);
    setDraft(cloneDraft(nextProfile));
    setState('ready');
    setError('');
    setHasChanges(false);
  }, [serverActions]);

  useEffect(() => {
    void load().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : 'The business information could not be loaded.');
      setState('error');
    });
  }, [load]);

  const updateDraft = (nextDraft: BusinessDraft) => {
    setDraft(nextDraft);
    setHasChanges(true);
  };

  const save = async () => {
    if (!draft) return;
    setState('saving');
    setError('');
    try {
      await serverActions.saveProfile(draft).then(unwrapAdminAction);
      setState('ready');
      setHasChanges(false);
      const refreshed = await serverActions.readProfile().then(unwrapAdminAction);
      setDraft(cloneDraft(refreshed));
    } catch (nextError) {
      setState('error');
      setError(nextError instanceof Error ? nextError.message : 'The business information could not be saved.');
    }
  };

  if (state === 'loading' || !draft) return <p className="admin-placeholder">Loading business information...</p>;

  return (
    <div className="admin-editor">
      {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Business information action failed</h2><p>{error}</p></section> : null}

      <section className="admin-section" aria-labelledby="business-identity-title">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Business identity</p>
            <h2 id="business-identity-title">What customers see</h2>
            <p className="admin-section-description">These details appear on your website in the language selected by each visitor.</p>
          </div>
        </div>

        <LocalizedFieldGroup id="business-name" label="Business name" helpText="The name shown in the homepage heading and browser search information." value={draft.name} required onChange={(locale, value) => updateDraft({ ...draft, name: updateLocalizedText(draft.name, locale, value) })} />
        <LocalizedFieldGroup id="business-description" label="About the restaurant" helpText="This introduction appears in the About section of the homepage. Write two or three short sentences in each language." value={draft.description} required onChange={(locale, value) => updateDraft({ ...draft, description: updateLocalizedText(draft.description, locale, value) })} />
      </section>

      <section className="admin-section" aria-labelledby="business-location-title">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Locations</p>
            <h2 id="business-location-title">Manage customer locations</h2>
            <p className="admin-section-description">Addresses, cities, postal codes, and Maps links are managed in the Locations section.</p>
          </div>
        </div>
        <Link className="admin-secondary-button" href={businessInformationLocationHref}>Manage locations</Link>
      </section>

      <div className="admin-editor-actions">
        <span className="admin-save-state" aria-live="polite">{state === 'saving' ? 'Saving...' : hasChanges ? 'Unsaved changes' : 'Saved'}</span>
        <button type="button" className="admin-primary-button" disabled={state === 'saving' || !hasChanges} onClick={() => void save()}>
          {state === 'saving' ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
