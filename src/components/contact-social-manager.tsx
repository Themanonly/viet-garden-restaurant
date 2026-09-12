'use client';

import { useEffect, useState } from 'react';
import { unwrapAdminAction } from '../content/admin-action-client';
import type { AdminActionResult } from '../content/admin-menu-actions';
import type { AdminUiContactCreateInput, AdminUiContactDto, AdminUiContactUpdateInput, AdminUiSocialCreateInput, AdminUiSocialDto, AdminUiSocialUpdateInput } from '../content/admin-restaurant-profile-ui-adapter';
import type { LocalizedText, RestaurantContactType } from '../content/models';
import { DestructiveActionDialog } from './destructive-action-dialog';
import { LocalizedFieldGroup } from './localized-field-group';

type ManagerState = 'loading' | 'ready' | 'saving' | 'error';
type ContactDraft = AdminUiContactCreateInput & { id: string };
type SocialDraft = AdminUiSocialCreateInput & { id: string };

type ServerActions = {
  readAdminContacts: () => Promise<AdminActionResult<AdminUiContactDto[]>>;
  createAdminContact: (input: AdminUiContactCreateInput) => Promise<AdminActionResult<AdminUiContactDto>>;
  updateAdminContact: (id: string, input: AdminUiContactUpdateInput) => Promise<AdminActionResult<AdminUiContactDto>>;
  deleteAdminContact: (id: string) => Promise<AdminActionResult<void>>;
  reorderAdminContacts: (ids: string[]) => Promise<AdminActionResult<AdminUiContactDto[]>>;
  readAdminSocialLinks: () => Promise<AdminActionResult<AdminUiSocialDto[]>>;
  createAdminSocialLink: (input: AdminUiSocialCreateInput) => Promise<AdminActionResult<AdminUiSocialDto>>;
  updateAdminSocialLink: (id: string, input: AdminUiSocialUpdateInput) => Promise<AdminActionResult<AdminUiSocialDto>>;
  deleteAdminSocialLink: (id: string) => Promise<AdminActionResult<void>>;
  reorderAdminSocialLinks: (ids: string[]) => Promise<AdminActionResult<AdminUiSocialDto[]>>;
};

const contactTypes: RestaurantContactType[] = ['phone', 'whatsapp', 'email', 'fax', 'other'];
const emptyLabel: LocalizedText = { fr: '', en: '', ar: '' };
const contactLabels: Record<RestaurantContactType, LocalizedText> = {
  phone: { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' }, whatsapp: { fr: 'WhatsApp', en: 'WhatsApp', ar: 'واتساب' }, email: { fr: 'E-mail', en: 'Email', ar: 'البريد الإلكتروني' }, fax: { fr: 'Fax', en: 'Fax', ar: 'فاكس' }, other: { fr: 'Contact', en: 'Contact', ar: 'جهة اتصال' },
};
const socialPlatforms: Array<{ value: string; label: string; icon: string; names: LocalizedText }> = [
  { value: 'instagram', label: 'Instagram', icon: 'instagram', names: { fr: 'Instagram', en: 'Instagram', ar: 'Instagram' } },
  { value: 'facebook', label: 'Facebook', icon: 'facebook', names: { fr: 'Facebook', en: 'Facebook', ar: 'Facebook' } },
  { value: 'tiktok', label: 'TikTok', icon: 'tiktok', names: { fr: 'TikTok', en: 'TikTok', ar: 'تيك توك' } },
  { value: 'youtube', label: 'YouTube', icon: 'youtube', names: { fr: 'YouTube', en: 'YouTube', ar: 'يوتيوب' } },
  { value: 'custom', label: 'Custom', icon: '', names: { ...emptyLabel } },
];

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'info' in error && error.info && typeof error.info === 'object' && 'message' in error.info) return String(error.info.message);
  return error instanceof Error ? error.message : 'The contact and social data could not be loaded.';
}

function move<T extends { id: string }>(entries: T[], index: number, direction: -1 | 1): T[] | null {
  const target = index + direction;
  if (target < 0 || target >= entries.length) return null;
  const next = [...entries];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function contactDraft(contact?: AdminUiContactDto): ContactDraft {
  return contact ? { ...contact, label: { ...contact.label } } : { id: '', type: 'phone', label: { ...emptyLabel }, value: '', displayValue: '', enabled: true, sortOrder: 0, primary: false };
}

function socialDraft(social?: AdminUiSocialDto): SocialDraft {
  return social ? { ...social, label: { ...social.label } } : { id: '', platform: '', label: { ...emptyLabel }, url: '', handle: '', icon: '', enabled: true, sortOrder: 0 };
}

export function ContactSocialManager({ serverActions }: { serverActions: ServerActions }) {
  const [contacts, setContacts] = useState<AdminUiContactDto[]>([]);
  const [socialLinks, setSocialLinks] = useState<AdminUiSocialDto[]>([]);
  const [contactDraftState, setContactDraftState] = useState<ContactDraft | null>(null);
  const [socialDraftState, setSocialDraftState] = useState<SocialDraft | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [state, setState] = useState<ManagerState>('loading');
  const [error, setError] = useState('');
  const [deleteContactTarget, setDeleteContactTarget] = useState<AdminUiContactDto | null>(null);
  const [deleteSocialTarget, setDeleteSocialTarget] = useState<AdminUiSocialDto | null>(null);
  const [deleteState, setDeleteState] = useState<'idle' | 'submitting'>('idle');

  const load = async () => {
    const [nextContacts, nextSocialLinks] = await Promise.all([
      serverActions.readAdminContacts().then(unwrapAdminAction),
      serverActions.readAdminSocialLinks().then(unwrapAdminAction),
    ]);
    setContacts(nextContacts.sort((first, second) => first.sortOrder - second.sortOrder));
    setSocialLinks(nextSocialLinks.sort((first, second) => first.sortOrder - second.sortOrder));
  };

  useEffect(() => { load().then(() => setState('ready')).catch((nextError) => { setError(errorMessage(nextError)); setState('error'); }); }, []);

  const saveContact = async () => {
    if (!contactDraftState) return;
    setState('saving'); setError('');
    try {
      const { id: _id, ...input } = { ...contactDraftState, label: contactDraftState.label.en || contactDraftState.label.fr || contactDraftState.label.ar ? contactDraftState.label : contactLabels[contactDraftState.type], displayValue: contactDraftState.displayValue || contactDraftState.value };
      if (editingContactId) await serverActions.updateAdminContact(editingContactId, input).then(unwrapAdminAction);
      else await serverActions.createAdminContact(input).then(unwrapAdminAction);
      await load(); setContactDraftState(null); setEditingContactId(null); setState('ready');
    } catch (nextError) { setError(errorMessage(nextError)); setState('error'); }
  };

  const saveSocial = async () => {
    if (!socialDraftState) return;
    setState('saving'); setError('');
    try {
      const platform = socialPlatforms.find((option) => option.value === socialDraftState.platform);
      const { id: _id, ...input } = { ...socialDraftState, label: socialDraftState.label.en || socialDraftState.label.fr || socialDraftState.label.ar ? socialDraftState.label : platform?.names ?? { fr: socialDraftState.platform, en: socialDraftState.platform, ar: socialDraftState.platform }, icon: socialDraftState.icon || platform?.icon || undefined };
      if (editingSocialId) await serverActions.updateAdminSocialLink(editingSocialId, input).then(unwrapAdminAction);
      else await serverActions.createAdminSocialLink(input).then(unwrapAdminAction);
      await load(); setSocialDraftState(null); setEditingSocialId(null); setState('ready');
    } catch (nextError) { setError(errorMessage(nextError)); setState('error'); }
  };

  const confirmDeleteContact = async () => {
    if (!deleteContactTarget) return;
    setDeleteState('submitting');
    setState('saving');
    try {
      await serverActions.deleteAdminContact(deleteContactTarget.id).then(unwrapAdminAction);
      setDeleteContactTarget(null);
      await load();
      setState('ready');
    } catch (nextError) {
      setError(errorMessage(nextError));
      setState('error');
    } finally {
      setDeleteState('idle');
    }
  };

  const confirmDeleteSocial = async () => {
    if (!deleteSocialTarget) return;
    setDeleteState('submitting');
    setState('saving');
    try {
      await serverActions.deleteAdminSocialLink(deleteSocialTarget.id).then(unwrapAdminAction);
      setDeleteSocialTarget(null);
      await load();
      setState('ready');
    } catch (nextError) {
      setError(errorMessage(nextError));
      setState('error');
    } finally {
      setDeleteState('idle');
    }
  };

  const reorderContacts = async (index: number, direction: -1 | 1) => {
    const next = move(contacts, index, direction); if (!next) return;
    setState('saving');
    try { setContacts(await serverActions.reorderAdminContacts(next.map((contact) => contact.id)).then(unwrapAdminAction)); setState('ready'); } catch (nextError) { setError(errorMessage(nextError)); setState('error'); }
  };

  const reorderSocial = async (index: number, direction: -1 | 1) => {
    const next = move(socialLinks, index, direction); if (!next) return;
    setState('saving');
    try { setSocialLinks(await serverActions.reorderAdminSocialLinks(next.map((social) => social.id)).then(unwrapAdminAction)); setState('ready'); } catch (nextError) { setError(errorMessage(nextError)); setState('error'); }
  };

  if (state === 'loading') return <p className="admin-placeholder">Loading contact and social data...</p>;
  if (state === 'error' && !contactDraftState && !socialDraftState && contacts.length === 0 && socialLinks.length === 0) return <section className="admin-validation-summary is-visible"><h2>Unable to load contact data</h2><p>{error}</p></section>;

  return <div className="admin-contact-social-manager">
    {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Contact or social action failed</h2><p>{error}</p></section> : null}
    <ContactSection contacts={contacts} draft={contactDraftState} editingId={editingContactId} busy={state === 'saving'} onCreate={() => { setContactDraftState(contactDraft()); setEditingContactId(null); setError(''); }} onEdit={(contact) => { setContactDraftState(contactDraft(contact)); setEditingContactId(contact.id); setError(''); }} onCancel={() => { setContactDraftState(null); setEditingContactId(null); }} onChange={setContactDraftState} onSave={saveContact} onMove={reorderContacts} onDelete={(id) => { const contact = contacts.find((candidate) => candidate.id === id); if (contact) setDeleteContactTarget(contact); }} onToggle={async (contact) => { setState('saving'); try { await serverActions.updateAdminContact(contact.id, { enabled: !contact.enabled }).then(unwrapAdminAction); await load(); setState('ready'); } catch (nextError) { setError(errorMessage(nextError)); setState('error'); } }} />
    <SocialSection socialLinks={socialLinks} draft={socialDraftState} editingId={editingSocialId} busy={state === 'saving'} onCreate={() => { setSocialDraftState(socialDraft()); setEditingSocialId(null); setError(''); }} onEdit={(social) => { setSocialDraftState(socialDraft(social)); setEditingSocialId(social.id); setError(''); }} onCancel={() => { setSocialDraftState(null); setEditingSocialId(null); }} onChange={setSocialDraftState} onSave={saveSocial} onMove={reorderSocial} onDelete={(id) => { const social = socialLinks.find((candidate) => candidate.id === id); if (social) setDeleteSocialTarget(social); }} onToggle={async (social) => { setState('saving'); try { await serverActions.updateAdminSocialLink(social.id, { enabled: !social.enabled }).then(unwrapAdminAction); await load(); setState('ready'); } catch (nextError) { setError(errorMessage(nextError)); setState('error'); } }} />
    {deleteContactTarget ? <DestructiveActionDialog open title="Remove this contact?" description={`This removes “${deleteContactTarget.label.en || deleteContactTarget.label.fr || deleteContactTarget.value}” from the public contact list.`} warning="This action cannot be undone." confirmLabel="Remove contact" isSubmitting={deleteState === 'submitting'} onCancel={() => { setDeleteContactTarget(null); setDeleteState('idle'); }} onConfirm={confirmDeleteContact} /> : null}
    {deleteSocialTarget ? <DestructiveActionDialog open title="Remove this social link?" description={`This removes “${deleteSocialTarget.label.en || deleteSocialTarget.label.fr || deleteSocialTarget.platform}” from the social links.`} warning="This action cannot be undone." confirmLabel="Remove social link" isSubmitting={deleteState === 'submitting'} onCancel={() => { setDeleteSocialTarget(null); setDeleteState('idle'); }} onConfirm={confirmDeleteSocial} /> : null}
  </div>;
}

function ContactSection({ contacts, draft, editingId, busy, onCreate, onEdit, onCancel, onChange, onSave, onMove, onDelete, onToggle }: { contacts: AdminUiContactDto[]; draft: ContactDraft | null; editingId: string | null; busy: boolean; onCreate: () => void; onEdit: (contact: AdminUiContactDto) => void; onCancel: () => void; onChange: (draft: ContactDraft | null) => void; onSave: () => void; onMove: (index: number, direction: -1 | 1) => void; onDelete: (id: string) => void; onToggle: (contact: AdminUiContactDto) => void }) {
  return <section className="admin-contact-social-section"><div className="admin-list-toolbar"><div><p className="admin-eyebrow">Contact entries</p><p className="admin-list-count">{contacts.length} contacts</p></div><button type="button" className="admin-primary-button" onClick={onCreate}>Add contact</button></div><div className="admin-item-list">{contacts.map((contact, index) => <article className="admin-item-row" key={contact.id}><div className="admin-item-order">{index + 1}</div><div className="admin-item-main"><div className="admin-item-title"><h2>{contact.label.en}</h2><span className={contact.enabled ? 'admin-state is-active' : 'admin-state'}>{contact.enabled ? 'Enabled' : 'Disabled'}</span></div><p className="admin-item-meta"><span>{contact.type}</span><span>{contact.displayValue ?? contact.value}</span><span>ID: {contact.id}</span></p></div><div className="admin-item-actions"><button type="button" className="admin-icon-button" disabled={busy || index === 0} onClick={() => onMove(index, -1)} aria-label="Move contact up">Up</button><button type="button" className="admin-icon-button" disabled={busy || index === contacts.length - 1} onClick={() => onMove(index, 1)} aria-label="Move contact down">Down</button><button type="button" className="admin-text-button" onClick={() => onEdit(contact)}>Edit</button><button type="button" className="admin-text-button" onClick={() => onToggle(contact)}>{contact.enabled ? 'Disable' : 'Enable'}</button><button type="button" className="admin-text-button is-danger" onClick={() => onDelete(contact.id)}>Remove</button></div></article>)}</div>{draft ? <ContactEditor draft={draft} editingId={editingId} busy={busy} onChange={onChange} onCancel={onCancel} onSave={onSave} /> : null}</section>;
}

function ContactEditor({ draft, editingId, busy, onChange, onCancel, onSave }: { draft: ContactDraft; editingId: string | null; busy: boolean; onChange: (draft: ContactDraft) => void; onCancel: () => void; onSave: () => void }) {
  return <form className="admin-item-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}><div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Edit contact' : 'New contact'}</p><h2>{editingId ? 'Update contact' : 'Create contact'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div><p className="admin-field-hint-text">ID generated automatically when saved.</p><div className="admin-item-editor-grid"><label className="admin-select-field">Type<select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as RestaurantContactType })}>{contactTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="admin-field">Value<input required value={draft.value} onChange={(event) => onChange({ ...draft, value: event.target.value })} /></label><label className="admin-checkbox-label"><input type="checkbox" checked={draft.enabled} onChange={(event) => onChange({ ...draft, enabled: event.target.checked })} /> Active</label><label className="admin-checkbox-label"><input type="checkbox" checked={Boolean(draft.primary)} onChange={(event) => onChange({ ...draft, primary: event.target.checked })} /> Primary</label></div><div className="admin-editor-actions"><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button></div></form>;
}

function SocialSection({ socialLinks, draft, editingId, busy, onCreate, onEdit, onCancel, onChange, onSave, onMove, onDelete, onToggle }: { socialLinks: AdminUiSocialDto[]; draft: SocialDraft | null; editingId: string | null; busy: boolean; onCreate: () => void; onEdit: (social: AdminUiSocialDto) => void; onCancel: () => void; onChange: (draft: SocialDraft | null) => void; onSave: () => void; onMove: (index: number, direction: -1 | 1) => void; onDelete: (id: string) => void; onToggle: (social: AdminUiSocialDto) => void }) {
  return <section className="admin-contact-social-section"><div className="admin-list-toolbar"><div><p className="admin-eyebrow">Social links</p><p className="admin-list-count">{socialLinks.length} social links</p></div><button type="button" className="admin-primary-button" onClick={onCreate}>Add social link</button></div><div className="admin-item-list">{socialLinks.map((social, index) => <article className="admin-item-row" key={social.id}><div className="admin-item-order">{index + 1}</div><div className="admin-item-main"><div className="admin-item-title"><h2>{social.label.en}</h2><span className={social.enabled ? 'admin-state is-active' : 'admin-state'}>{social.enabled ? 'Enabled' : 'Disabled'}</span></div><p className="admin-item-meta"><span>{social.platform}</span><span>{social.url}</span><span>ID: {social.id}</span></p></div><div className="admin-item-actions"><button type="button" className="admin-icon-button" disabled={busy || index === 0} onClick={() => onMove(index, -1)} aria-label="Move social link up">Up</button><button type="button" className="admin-icon-button" disabled={busy || index === socialLinks.length - 1} onClick={() => onMove(index, 1)} aria-label="Move social link down">Down</button><button type="button" className="admin-text-button" onClick={() => onEdit(social)}>Edit</button><button type="button" className="admin-text-button" onClick={() => onToggle(social)}>{social.enabled ? 'Disable' : 'Enable'}</button><button type="button" className="admin-text-button is-danger" onClick={() => onDelete(social.id)}>Remove</button></div></article>)}</div>{draft ? <SocialEditor draft={draft} editingId={editingId} busy={busy} onChange={onChange} onCancel={onCancel} onSave={onSave} /> : null}</section>;
}

function SocialEditor({ draft, editingId, busy, onChange, onCancel, onSave }: { draft: SocialDraft; editingId: string | null; busy: boolean; onChange: (draft: SocialDraft) => void; onCancel: () => void; onSave: () => void }) {
  return <form className="admin-item-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}><div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Edit social link' : 'New social link'}</p><h2>{editingId ? 'Update social link' : 'Create social link'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div><p className="admin-field-hint-text">ID generated automatically when saved.</p><div className="admin-item-editor-grid"><label className="admin-select-field">Platform<select required value={draft.platform} onChange={(event) => onChange({ ...draft, platform: event.target.value })}><option value="">Choose a platform</option>{socialPlatforms.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}</select></label><label className="admin-field">URL<input required type="url" value={draft.url} onChange={(event) => onChange({ ...draft, url: event.target.value })} /></label><label className="admin-checkbox-label"><input type="checkbox" checked={draft.enabled} onChange={(event) => onChange({ ...draft, enabled: event.target.checked })} /> Active</label></div>{draft.platform === 'custom' ? <><label className="admin-field">Custom platform name<input required value={draft.label.en ?? ''} onChange={(event) => onChange({ ...draft, label: { fr: event.target.value, en: event.target.value, ar: event.target.value } })} /></label><label className="admin-field">Icon name (optional)<input value={draft.icon ?? ''} onChange={(event) => onChange({ ...draft, icon: event.target.value })} /></label></> : null}<div className="admin-editor-actions"><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button></div></form>;
}
