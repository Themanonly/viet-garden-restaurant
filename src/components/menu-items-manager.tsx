'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { AdminUiCategoryDto, AdminUiError, AdminUiManagementStateDto, AdminUiMediaDto, AdminUiMenuItemCreateInput, AdminUiMenuItemDto, AdminUiMenuItemUpdateInput } from '../content/admin-menu-ui-adapter';
import type { AdminActionResult } from '../content/admin-menu-actions';
import { unwrapAdminAction } from '../content/admin-action-client';
import { LocalizedFieldGroup } from './localized-field-group';

type ManagerState = 'loading' | 'ready' | 'saving' | 'saved' | 'validation-error' | 'error';
type ItemDraft = AdminUiMenuItemCreateInput & { id: string };

export type MenuItemsServerActions = {
  getManagementState: () => Promise<AdminActionResult<AdminUiManagementStateDto>>;
  listMedia: () => Promise<AdminActionResult<AdminUiMediaDto[]>>;
  createItem: (input: AdminUiMenuItemCreateInput) => Promise<AdminActionResult<AdminUiMenuItemDto>>;
  updateItem: (id: string, input: AdminUiMenuItemUpdateInput) => Promise<AdminActionResult<AdminUiMenuItemDto>>;
  deleteItem: (id: string) => Promise<AdminActionResult<void>>;
  moveItem: (id: string, categoryId: string) => Promise<AdminActionResult<AdminUiMenuItemDto>>;
  reorderItems: (categoryId: string, itemIds: string[]) => Promise<AdminActionResult<AdminUiMenuItemDto[]>>;
};

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function emptyDraft(categoryId: string): ItemDraft {
  return { id: '', categoryId, name: {}, description: {}, price: { amount: 0, currency: 'MAD' }, active: true, sortOrder: 0 };
}

function fieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path, [field.message]]));
}

function errorFromUnknown(error: unknown): AdminUiError {
  if (error && typeof error === 'object' && 'info' in error) return error as AdminUiError;
  const message = error instanceof Error ? error.message : 'The menu items could not be loaded.';
  return Object.assign(new Error(message), { info: { code: 'admin-item-operation-failed', message, resource: 'item' } }) as AdminUiError;
}

function toDraft(item: AdminUiMenuItemDto): ItemDraft {
  return { id: item.id, categoryId: item.categoryId, name: clone(item.name), description: clone(item.description ?? {}), price: clone(item.price), ...(item.mediaId ? { mediaId: item.mediaId } : {}), active: item.active, sortOrder: item.sortOrder };
}

function categoryName(category: AdminUiCategoryDto): string { return category.name.fr ?? category.name.en ?? category.name.ar ?? category.id; }

export function getItemDisplayName(item: AdminUiMenuItemDto): string { return item.name.fr ?? item.name.en ?? item.name.ar ?? item.id; }

export function getReorderedItemIds(items: AdminUiMenuItemDto[], index: number, direction: -1 | 1): string[] | null {
  const target = index + direction;
  if (target < 0 || target >= items.length) return null;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item) => item.id);
}

export function MenuItemsManager({ serverActions }: { serverActions: MenuItemsServerActions }) {
  const operations = useMemo(() => ({
    getManagementState: () => serverActions.getManagementState().then(unwrapAdminAction),
    listMedia: () => serverActions.listMedia().then(unwrapAdminAction),
    createItem: (input: AdminUiMenuItemCreateInput) => serverActions.createItem(input).then(unwrapAdminAction),
    updateItem: (id: string, input: AdminUiMenuItemUpdateInput) => serverActions.updateItem(id, input).then(unwrapAdminAction),
    deleteItem: (id: string) => serverActions.deleteItem(id).then(unwrapAdminAction),
    moveItem: (id: string, categoryId: string) => serverActions.moveItem(id, categoryId).then(unwrapAdminAction),
    reorderItems: (categoryId: string, ids: string[]) => serverActions.reorderItems(categoryId, ids).then(unwrapAdminAction),
  }), [serverActions]);
  const [state, setState] = useState<AdminUiManagementStateDto | null>(null);
  const [media, setMedia] = useState<AdminUiMediaDto[]>([]);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managerState, setManagerState] = useState<ManagerState>('loading');
  const [error, setError] = useState<AdminUiError | null>(null);
  const [filter, setFilter] = useState('all');

  const load = async () => { const [nextState, nextMedia] = await Promise.all([operations.getManagementState(), operations.listMedia()]); setState(nextState); setMedia(nextMedia); };
  useEffect(() => { load().then(() => setManagerState('ready')).catch((nextError) => { setError(errorFromUnknown(nextError)); setManagerState('error'); }); }, []);

  if (managerState === 'error') return <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Unable to load menu items</h2><p>{error?.message ?? 'The menu items could not be loaded.'}</p></section>;
  if (!state || managerState === 'loading') return <p className="admin-placeholder">Loading menu items...</p>;
  const categories = state.categories;
  const filtered = state.items.filter((item) => filter === 'all' || item.categoryId === filter).sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.sortOrder - b.sortOrder);
  const errors = fieldErrors(error);
  const startCreate = () => { setDraft(emptyDraft(categories[0]?.id ?? '')); setEditingId(null); setError(null); setManagerState('ready'); };
  const startEdit = (item: AdminUiMenuItemDto) => { setDraft(toDraft(item)); setEditingId(item.id); setError(null); setManagerState('ready'); };
  const updateDraft = (next: ItemDraft) => { setDraft(next); setManagerState('ready'); setError(null); };
  const save = async () => {
    if (!draft) return;
    setManagerState('saving'); setError(null);
    try {
      const input: AdminUiMenuItemCreateInput = { ...draft, description: Object.keys(draft.description ?? {}).length ? draft.description : undefined, mediaId: draft.mediaId || undefined, sortOrder: Number(draft.sortOrder), price: { amount: Number(draft.price.amount), currency: 'MAD' } };
      if (editingId) await operations.updateItem(editingId, input);
      else await operations.createItem(input);
      await load(); setDraft(null); setEditingId(null); setManagerState('saved');
    } catch (nextError) { const applicationError = nextError as AdminUiError; setError(applicationError); setManagerState(applicationError?.info?.fields?.length ? 'validation-error' : 'error'); }
  };
  const remove = async (item: AdminUiMenuItemDto) => {
    if (!window.confirm(`Delete item “${getItemDisplayName(item)}”?`)) return;
    setManagerState('saving');
    try { await operations.deleteItem(item.id); await load(); setManagerState('saved'); } catch (nextError) { setError(nextError as AdminUiError); setManagerState('error'); }
  };
  const toggle = async (item: AdminUiMenuItemDto) => { setManagerState('saving'); try { await operations.updateItem(item.id, { active: !item.active }); await load(); setManagerState('saved'); } catch (nextError) { setError(nextError as AdminUiError); setManagerState('error'); } };
  const move = async (item: AdminUiMenuItemDto, categoryId: string) => { setManagerState('saving'); try { await operations.moveItem(item.id, categoryId); await load(); setManagerState('saved'); } catch (nextError) { setError(nextError as AdminUiError); setManagerState('error'); } };
  const reorder = async (item: AdminUiMenuItemDto, direction: -1 | 1) => {
    const siblings = state.items.filter((candidate) => candidate.categoryId === item.categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = getReorderedItemIds(siblings, siblings.findIndex((candidate) => candidate.id === item.id), direction);
    if (!ids) return;
    setManagerState('saving'); try { await operations.reorderItems(item.categoryId, ids); await load(); setManagerState('saved'); } catch (nextError) { setError(nextError as AdminUiError); setManagerState('error'); }
  };

  return <div className="admin-item-manager">
    {error ? <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Item action failed</h2><p>{error.message}</p>{error.info.fields?.length ? <ul>{error.info.fields.map((field) => <li key={field.path}><strong>{field.path}</strong>: {field.message}</li>)}</ul> : null}</section> : null}
    <div className="admin-list-toolbar"><div><p className="admin-eyebrow">Menu inventory</p><p className="admin-list-count">{state.items.length} items</p></div><button type="button" className="admin-primary-button" onClick={startCreate}>Create item</button></div>
    <label className="admin-select-field admin-item-filter">Category<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{categoryName(category)}</option>)}</select></label>
    <div className="admin-item-list" aria-label="Menu items">{filtered.map((item) => { const siblings = state.items.filter((candidate) => candidate.categoryId === item.categoryId).sort((a, b) => a.sortOrder - b.sortOrder); const index = siblings.findIndex((candidate) => candidate.id === item.id); return <article className="admin-item-row" key={item.id}><div className="admin-item-order" aria-label={`Order ${item.sortOrder + 1}`}>{String(item.sortOrder + 1).padStart(2, '0')}</div><div className="admin-item-main"><div className="admin-item-title"><h2>{getItemDisplayName(item)}</h2><span className={item.active ? 'admin-state is-active' : 'admin-state'}>{item.active ? 'Active' : 'Inactive'}</span></div><p className="admin-item-meta"><span>{categoryName(categories.find((category) => category.id === item.categoryId) ?? { id: item.categoryId, name: {} } as AdminUiCategoryDto)}</span><span>{item.price.amount.toFixed(2)} {item.price.currency}</span><span>{item.mediaId ? 'Media assigned' : 'No media'}</span><span>ID: {item.id}</span></p></div><div className="admin-item-actions"><button type="button" className="admin-icon-button" disabled={managerState === 'saving' || index === 0} onClick={() => reorder(item, -1)} aria-label={`Move ${getItemDisplayName(item)} up`}>↑</button><button type="button" className="admin-icon-button" disabled={managerState === 'saving' || index === siblings.length - 1} onClick={() => reorder(item, 1)} aria-label={`Move ${getItemDisplayName(item)} down`}>↓</button><button type="button" className="admin-text-button" onClick={() => startEdit(item)}>Edit</button><button type="button" className="admin-text-button is-danger" onClick={() => remove(item)}>Delete</button><button type="button" className="admin-text-button" onClick={() => toggle(item)}>{item.active ? 'Deactivate' : 'Activate'}</button></div></article>; })}</div>
    {draft ? <ItemEditor draft={draft} editingId={editingId} categories={categories} media={media} state={managerState} errors={errors} onChange={updateDraft} onCancel={() => setDraft(null)} onSave={save} /> : null}
  </div>;
}

function ItemEditor({ draft, editingId, categories, media, state, errors, onChange, onCancel, onSave }: { draft: ItemDraft; editingId: string | null; categories: AdminUiCategoryDto[]; media: AdminUiMediaDto[]; state: ManagerState; errors: Record<string, string[]>; onChange: (draft: ItemDraft) => void; onCancel: () => void; onSave: () => void }) {
  const editorRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  
  const setLocalized = (field: 'name' | 'description', locale: 'fr' | 'en' | 'ar', value: string) => onChange({ ...draft, [field]: { ...draft[field], [locale]: value } });
  return <form className="admin-item-editor" ref={editorRef} onSubmit={(event) => { event.preventDefault(); onSave(); }}><div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Edit item' : 'New item'}</p><h2>{editingId ? 'Update menu item' : 'Create menu item'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div><div className="admin-item-editor-grid"><div className="admin-field"><label htmlFor="item-id">Item ID</label><input id="item-id" value={draft.id} disabled={Boolean(editingId)} required onChange={(event) => onChange({ ...draft, id: event.target.value })} />{errors.id?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div><label className="admin-checkbox-label"><input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} /> Active</label><label className="admin-select-field">Category<select value={draft.categoryId} onChange={(event) => onChange({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{categoryName(category)}</option>)}</select>{errors.categoryId?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</label><div className="admin-field"><label htmlFor="item-price">Price amount</label><input id="item-price" type="number" min="0" step="0.01" value={draft.price.amount} onChange={(event) => onChange({ ...draft, price: { amount: Number(event.target.value), currency: 'MAD' } })} />{errors['price.amount']?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div><div className="admin-field"><label htmlFor="item-currency">Currency</label><select id="item-currency" value="MAD" disabled><option>MAD</option></select></div><div className="admin-field"><label htmlFor="item-sort-order">Sort order</label><input id="item-sort-order" type="number" min="0" step="1" value={draft.sortOrder} onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value) })} />{errors.sortOrder?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div><label className="admin-select-field">Media<select value={draft.mediaId ?? ''} onChange={(event) => onChange({ ...draft, mediaId: event.target.value || undefined })}><option value="">No media</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.alt.fr ?? asset.id} {asset.usageCount ? `(${asset.usageCount} uses)` : ''}</option>)}</select>{errors.mediaId?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</label></div><LocalizedFieldGroup id="name" label="Name" value={draft.name} errors={errors} onChange={(locale, value) => setLocalized('name', locale, value)} /><LocalizedFieldGroup id="description" label="Description (optional)" value={draft.description ?? {}} errors={errors} onChange={(locale, value) => setLocalized('description', locale, value)} /><div className="admin-editor-actions"><span className={`admin-save-state is-${state}`} aria-live="polite">{state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : state === 'validation-error' ? 'Validation error' : state === 'error' ? 'Could not save' : 'Unsaved changes'}</span><button type="submit" className="admin-primary-button" disabled={state === 'saving'}>{state === 'saving' ? 'Saving...' : 'Save item'}</button></div></form>;
}