'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdminUiCategoryDto,
  AdminUiError,
  AdminUiFeaturedSectionCreateInput,
  AdminUiFeaturedSectionDto,
  AdminUiFeaturedSectionUpdateInput,
  AdminUiManagementStateDto,
  AdminUiMenuItemDto,
} from '../content/admin-menu-ui-adapter';
import type { AdminActionResult } from '../content/admin-menu-actions';
import { unwrapAdminAction } from '../content/admin-action-client';
import { LocalizedFieldGroup } from './localized-field-group';

type FeaturedManagerState = 'loading' | 'ready' | 'saving' | 'saved' | 'validation-error' | 'error';
type FeaturedDraft = AdminUiFeaturedSectionCreateInput & { id: string };

type FeaturedOperations = {
  getManagementState: () => Promise<AdminUiManagementStateDto>;
  createFeaturedSection: (input: AdminUiFeaturedSectionCreateInput) => Promise<AdminUiFeaturedSectionDto>;
  updateFeaturedSection: (id: string, input: AdminUiFeaturedSectionUpdateInput) => Promise<AdminUiFeaturedSectionDto>;
  deleteFeaturedSection: (id: string) => Promise<void>;
  reorderFeaturedSections: (ids: string[]) => Promise<AdminUiFeaturedSectionDto[]>;
};

export type FeaturedSectionsServerActions = {
  getManagementState: () => Promise<AdminActionResult<AdminUiManagementStateDto>>;
  createFeaturedSection: (input: AdminUiFeaturedSectionCreateInput) => Promise<AdminActionResult<AdminUiFeaturedSectionDto>>;
  updateFeaturedSection: (id: string, input: AdminUiFeaturedSectionUpdateInput) => Promise<AdminActionResult<AdminUiFeaturedSectionDto>>;
  deleteFeaturedSection: (id: string) => Promise<AdminActionResult<void>>;
  reorderFeaturedSections: (ids: string[]) => Promise<AdminActionResult<AdminUiFeaturedSectionDto[]>>;
};

type FeaturedSectionsManagerProps = { adapter?: FeaturedOperations; serverActions?: FeaturedSectionsServerActions };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function errorFromUnknown(error: unknown): AdminUiError {
  if (error && typeof error === 'object' && 'info' in error) return error as AdminUiError;
  const message = error instanceof Error ? error.message : 'The Featured sections could not be loaded.';
  return Object.assign(new Error(message), { info: { code: 'admin-featured-section-operation-failed', message, resource: 'featured-section' } }) as AdminUiError;
}

function fieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path, [field.message]]));
}

export function getFeaturedSectionTitle(section: Pick<AdminUiFeaturedSectionDto, 'id' | 'title'>): string {
  return section.title.fr ?? section.title.en ?? section.title.ar ?? section.id;
}

export function getFeaturedItemDisplayName(item: Pick<AdminUiMenuItemDto, 'id' | 'name'>): string {
  return item.name.fr ?? item.name.en ?? item.name.ar ?? item.id;
}

export function getReorderedFeaturedSectionIds(sections: AdminUiFeaturedSectionDto[], index: number, direction: -1 | 1): string[] | null {
  const target = index + direction;
  if (target < 0 || target >= sections.length) return null;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((section) => section.id);
}

export function getReorderedFeaturedItemIds(itemIds: string[], index: number, direction: -1 | 1): string[] | null {
  const target = index + direction;
  if (target < 0 || target >= itemIds.length) return null;
  const next = [...itemIds];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function getFeaturedSectionActiveUpdate(section: Pick<AdminUiFeaturedSectionDto, 'active'>): { active: boolean } {
  return { active: !section.active };
}

export function addFeaturedItemId(itemIds: string[], itemId: string): string[] {
  return itemIds.includes(itemId) ? [...itemIds] : [...itemIds, itemId];
}

export function removeFeaturedItemId(itemIds: string[], index: number): string[] {
  return itemIds.filter((_, candidateIndex) => candidateIndex !== index);
}

export function confirmFeaturedSectionDeletion(section: Pick<AdminUiFeaturedSectionDto, 'id' | 'title'>, confirmDelete: (message: string) => boolean): boolean {
  return confirmDelete(`Delete Featured section "${getFeaturedSectionTitle(section)}"?`);
}

function categoryName(category: AdminUiCategoryDto | undefined): string {
  return category?.name.fr ?? category?.name.en ?? category?.name.ar ?? category?.id ?? 'Unknown category';
}

function emptyDraft(sortOrder: number): FeaturedDraft {
  return { id: '', title: {}, description: {}, itemIds: [], sortOrder, active: true };
}

function toDraft(section: AdminUiFeaturedSectionDto): FeaturedDraft {
  return { id: section.id, title: clone(section.title), description: clone(section.description ?? {}), itemIds: [...section.itemIds], sortOrder: section.sortOrder, active: section.active };
}

export function FeaturedSectionsManager({ adapter, serverActions }: FeaturedSectionsManagerProps) {
  const operations = useMemo(() => adapter ?? (serverActions ? {
    getManagementState: () => serverActions.getManagementState().then(unwrapAdminAction),
    createFeaturedSection: (input: AdminUiFeaturedSectionCreateInput) => serverActions.createFeaturedSection(input).then(unwrapAdminAction),
    updateFeaturedSection: (id: string, input: AdminUiFeaturedSectionUpdateInput) => serverActions.updateFeaturedSection(id, input).then(unwrapAdminAction),
    deleteFeaturedSection: (id: string) => serverActions.deleteFeaturedSection(id).then(unwrapAdminAction),
    reorderFeaturedSections: (ids: string[]) => serverActions.reorderFeaturedSections(ids).then(unwrapAdminAction),
  } : undefined), [adapter, serverActions]);
  if (!operations) throw new Error('Featured section operations are not configured.');

  const [managementState, setManagementState] = useState<AdminUiManagementStateDto | null>(null);
  const [draft, setDraft] = useState<FeaturedDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managerState, setManagerState] = useState<FeaturedManagerState>('loading');
  const [error, setError] = useState<AdminUiError | null>(null);

  const load = async () => {
    setManagementState(await operations.getManagementState());
  };

  useEffect(() => {
    load().then(() => setManagerState('ready')).catch((nextError) => { setError(errorFromUnknown(nextError)); setManagerState('error'); });
  }, []);

  const sections = [...(managementState?.featuredSections ?? [])].sort((first, second) => first.sortOrder - second.sortOrder);
  const categories = managementState?.categories ?? [];
  const items = managementState?.items ?? [];
  const errors = fieldErrors(error);

  const openCreate = () => { setDraft(emptyDraft(sections.length)); setEditingId(null); setError(null); setManagerState('ready'); };
  const openEdit = (section: AdminUiFeaturedSectionDto) => { setDraft(toDraft(section)); setEditingId(section.id); setError(null); setManagerState('ready'); };
  const closeEditor = () => { setDraft(null); setEditingId(null); setError(null); setManagerState('ready'); };

  const save = async () => {
    if (!draft) return;
    setManagerState('saving');
    setError(null);
    try {
      if (editingId) {
        await operations.updateFeaturedSection(editingId, {
          title: clone(draft.title),
          description: Object.keys(draft.description ?? {}).length ? clone(draft.description) : undefined,
          itemIds: [...draft.itemIds],
          sortOrder: Number(draft.sortOrder),
          active: draft.active,
        });
      } else {
        await operations.createFeaturedSection({
          id: draft.id.trim(),
          title: clone(draft.title),
          description: Object.keys(draft.description ?? {}).length ? clone(draft.description) : undefined,
          itemIds: [...draft.itemIds],
          sortOrder: Number(draft.sortOrder),
          active: draft.active,
        });
      }
      await load();
      setDraft(null);
      setEditingId(null);
      setManagerState('saved');
    } catch (nextError) {
      const nextAdminError = errorFromUnknown(nextError);
      setError(nextAdminError);
      setManagerState(nextAdminError.info.fields?.length ? 'validation-error' : 'error');
    }
  };

  const deleteSection = async (section: AdminUiFeaturedSectionDto) => {
    if (!confirmFeaturedSectionDeletion(section, (message) => window.confirm(message))) return;
    setManagerState('saving');
    setError(null);
    try {
      await operations.deleteFeaturedSection(section.id);
      await load();
      setManagerState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setManagerState('error');
    }
  };

  const toggleActive = async (section: AdminUiFeaturedSectionDto) => {
    setManagerState('saving');
    setError(null);
    try {
      const updated = await operations.updateFeaturedSection(section.id, { active: !section.active });
      setManagementState((current) => current ? { ...current, featuredSections: current.featuredSections.map((candidate) => candidate.id === updated.id ? updated : candidate) } : current);
      setManagerState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setManagerState('error');
    }
  };

  const reorderSection = async (index: number, direction: -1 | 1) => {
    const ids = getReorderedFeaturedSectionIds(sections, index, direction);
    if (!ids) return;
    setManagerState('saving');
    setError(null);
    try {
      const updated = await operations.reorderFeaturedSections(ids);
      setManagementState((current) => current ? { ...current, featuredSections: updated } : current);
      setManagerState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setManagerState('error');
    }
  };

  if (managerState === 'loading') return <p className="admin-placeholder">Loading Featured sections...</p>;
  if (!managementState) return <FeaturedErrorSummary error={error ?? errorFromUnknown(null)} />;

  return <div className="admin-featured-manager">
    {error && !draft ? <FeaturedErrorSummary error={error} /> : null}
    <div className="admin-list-toolbar"><div><p className="admin-eyebrow">Editorial highlights</p><p className="admin-list-count">{sections.length} Featured sections</p></div><button type="button" className="admin-primary-button" onClick={openCreate}>Create Featured</button></div>
    {sections.length === 0 ? <p className="admin-empty-state">No Featured sections found.</p> : <FeaturedSectionList sections={sections} managerState={managerState} onMove={reorderSection} onEdit={openEdit} onDelete={deleteSection} onToggle={toggleActive} />}
    {draft ? <FeaturedSectionEditor draft={draft} editingId={editingId} items={items} categories={categories} state={managerState} errors={errors} onChange={(nextDraft) => { setDraft(nextDraft); setManagerState('ready'); setError(null); }} onCancel={closeEditor} onSave={save} /> : null}
  </div>;
}

export function FeaturedSectionList({ sections, managerState, onMove, onEdit, onDelete, onToggle }: { sections: AdminUiFeaturedSectionDto[]; managerState: FeaturedManagerState; onMove: (index: number, direction: -1 | 1) => void; onEdit: (section: AdminUiFeaturedSectionDto) => void; onDelete: (section: AdminUiFeaturedSectionDto) => void; onToggle: (section: AdminUiFeaturedSectionDto) => void }) {
  return <div className="admin-featured-list" aria-label="Featured sections">{sections.map((section, index) => <article className="admin-featured-row" key={section.id}>
    <div className="admin-category-order" aria-label={`Order ${index + 1}`}>{index + 1}</div>
    <div className="admin-featured-main"><div className="admin-category-title"><h2>{getFeaturedSectionTitle(section)}</h2><span className={section.active ? 'admin-state is-active' : 'admin-state'}>{section.active ? 'Active' : 'Inactive'}</span></div><p className="admin-item-meta"><span>{section.title.en ?? 'No EN title'}</span><span>{section.title.ar ?? 'No AR title'}</span><span>{section.itemIds.length} selected items</span><span>ID: {section.id}</span></p></div>
    <div className="admin-featured-actions"><button type="button" className="admin-icon-button" disabled={managerState === 'saving' || index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${getFeaturedSectionTitle(section)} up`}>Up</button><button type="button" className="admin-icon-button" disabled={managerState === 'saving' || index === sections.length - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${getFeaturedSectionTitle(section)} down`}>Down</button><button type="button" className="admin-text-button" onClick={() => onEdit(section)}>Edit</button><button type="button" className="admin-text-button" onClick={() => onToggle(section)}>{section.active ? 'Deactivate' : 'Activate'}</button><button type="button" className="admin-text-button is-danger" onClick={() => onDelete(section)}>Delete</button></div>
  </article>)}</div>;
}

export function FeaturedSectionEditor({ draft, editingId, items, categories, state, errors, onChange, onCancel, onSave }: { draft: FeaturedDraft; editingId: string | null; items: AdminUiMenuItemDto[]; categories: AdminUiCategoryDto[]; state: FeaturedManagerState; errors: Record<string, string[]>; onChange: (draft: FeaturedDraft) => void; onCancel: () => void; onSave: () => void }) {
  const editorRef = useRef<HTMLFormElement>(null);
  const [pendingItemId, setPendingItemId] = useState('');

  useEffect(() => {
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editorRef.current?.focus({ preventScroll: true });
  }, []);

  const selectedItems = draft.itemIds.map((itemId) => items.find((item) => item.id === itemId));
  const availableItems = items.filter((item) => !draft.itemIds.includes(item.id));
  const updateLocalized = (field: 'title' | 'description', locale: 'fr' | 'en' | 'ar', value: string) => onChange({ ...draft, [field]: { ...draft[field], [locale]: value } });
  const addItem = () => { if (!pendingItemId) return; onChange({ ...draft, itemIds: addFeaturedItemId(draft.itemIds, pendingItemId) }); setPendingItemId(''); };
  const removeItem = (index: number) => onChange({ ...draft, itemIds: removeFeaturedItemId(draft.itemIds, index) });
  const moveItem = (index: number, direction: -1 | 1) => { const itemIds = getReorderedFeaturedItemIds(draft.itemIds, index, direction); if (itemIds) onChange({ ...draft, itemIds }); };

  return <form className="admin-featured-editor" ref={editorRef} tabIndex={-1} onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Edit Featured section' : 'New Featured section'}</p><h2>{editingId ? 'Update Featured section' : 'Create Featured section'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div>
    {errors.id?.length ? <p className="admin-field-error">{errors.id.join(' ')}</p> : null}
    {!editingId ? <div className="admin-field"><label htmlFor="featured-id">Featured section ID</label><input id="featured-id" value={draft.id} required onChange={(event) => onChange({ ...draft, id: event.target.value })} aria-invalid={Boolean(errors.id?.length)} />{errors.id?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div> : null}
    <LocalizedFieldGroup id="title" label="Title" value={draft.title} errors={errors} onChange={(locale, value) => updateLocalized('title', locale, value)} />
    <LocalizedFieldGroup id="description" label="Description (optional)" value={draft.description ?? {}} errors={errors} onChange={(locale, value) => updateLocalized('description', locale, value)} />
    <div className="admin-featured-editor-fields"><label className="admin-checkbox-label"><input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} /> Active</label><div className="admin-field"><label htmlFor="featured-sort-order">Sort order</label><input id="featured-sort-order" type="number" min="0" step="1" value={draft.sortOrder} onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value) })} aria-invalid={Boolean(errors.sortOrder?.length)} />{errors.sortOrder?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div></div>
    <fieldset className="admin-featured-items"><legend>Featured items</legend><div className="admin-featured-item-picker"><label className="admin-select-field" htmlFor="featured-item-picker">Add menu item<select id="featured-item-picker" value={pendingItemId} onChange={(event) => setPendingItemId(event.target.value)}><option value="">Select an item</option>{availableItems.map((item) => <option key={item.id} value={item.id}>{getFeaturedItemDisplayName(item)} - {item.price.amount.toFixed(2)} MAD</option>)}</select></label><button type="button" className="admin-secondary-button" onClick={addItem} disabled={!pendingItemId}>Add item</button></div>{errors.itemIds?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}<div className="admin-featured-selected-list">{draft.itemIds.length === 0 ? <p className="admin-empty-state">No items selected.</p> : draft.itemIds.map((itemId, index) => { const item = selectedItems[index]; return <div className="admin-featured-selected-item" key={`${itemId}-${index}`}><div className="admin-featured-selected-copy"><strong>{item ? getFeaturedItemDisplayName(item) : `Missing item: ${itemId}`}</strong>{item ? <span>{categoryName(categories.find((category) => category.id === item.categoryId))} | {item.price.amount.toFixed(2)} MAD{item.active ? '' : ' | Inactive'}</span> : <span>Referenced item is no longer available.</span>}</div><div className="admin-featured-selected-actions"><button type="button" className="admin-icon-button" disabled={index === 0} onClick={() => moveItem(index, -1)} aria-label={`Move item ${itemId} up`}>Up</button><button type="button" className="admin-icon-button" disabled={index === draft.itemIds.length - 1} onClick={() => moveItem(index, 1)} aria-label={`Move item ${itemId} down`}>Down</button><button type="button" className="admin-text-button is-danger" onClick={() => removeItem(index)}>Remove</button></div></div>; })}</div></fieldset>
    <div className="admin-editor-actions"><span className={`admin-save-state is-${state}`} aria-live="polite">{state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : state === 'validation-error' ? 'Validation error' : state === 'error' ? 'Could not save' : 'Unsaved changes'}</span><button type="submit" className="admin-primary-button" disabled={state === 'saving'}>{state === 'saving' ? 'Saving...' : 'Save Featured'}</button></div>
  </form>;
}

export function FeaturedErrorSummary({ error }: { error: AdminUiError }) {
  return <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>Featured section action failed</h2><p>{error.message}</p>{error.info.details?.length ? <ul>{error.info.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}{error.info.fields?.length ? <ul>{error.info.fields.map((field) => <li key={field.path}><strong>{field.path}</strong>: {field.message}</li>)}</ul> : null}</section>;
}
