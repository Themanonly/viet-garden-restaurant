'use client';

import { useEffect, useMemo, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { LocalizedText, Locale, RestaurantProfile } from '../content/models';
import { LocalizedFieldGroup } from './localized-field-group';

type BusinessDraft = Pick<RestaurantProfile, 'name' | 'description' | 'address' | 'city' | 'postalCode' | 'googleMapsUrl'>;

type ServerActions = {
  readProfile: () => Promise<AdminActionResult<RestaurantProfile>>;
  saveProfile: (input: Partial<BusinessDraft>) => Promise<AdminActionResult<RestaurantProfile>>;
};

function emptyDraft(): BusinessDraft {
  return {
    name: { fr: '', en: '', ar: '' },
    description: { fr: '', en: '', ar: '' },
    address: { fr: '', en: '', ar: '' },
    city: '',
    postalCode: '',
    googleMapsUrl: '',
  };
}

function cloneDraft(profile: RestaurantProfile): BusinessDraft {
  return {
    name: { ...profile.name },
    description: { ...profile.description },
    address: { ...profile.address },
    city: profile.city,
    postalCode: profile.postalCode,
    googleMapsUrl: profile.googleMapsUrl ?? '',
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
            <p className="admin-eyebrow">Address and location</p>
            <h2 id="business-location-title">Help customers find you</h2>
            <p className="admin-section-description">The address appears in the Find Us section. The map link opens Google Maps.</p>
          </div>
        </div>

        <LocalizedFieldGroup id="business-address" label="Address" helpText="Enter the address customers should see for this language." value={draft.address} required onChange={(locale, value) => updateDraft({ ...draft, address: updateLocalizedText(draft.address, locale, value) })} />

        <div className="admin-item-editor-grid" style={{ marginTop: '1rem' }}>
          <label className="admin-field">
            <span>City or town</span>
            <input value={draft.city} required onChange={(event) => updateDraft({ ...draft, city: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Postal code</span>
            <input value={draft.postalCode} required onChange={(event) => updateDraft({ ...draft, postalCode: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Google Maps link</span>
            <input value={draft.googleMapsUrl ?? ''} onChange={(event) => updateDraft({ ...draft, googleMapsUrl: event.target.value })} />
          </label>
        </div>
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
