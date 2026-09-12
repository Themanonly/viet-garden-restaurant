'use client';

import { useEffect, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { AdminUiMediaDto } from '../content/admin-menu-ui-adapter';
import type { AdminUiOrderingChannelCreateInput, AdminUiOrderingChannelDto, AdminUiOrderingChannelUpdateInput } from '../content/admin-restaurant-profile-ui-adapter';
import type { LocalizedText, OrderingChannelType } from '../content/models';
import { DestructiveActionDialog } from './destructive-action-dialog';
import { LocalizedFieldGroup } from './localized-field-group';

type ManagerState = 'loading' | 'ready' | 'saving' | 'error';
type OrderingDraft = AdminUiOrderingChannelCreateInput & { id: string };

type ServerActions = {
  readAdminOrderingChannels: () => Promise<AdminActionResult<AdminUiOrderingChannelDto[]>>;
  createAdminOrderingChannel: (input: AdminUiOrderingChannelCreateInput) => Promise<AdminActionResult<AdminUiOrderingChannelDto>>;
  updateAdminOrderingChannel: (id: string, input: AdminUiOrderingChannelUpdateInput) => Promise<AdminActionResult<AdminUiOrderingChannelDto>>;
  deleteAdminOrderingChannel: (id: string) => Promise<AdminActionResult<void>>;
  reorderAdminOrderingChannels: (ids: string[]) => Promise<AdminActionResult<AdminUiOrderingChannelDto[]>>;
  readAdminMedia: () => Promise<AdminActionResult<AdminUiMediaDto[]>>;
};

const channelTypes: Array<{ value: OrderingChannelType; label: string }> = [
  { value: 'glovo', label: 'Glovo' },
  { value: 'yassir', label: 'Yassir' },
  { value: 'uber-eats', label: 'Uber Eats' },
  { value: 'direct', label: 'Direct website ordering' },
  { value: 'whatsapp', label: 'WhatsApp ordering' },
  { value: 'other', label: 'Other / custom' },
];
const emptyLabel: LocalizedText = { fr: '', en: '', ar: '' };

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'info' in error && error.info && typeof error.info === 'object' && 'message' in error.info) return String(error.info.message);
  return error instanceof Error ? error.message : 'The ordering channels could not be loaded.';
}

function move<T extends { id: string }>(entries: T[], index: number, direction: -1 | 1): T[] | null {
  const target = index + direction;
  if (target < 0 || target >= entries.length) return null;
  const next = [...entries];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function emptyDraft(sortOrder: number): OrderingDraft {
  return { id: '', name: { ...emptyLabel }, type: 'other', url: '', description: {}, ctaText: {}, enabled: true, sortOrder };
}

function toDraft(channel: AdminUiOrderingChannelDto): OrderingDraft {
  return { ...channel, name: { ...channel.name }, description: { ...channel.description }, ctaText: { ...channel.ctaText } };
}

export function OrderingChannelsManager({ serverActions }: { serverActions: ServerActions }) {
  const [channels, setChannels] = useState<AdminUiOrderingChannelDto[]>([]);
  const [media, setMedia] = useState<AdminUiMediaDto[]>([]);
  const [draft, setDraft] = useState<OrderingDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, setState] = useState<ManagerState>('loading');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUiOrderingChannelDto | null>(null);
  const [deleteState, setDeleteState] = useState<'idle' | 'submitting'>('idle');

  const load = async () => {
    const [nextChannels, nextMedia] = await Promise.all([
      serverActions.readAdminOrderingChannels().then(unwrapAdminAction),
      serverActions.readAdminMedia().then(unwrapAdminAction),
    ]);
    setChannels(nextChannels.sort((first, second) => first.sortOrder - second.sortOrder));
    setMedia(nextMedia.filter((asset) => asset.visible).sort((first, second) => first.sortOrder - second.sortOrder));
  };

  useEffect(() => { load().then(() => setState('ready')).catch((nextError) => { setError(errorMessage(nextError)); setState('error'); }); }, []);

  const save = async () => {
    if (!draft) return;
    setState('saving'); setError('');
    try {
      const { id: _id, ...input } = draft;
      if (editingId) await serverActions.updateAdminOrderingChannel(editingId, input).then(unwrapAdminAction);
      else await serverActions.createAdminOrderingChannel(input).then(unwrapAdminAction);
      await load(); setDraft(null); setEditingId(null); setState('ready');
    } catch (nextError) { setError(errorMessage(nextError)); setState('error'); }
  };

  const reorder = async (index: number, direction: -1 | 1) => {
    const next = move(channels, index, direction); if (!next) return;
    setState('saving'); setError('');
    try { setChannels(await serverActions.reorderAdminOrderingChannels(next.map((channel) => channel.id)).then(unwrapAdminAction)); setState('ready'); } catch (nextError) { setError(errorMessage(nextError)); setState('error'); }
  };

  const confirmDeleteChannel = async () => {
    if (!deleteTarget) return;
    setDeleteState('submitting');
    setState('saving');
    try {
      await serverActions.deleteAdminOrderingChannel(deleteTarget.id).then(unwrapAdminAction);
      setDeleteTarget(null);
      await load();
      setState('ready');
    } catch (nextError) {
      setError(errorMessage(nextError));
      setState('error');
    } finally {
      setDeleteState('idle');
    }
  };

  if (state === 'loading') return <p className="admin-placeholder">Loading ordering channels...</p>;
  if (state === 'error' && !draft) return <section className="admin-validation-summary is-visible"><h2>Unable to load ordering channels</h2><p>{error}</p></section>;

  return <section className="admin-contact-social-section" aria-labelledby="ordering-channels-title">
    {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Ordering channel action failed</h2><p>{error}</p></section> : null}
    <div className="admin-list-toolbar"><div><p className="admin-eyebrow">Ordering</p><p id="ordering-channels-title" className="admin-list-count">{channels.length} ordering channels</p></div><button type="button" className="admin-primary-button" onClick={() => { setDraft(emptyDraft(channels.length)); setEditingId(null); setError(''); }}>Add ordering channel</button></div>
    <div className="admin-item-list">{channels.map((channel, index) => <article className="admin-item-row" key={channel.id}><div className="admin-item-order">{index + 1}</div><div className="admin-item-main"><div className="admin-item-title"><h2>{channel.name.en}</h2><span className={channel.enabled ? 'admin-state is-active' : 'admin-state'}>{channel.enabled ? 'Enabled' : 'Disabled'}</span></div><p className="admin-item-meta"><span>{channel.type}</span><span>{channel.url}</span><span>ID: {channel.id}</span></p></div><div className="admin-item-actions"><button type="button" className="admin-icon-button" disabled={state === 'saving' || index === 0} onClick={() => reorder(index, -1)} aria-label="Move ordering channel up">Up</button><button type="button" className="admin-icon-button" disabled={state === 'saving' || index === channels.length - 1} onClick={() => reorder(index, 1)} aria-label="Move ordering channel down">Down</button><button type="button" className="admin-text-button" onClick={() => { setDraft(toDraft(channel)); setEditingId(channel.id); setError(''); }}>Edit</button><button type="button" className="admin-text-button" onClick={async () => { setState('saving'); try { await serverActions.updateAdminOrderingChannel(channel.id, { enabled: !channel.enabled }).then(unwrapAdminAction); await load(); setState('ready'); } catch (nextError) { setError(errorMessage(nextError)); setState('error'); } }}>{channel.enabled ? 'Disable' : 'Enable'}</button><button type="button" className="admin-text-button is-danger" onClick={() => setDeleteTarget(channel)}>Remove</button></div></article>)}</div>
    {draft ? <OrderingChannelEditor draft={draft} editingId={editingId} media={media} busy={state === 'saving'} onChange={setDraft} onCancel={() => { setDraft(null); setEditingId(null); }} onSave={save} /> : null}
    {deleteTarget ? <DestructiveActionDialog open title="Remove this ordering channel?" description={`This removes “${deleteTarget.name.en || deleteTarget.name.fr || deleteTarget.type}” from the ordering options.`} warning="This action cannot be undone." confirmLabel="Remove channel" isSubmitting={deleteState === 'submitting'} onCancel={() => { setDeleteTarget(null); setDeleteState('idle'); }} onConfirm={confirmDeleteChannel} /> : null}
  </section>;
}

function OrderingChannelEditor({ draft, editingId, media, busy, onChange, onCancel, onSave }: { draft: OrderingDraft; editingId: string | null; media: AdminUiMediaDto[]; busy: boolean; onChange: (draft: OrderingDraft) => void; onCancel: () => void; onSave: () => void }) {
  return <form className="admin-item-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}><div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Edit ordering channel' : 'New ordering channel'}</p><h2>{editingId ? 'Update ordering channel' : 'Create ordering channel'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div><p className="admin-field-hint-text">ID generated automatically when saved.</p><div className="admin-item-editor-grid"><label className="admin-select-field">Type<select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as OrderingChannelType })}>{channelTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="admin-field">URL or deep link<input required type="url" value={draft.url} onChange={(event) => onChange({ ...draft, url: event.target.value })} /></label><label className="admin-select-field">Logo/icon media<select value={draft.logoMediaId ?? ''} onChange={(event) => onChange({ ...draft, logoMediaId: event.target.value || undefined })}><option value="">No media</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.reference}</option>)}</select></label><label className="admin-checkbox-label"><input type="checkbox" checked={draft.enabled} onChange={(event) => onChange({ ...draft, enabled: event.target.checked })} /> Enabled</label></div><LocalizedFieldGroup id="ordering-name" label="Name" value={draft.name} errors={{}} onChange={(locale, value) => onChange({ ...draft, name: { ...draft.name, [locale]: value } })} /><LocalizedFieldGroup id="ordering-description" label="Description (optional)" value={draft.description ?? {}} errors={{}} onChange={(locale, value) => onChange({ ...draft, description: { ...draft.description, [locale]: value } })} /><LocalizedFieldGroup id="ordering-cta" label="Custom CTA text (optional)" value={draft.ctaText ?? {}} errors={{}} onChange={(locale, value) => onChange({ ...draft, ctaText: { ...draft.ctaText, [locale]: value } })} /><div className="admin-editor-actions"><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save ordering channel'}</button></div></form>;
}
