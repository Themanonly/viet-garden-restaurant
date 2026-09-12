'use client';

import { useEffect, useMemo, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { LocalizedText, Locale, RestaurantProfile } from '../content/models';
import { LocalizedFieldGroup } from './localized-field-group';

type BusinessDraft = Pick<RestaurantProfile, 'name' | 'description' | 'address' | 'city' | 'postalCode' | 'country' | 'region' | 'googleMapsUrl' | 'businessType' | 'settings'>;

type ServerActions = {
  readProfile: () => Promise<AdminActionResult<RestaurantProfile>>;
  saveProfile: (input: Partial<BusinessDraft>) => Promise<AdminActionResult<RestaurantProfile>>;
};

const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: 'fr', label: 'French' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
];

function emptyDraft(): BusinessDraft {
  return {
    name: { fr: '', en: '', ar: '' },
    description: { fr: '', en: '', ar: '' },
    address: { fr: '', en: '', ar: '' },
    city: '',
    postalCode: '',
    country: '',
    region: '',
    googleMapsUrl: '',
    businessType: '',
    settings: { currency: '', timezone: '', defaultLocale: 'fr', supportedLocales: ['fr', 'en', 'ar'] },
  };
}

function cloneDraft(profile: RestaurantProfile): BusinessDraft {
  return {
    name: { ...profile.name },
    description: { ...profile.description },
    address: { ...profile.address },
    city: profile.city,
    postalCode: profile.postalCode,
    country: profile.country ?? '',
    region: profile.region ?? '',
    googleMapsUrl: profile.googleMapsUrl ?? '',
    businessType: profile.businessType ?? '',
    settings: {
      currency: profile.settings?.currency ?? '',
      timezone: profile.settings?.timezone ?? '',
      defaultLocale: profile.settings?.defaultLocale ?? 'fr',
      supportedLocales: profile.settings?.supportedLocales ?? ['fr', 'en', 'ar'],
      reservationsAvailable: profile.settings?.reservationsAvailable ?? false,
      deliveryEnabled: profile.settings?.deliveryEnabled ?? false,
      pickupEnabled: profile.settings?.pickupEnabled ?? false,
    },
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

  const toggleLocale = (locale: Locale) => {
    if (!draft?.settings) return;
    const supported = new Set<Locale>(draft.settings.supportedLocales ?? ['fr', 'en', 'ar']);
    const next: Locale[] = supported.has(locale)
      ? Array.from(supported).filter((item) => item !== locale)
      : [...Array.from(supported), locale];
    updateDraft({ ...draft, settings: { ...draft.settings, supportedLocales: next } });
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
            <h2 id="business-identity-title">Profile details</h2>
          </div>
        </div>

        <LocalizedFieldGroup id="business-name" label="Business name" value={draft.name} onChange={(locale, value) => updateDraft({ ...draft, name: updateLocalizedText(draft.name, locale, value) })} />
        <LocalizedFieldGroup id="business-description" label="Business description" value={draft.description} onChange={(locale, value) => updateDraft({ ...draft, description: updateLocalizedText(draft.description, locale, value) })} />
        <LocalizedFieldGroup id="business-address" label="Business address" value={draft.address} onChange={(locale, value) => updateDraft({ ...draft, address: updateLocalizedText(draft.address, locale, value) })} />

        <div className="admin-item-editor-grid" style={{ marginTop: '1rem' }}>
          <label className="admin-field">
            <span>City</span>
            <input value={draft.city} onChange={(event) => updateDraft({ ...draft, city: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Postal code</span>
            <input value={draft.postalCode} onChange={(event) => updateDraft({ ...draft, postalCode: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Country</span>
            <input value={draft.country ?? ''} onChange={(event) => updateDraft({ ...draft, country: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Region</span>
            <input value={draft.region ?? ''} onChange={(event) => updateDraft({ ...draft, region: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Business type</span>
            <input value={draft.businessType ?? ''} onChange={(event) => updateDraft({ ...draft, businessType: event.target.value })} />
          </label>
          <label className="admin-field">
            <span>Google Maps URL</span>
            <input value={draft.googleMapsUrl ?? ''} onChange={(event) => updateDraft({ ...draft, googleMapsUrl: event.target.value })} />
          </label>
        </div>
      </section>

      <section className="admin-section" aria-labelledby="business-settings-title">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Operations</p>
            <h2 id="business-settings-title">Business settings</h2>
          </div>
        </div>

        <div className="admin-item-editor-grid">
          <label className="admin-field">
            <span>Currency</span>
            <input value={draft.settings?.currency ?? ''} onChange={(event) => updateDraft({ ...draft, settings: { ...draft.settings, currency: event.target.value } })} />
          </label>
          <label className="admin-field">
            <span>Timezone</span>
            <input value={draft.settings?.timezone ?? ''} onChange={(event) => updateDraft({ ...draft, settings: { ...draft.settings, timezone: event.target.value } })} />
          </label>
          <label className="admin-select-field">
            <span>Default locale</span>
            <select value={draft.settings?.defaultLocale ?? 'fr'} onChange={(event) => updateDraft({ ...draft, settings: { ...draft.settings, defaultLocale: event.target.value as Locale } })}>
              {localeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="admin-localized-group" style={{ marginTop: '1rem' }}>
          <legend>Supported locales</legend>
          <div className="admin-control-row">
            {localeOptions.map((option) => {
              const checked = (draft.settings?.supportedLocales ?? ['fr', 'en', 'ar']).includes(option.value);
              return (
                <label key={option.value} className="admin-checkbox-label">
                  <input type="checkbox" checked={checked} onChange={() => toggleLocale(option.value)} />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="admin-control-row" style={{ marginTop: '1rem' }}>
          <label className="admin-checkbox-label"><input type="checkbox" checked={Boolean(draft.settings?.reservationsAvailable)} onChange={(event) => updateDraft({ ...draft, settings: { ...draft.settings, reservationsAvailable: event.target.checked } })} /> Reservations available</label>
          <label className="admin-checkbox-label"><input type="checkbox" checked={Boolean(draft.settings?.deliveryEnabled)} onChange={(event) => updateDraft({ ...draft, settings: { ...draft.settings, deliveryEnabled: event.target.checked } })} /> Delivery enabled</label>
          <label className="admin-checkbox-label"><input type="checkbox" checked={Boolean(draft.settings?.pickupEnabled)} onChange={(event) => updateDraft({ ...draft, settings: { ...draft.settings, pickupEnabled: event.target.checked } })} /> Pickup enabled</label>
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
