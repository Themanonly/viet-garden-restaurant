'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminUiAvailabilityInput, AdminUiError, AdminUiManagementStateDto } from '../content/admin-menu-ui-adapter';
import type { AdminMenuUiAdapter } from '../content/admin-menu-ui-adapter';
import type { AdminActionResult } from '../content/admin-menu-actions';
import { unwrapAdminAction } from '../content/admin-action-client';
import { LocalizedFieldGroup } from './localized-field-group';
import { ScheduleEditor } from './schedule-editor';

type EditorState = 'loading' | 'ready' | 'saving' | 'saved' | 'validation-error' | 'error';

type StatusOperations = Pick<AdminMenuUiAdapter, 'getManagementState' | 'updateAvailability'>;
export type StatusServerActions = {
  getManagementState: () => Promise<AdminActionResult<Awaited<ReturnType<AdminMenuUiAdapter['getManagementState']>>>>;
  updateAvailability: (input: AdminUiAvailabilityInput) => Promise<AdminActionResult<Awaited<ReturnType<AdminMenuUiAdapter['getManagementState']>>>>;
};
type RestaurantStatusEditorProps = { adapter?: StatusOperations; serverActions?: StatusServerActions };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getStatusRule(state: AdminUiManagementStateDto): string {
  if (state.availability.temporaryClosure.active) return 'Temporary closure';
  if (state.availability.manualOverride !== 'none') return 'Manual override';
  if (Object.values(state.availability.schedule).some((periods) => periods.length > 0)) return 'Weekly schedule';
  return 'Explicit fallback';
}

export function getStatusLabel(status: AdminUiManagementStateDto['effectiveStatus']): string {
  return status === 'open' ? 'OPEN' : 'CLOSED';
}

export function getFieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path, [field.message]]));
}

function errorFromUnknown(error: unknown): AdminUiError {
  if (error && typeof error === 'object' && 'info' in error) return error as AdminUiError;
  const message = error instanceof Error ? error.message : 'The restaurant status could not be loaded.';
  return Object.assign(new Error(message), { info: { code: 'admin-availability-operation-failed', message, resource: 'availability' } }) as AdminUiError;
}

export async function saveAvailability(adapter: StatusOperations, availability: AdminUiAvailabilityInput) {
  await adapter.updateAvailability(availability);
  return adapter.getManagementState();
}

export function RestaurantStatusEditor({ adapter, serverActions }: RestaurantStatusEditorProps) {
  const operations = useMemo(() => adapter ?? (serverActions ? {
    getManagementState: () => serverActions.getManagementState().then(unwrapAdminAction),
    updateAvailability: (input: AdminUiAvailabilityInput) => serverActions.updateAvailability(input).then(unwrapAdminAction),
  } : undefined), [adapter, serverActions]);
  if (!operations) throw new Error('Restaurant status operations are not configured.');
  const [state, setState] = useState<AdminUiManagementStateDto | null>(null);
  const [draft, setDraft] = useState<AdminUiAvailabilityInput | null>(null);
  const [editorState, setEditorState] = useState<EditorState>('loading');
  const [error, setError] = useState<AdminUiError | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    let active = true;
    operations.getManagementState().then((nextState) => {
      if (!active) return;
      setState(nextState);
      setDraft(clone(nextState.availability));
      setEditorState('ready');
      setHasUnsavedChanges(false);
    }).catch((nextError: unknown) => {
      if (!active) return;
      setError(errorFromUnknown(nextError));
      setEditorState('error');
    });
    return () => { active = false; };
  }, []);

  if (editorState === 'error') return <ValidationSummary error={error ?? errorFromUnknown(null)} />;
  if (editorState === 'loading' || !state || !draft) return <p className="admin-placeholder">Loading restaurant status...</p>;

  const fieldErrors = getFieldErrors(error);
  const updateDraft = (nextDraft: AdminUiAvailabilityInput) => {
    setDraft(nextDraft);
    setEditorState('ready');
    setError(null);
    setHasUnsavedChanges(true);
  };
  const updateLocalized = (key: 'temporaryClosure' | 'statusMessage', locale: 'fr' | 'en' | 'ar', value: string) => updateDraft({ ...draft, [key]: key === 'temporaryClosure' ? { ...draft.temporaryClosure, message: { ...draft.temporaryClosure.message, [locale]: value } } : { ...draft.statusMessage, [locale]: value } });
  const handleSave = async () => {
    setEditorState('saving');
    setError(null);
    try {
      const refreshed = await operations.updateAvailability(draft);
      setState(refreshed);
      setDraft(clone(refreshed.availability));
      setEditorState('saved');
      setHasUnsavedChanges(false);
    } catch (nextError) {
      const applicationError = nextError as AdminUiError;
      setError(applicationError);
      setEditorState(applicationError?.info?.fields?.length ? 'validation-error' : 'error');
    }
  };

  return (
    <div className="admin-editor">
      <section className="admin-status-overview" aria-labelledby="effective-status-title">
        <div><p className="admin-eyebrow">Current effective status</p><h2 id="effective-status-title" className={`admin-status-value is-${state.effectiveStatus}`}>{getStatusLabel(state.effectiveStatus)}</h2><p className="admin-rule">Determined by: <strong>{getStatusRule(state)}</strong></p></div>
        <span className={`admin-status-dot is-${state.effectiveStatus}`} aria-hidden="true" />
      </section>

      {error ? <ValidationSummary error={error} /> : null}

      <section className="admin-section" aria-labelledby="override-title">
        <div className="admin-section-heading"><div><p className="admin-eyebrow">Priority control</p><h2 id="override-title">Manual override</h2></div></div>
        <div className="admin-control-row">
          <label className="admin-checkbox-label"><input type="checkbox" checked={draft.manualOverride !== 'none'} onChange={(event) => updateDraft({ ...draft, manualOverride: event.target.checked ? 'open' : 'none' })} /> Enable manual override</label>
          <label className="admin-select-field">Stored status<select value={draft.manualOverride === 'none' ? draft.status : draft.manualOverride} disabled={draft.manualOverride === 'none'} onChange={(event) => updateDraft({ ...draft, manualOverride: event.target.value as 'open' | 'closed' })}><option value="open">Open</option><option value="closed">Closed</option></select></label>
        </div>
      </section>

      <ScheduleEditor schedule={draft.schedule} errors={fieldErrors} onChange={(schedule) => updateDraft({ ...draft, schedule })} />

      <section className="admin-section" aria-labelledby="closure-title">
        <div className="admin-section-heading"><div><p className="admin-eyebrow">Availability exception</p><h2 id="closure-title">Temporary closure</h2></div></div>
        <label className="admin-checkbox-label"><input type="checkbox" checked={draft.temporaryClosure.active} onChange={(event) => updateDraft({ ...draft, temporaryClosure: { ...draft.temporaryClosure, active: event.target.checked } })} /> Temporary closure active</label>
        <LocalizedFieldGroup id="temporaryClosure.message" label="Closure message" value={draft.temporaryClosure.message} errors={fieldErrors} onChange={(locale, value) => updateLocalized('temporaryClosure', locale, value)} />
      </section>

      <section className="admin-section" aria-labelledby="message-title">
        <div className="admin-section-heading"><div><p className="admin-eyebrow">Public-facing content</p><h2 id="message-title">Status message</h2></div></div>
        <LocalizedFieldGroup id="statusMessage" label="Status message" value={draft.statusMessage} errors={fieldErrors} onChange={(locale, value) => updateLocalized('statusMessage', locale, value)} />
      </section>

      <div className="admin-editor-actions"><span className={`admin-save-state is-${editorState}`} aria-live="polite">{editorState === 'saving' ? 'Saving...' : editorState === 'saved' ? 'Saved' : editorState === 'validation-error' ? 'Validation error' : hasUnsavedChanges ? 'Unsaved changes' : ''}</span><button type="button" className="admin-primary-button" onClick={handleSave} disabled={editorState === 'saving' || !hasUnsavedChanges}>{editorState === 'saving' ? 'Saving...' : 'Save changes'}</button></div>
    </div>
  );
}

function ValidationSummary({ error }: { error: AdminUiError }) {
  return <section className="admin-validation-summary is-visible" aria-live="assertive" aria-labelledby="validation-title"><h2 id="validation-title">Unable to save changes</h2><p>{error.message}</p>{error.info.fields?.length ? <ul>{error.info.fields.map((field) => <li key={field.path}><strong>{field.path}</strong>: {field.message}</li>)}</ul> : null}</section>;
}