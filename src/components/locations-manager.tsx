'use client';

import { useEffect, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { AdminLocationCreateInput, AdminLocationDto, AdminLocationUpdateInput } from '../content/admin-location-ui-adapter';
import type { LocalizedText } from '../content/models';

type LocationDraft = AdminLocationCreateInput & { id: string };
type ServerActions = {
  readAdminLocations: () => Promise<AdminActionResult<AdminLocationDto[]>>;
  createAdminLocation: (input: AdminLocationCreateInput) => Promise<AdminActionResult<AdminLocationDto>>;
  updateAdminLocation: (id: string, input: AdminLocationUpdateInput) => Promise<AdminActionResult<AdminLocationDto>>;
  setAdminLocationEnabled: (id: string, enabled: boolean) => Promise<AdminActionResult<AdminLocationDto>>;
  setAdminLocationPrimary: (id: string) => Promise<AdminActionResult<AdminLocationDto>>;
  reorderAdminLocations: (ids: string[]) => Promise<AdminActionResult<AdminLocationDto[]>>;
  deleteAdminLocation: (id: string) => Promise<AdminActionResult<void>>;
};

const emptyLocalized: LocalizedText = { fr: '', en: '', ar: '' };

function messageFor(error: unknown): string {
  if (error && typeof error === 'object' && 'info' in error && error.info && typeof error.info === 'object' && 'message' in error.info) return String(error.info.message);
  return error instanceof Error ? error.message : 'The location action could not be completed.';
}

function draftFrom(location: AdminLocationDto): LocationDraft {
  return { ...location, name: { ...location.name }, address: { ...location.address } };
}

function newDraft(sortOrder: number): LocationDraft {
  return { id: '', name: { ...emptyLocalized }, address: { ...emptyLocalized }, city: '', postalCode: '', googleMapsUrl: '', isPrimary: false, enabled: true, sortOrder };
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] | null {
  const target = index + direction;
  if (target < 0 || target >= items.length) return null;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function LocationsManager({ serverActions }: { serverActions: ServerActions }) {
  const [locations, setLocations] = useState<AdminLocationDto[]>([]);
  const [draft, setDraft] = useState<LocationDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const next = await serverActions.readAdminLocations().then(unwrapAdminAction);
    setLocations(next.sort((first, second) => first.sortOrder - second.sortOrder));
  };

  useEffect(() => { load().catch((nextError) => setError(messageFor(nextError))).finally(() => setLoading(false)); }, []);

  const closeEditor = () => { setDraft(null); setEditingId(null); setError(''); };
  const save = async () => {
    if (!draft) return;
    setBusy(true); setError('');
    try {
      const { id: _id, ...input } = draft;
      if (editingId) await serverActions.updateAdminLocation(editingId, input).then(unwrapAdminAction);
      else await serverActions.createAdminLocation(input).then(unwrapAdminAction);
      await load(); closeEditor();
    } catch (nextError) { setError(messageFor(nextError)); } finally { setBusy(false); }
  };
  const updateAction = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); await load(); } catch (nextError) { setError(messageFor(nextError)); } finally { setBusy(false); }
  };
  const reorder = (index: number, direction: -1 | 1) => {
    const next = move(locations, index, direction);
    if (next) updateAction(() => serverActions.reorderAdminLocations(next.map((location) => location.id)).then(unwrapAdminAction));
  };

  if (loading) return <p className="admin-placeholder">Loading locations...</p>;
  return (
    <section className="admin-locations-manager" aria-labelledby="locations-manager-title">
      {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Location action failed</h2><p>{error}</p></section> : null}
      <div className="admin-list-toolbar"><div><p className="admin-eyebrow">Business</p><p id="locations-manager-title" className="admin-list-count">{locations.length} locations</p></div><button type="button" className="admin-primary-button" onClick={() => { setDraft(newDraft(locations.length)); setEditingId(null); setError(''); }}>Add location</button></div>
      <div className="admin-item-list">
        {locations.map((location, index) => {
          const label = location.name.en || location.name.fr || location.name.ar || 'Unnamed location';
          return <article className="admin-item-row admin-location-row" key={location.id}>
            <div className="admin-item-order">{index + 1}</div>
            <div className="admin-item-main"><div className="admin-item-title"><h2>{label}</h2>{location.isPrimary && location.enabled ? <span className="admin-state is-active">Primary</span> : null}<span className={location.enabled ? 'admin-state is-active' : 'admin-state'}>{location.enabled ? 'Shown on website' : 'Hidden'}</span></div><p className="admin-item-meta">{location.address.en || location.address.fr || location.address.ar} · {location.city} {location.postalCode}</p></div>
            <div className="admin-item-actions">
              {location.googleMapsUrl ? <a className="admin-text-button" href={location.googleMapsUrl} target="_blank" rel="noreferrer">Open map</a> : null}
              <button type="button" className="admin-icon-button" disabled={busy || index === 0} onClick={() => reorder(index, -1)} aria-label="Move location up">Up</button>
              <button type="button" className="admin-icon-button" disabled={busy || index === locations.length - 1} onClick={() => reorder(index, 1)} aria-label="Move location down">Down</button>
              {!location.isPrimary && location.enabled ? <button type="button" className="admin-text-button" disabled={busy} onClick={() => updateAction(() => serverActions.setAdminLocationPrimary(location.id).then(unwrapAdminAction))}>Make primary</button> : null}
              <button type="button" className="admin-text-button" disabled={busy} onClick={() => updateAction(() => serverActions.setAdminLocationEnabled(location.id, !location.enabled).then(unwrapAdminAction))}>{location.enabled ? 'Hide' : 'Show'}</button>
              <button type="button" className="admin-text-button" disabled={busy} onClick={() => { setDraft(draftFrom(location)); setEditingId(location.id); setError(''); }}>Edit</button>
              <button type="button" className="admin-text-button is-danger" disabled={busy} onClick={() => { if (window.confirm(`Remove ${label}?`)) updateAction(() => serverActions.deleteAdminLocation(location.id).then(unwrapAdminAction)); }}>Remove</button>
            </div>
          </article>;
        })}
      </div>
      {draft ? <LocationEditor draft={draft} editing={Boolean(editingId)} busy={busy} onChange={setDraft} onCancel={closeEditor} onSave={save} /> : null}
    </section>
  );
}

function LocationEditor({ draft, editing, busy, onChange, onCancel, onSave }: { draft: LocationDraft; editing: boolean; busy: boolean; onChange: (draft: LocationDraft) => void; onCancel: () => void; onSave: () => void }) {
  const setLocalized = (field: 'name' | 'address', locale: keyof LocalizedText, value: string) => onChange({ ...draft, [field]: { ...draft[field], [locale]: value } });
  return <form className="admin-item-editor admin-location-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <div className="admin-editor-heading"><div><p className="admin-eyebrow">{editing ? 'Edit location' : 'New location'}</p><h2>{editing ? 'Update location' : 'Create location'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div>
    <p className="admin-field-hint-text">Location IDs are generated automatically.</p>
    <fieldset><legend>Branch or location name</legend><div className="admin-localized-grid">{(['fr', 'en', 'ar'] as const).map((locale) => <label className="admin-field" key={`name-${locale}`}>{locale.toUpperCase()} *<input required value={draft.name[locale]} dir={locale === 'ar' ? 'rtl' : 'ltr'} onChange={(event) => setLocalized('name', locale, event.target.value)} /></label>)}</div></fieldset>
    <fieldset><legend>Address</legend><div className="admin-localized-grid">{(['fr', 'en', 'ar'] as const).map((locale) => <label className="admin-field" key={`address-${locale}`}>{locale.toUpperCase()} *<input required value={draft.address[locale]} dir={locale === 'ar' ? 'rtl' : 'ltr'} onChange={(event) => setLocalized('address', locale, event.target.value)} /></label>)}</div></fieldset>
    <div className="admin-item-editor-grid"><label className="admin-field">City<input required value={draft.city} onChange={(event) => onChange({ ...draft, city: event.target.value })} /></label><label className="admin-field">Postal code<input required value={draft.postalCode} onChange={(event) => onChange({ ...draft, postalCode: event.target.value })} /></label><label className="admin-field">Google Maps URL<input type="url" value={draft.googleMapsUrl ?? ''} onChange={(event) => onChange({ ...draft, googleMapsUrl: event.target.value })} /></label></div>
    <label className="admin-checkbox-label"><input type="checkbox" checked={draft.enabled} onChange={(event) => onChange({ ...draft, enabled: event.target.checked, isPrimary: event.target.checked ? draft.isPrimary : false })} /> Show on website</label>
    <label className="admin-checkbox-label"><input type="checkbox" checked={draft.isPrimary} disabled={!draft.enabled} onChange={(event) => onChange({ ...draft, isPrimary: event.target.checked })} /> Make primary location</label>
    <div className="admin-editor-actions"><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button></div>
  </form>;
}
