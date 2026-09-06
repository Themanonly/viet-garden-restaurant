'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { LocalizedText } from '../content/models';
import type {
  AdminUiCategoryCreateInput,
  AdminUiCategoryDto,
  AdminUiCategoryUpdateInput,
  AdminUiError,
  AdminUiManagementStateDto,
} from '../content/admin-menu-ui-adapter';
import type { AdminMenuUiAdapter } from '../content/admin-menu-ui-adapter';
import type { AdminActionResult } from '../content/admin-menu-actions';
import { unwrapAdminAction } from '../content/admin-action-client';

type CategoryEditorState = 'loading' | 'ready' | 'saving' | 'saved' | 'validation-error' | 'error';

type CategoryDraft = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  active: boolean;
};

type CategoryOperations = Pick<AdminMenuUiAdapter, 'getManagementState' | 'createCategory' | 'updateCategory' | 'deleteCategory' | 'reorderCategories'>;
export type CategoryServerActions = {
  getManagementState: () => Promise<AdminActionResult<Awaited<ReturnType<AdminMenuUiAdapter['getManagementState']>>>>;
  createCategory: (input: AdminUiCategoryCreateInput) => Promise<AdminActionResult<AdminUiCategoryDto>>;
  updateCategory: (id: string, input: AdminUiCategoryUpdateInput) => Promise<AdminActionResult<AdminUiCategoryDto>>;
  deleteCategory: (id: string) => Promise<AdminActionResult<void>>;
  reorderCategories: (ids: string[]) => Promise<AdminActionResult<AdminUiCategoryDto[]>>;
};
type CategoryManagerProps = { adapter?: CategoryOperations; serverActions?: CategoryServerActions };

const locales = [
  { key: 'fr' as const, label: 'FR', direction: 'ltr' as const },
  { key: 'en' as const, label: 'EN', direction: 'ltr' as const },
  { key: 'ar' as const, label: 'AR', direction: 'rtl' as const },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getCategoryItemCounts(state: AdminUiManagementStateDto): Record<string, number> {
  return state.items.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.categoryId]: (counts[item.categoryId] ?? 0) + 1 }), {});
}

export function getCategoryFieldErrors(error: AdminUiError | null): Record<string, string[]> {
  return Object.fromEntries((error?.info.fields ?? []).map((field) => [field.path, [field.message]]));
}

export function getReorderedCategoryIds(categories: AdminUiCategoryDto[], index: number, direction: -1 | 1): string[] | null {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= categories.length) return null;
  const ordered = [...categories];
  [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
  return ordered.map((category) => category.id);
}

export function confirmCategoryDeletion(category: AdminUiCategoryDto, confirmDelete: (message: string) => boolean): boolean {
  return confirmDelete(`Delete category “${category.name.fr ?? category.id}”?`);
}

export function getCategoryActiveUpdate(category: AdminUiCategoryDto): { active: boolean } {
  return { active: !category.active };
}

export function createCategoryDraft(): CategoryDraft {
  return { id: '', name: {}, description: {}, active: true };
}

function categoryToDraft(category: AdminUiCategoryDto): CategoryDraft {
  return { id: category.id, name: clone(category.name), description: clone(category.description ?? {}), active: category.active };
}

export async function saveCategory(adapter: CategoryOperations, draft: CategoryDraft, editingId: string | null): Promise<AdminUiCategoryDto> {
  if (editingId) {
    const input: AdminUiCategoryUpdateInput = { name: clone(draft.name), description: Object.keys(draft.description).length > 0 ? clone(draft.description) : undefined, active: draft.active };
    return adapter.updateCategory(editingId, input); 
  }
  const input: AdminUiCategoryCreateInput = { id: draft.id.trim(), name: clone(draft.name), description: Object.keys(draft.description).length > 0 ? clone(draft.description) : undefined, active: draft.active };
  return adapter.createCategory(input);
}

export function CategoryList({ categories, itemCounts, busy, onMove, onEdit, onDelete, onToggle }: { categories: AdminUiCategoryDto[]; itemCounts: Record<string, number>; busy: boolean; onMove: (index: number, direction: -1 | 1) => void; onEdit: (category: AdminUiCategoryDto) => void; onDelete: (category: AdminUiCategoryDto) => void; onToggle: (category: AdminUiCategoryDto) => void }) {
  return <div className="admin-category-list" aria-label="Categories">{categories.map((category, index) => <article className="admin-category-row" key={category.id}><div className="admin-category-order" aria-label={`Order ${index + 1}`}>{index + 1}</div><div className="admin-category-main"><div className="admin-category-title"><h2>{category.name.fr ?? category.name.en ?? category.name.ar ?? category.id}</h2><span className={category.active ? 'admin-state is-active' : 'admin-state'}>{category.active ? 'Active' : 'Inactive'}</span></div><p className="admin-category-meta"><span>{itemCounts[category.id] ?? 0} items</span><span>ID: {category.id}</span></p></div><div className="admin-category-actions"><button type="button" className="admin-icon-button" aria-label={`Move ${category.name.fr ?? category.id} up`} disabled={index === 0 || busy} onClick={() => onMove(index, -1)}>↑</button><button type="button" className="admin-icon-button" aria-label={`Move ${category.name.fr ?? category.id} down`} disabled={index === categories.length - 1 || busy} onClick={() => onMove(index, 1)}>↓</button><button type="button" className="admin-text-button" onClick={() => onEdit(category)}>Edit</button><button type="button" className="admin-text-button is-danger" onClick={() => onDelete(category)}>Delete</button><button type="button" className="admin-text-button" onClick={() => onToggle(category)}>{category.active ? 'Deactivate' : 'Activate'}</button></div></article>)}</div>;
}

function errorFromUnknown(error: unknown): AdminUiError | null {
  if (error && typeof error === 'object' && 'info' in error) return error as AdminUiError;
  if (error instanceof Error) {
    const wrapped = error as AdminUiError;
    Object.assign(wrapped, { info: { code: 'admin-category-operation-failed', message: error.message, resource: 'category' } });
    return wrapped;
  }
  return null;
}

export function CategoryEditor({ adapter, draft, editingId, state, onDraftChange, onCancel, onSaved, onError }: { adapter: CategoryOperations; draft: CategoryDraft; editingId: string | null; state: CategoryEditorState; onDraftChange: (draft: CategoryDraft) => void; onCancel: () => void; onSaved: (category: AdminUiCategoryDto) => void; onError: (error: AdminUiError | null, state: CategoryEditorState) => void }) {
  const [error, setError] = useState<AdminUiError | null>(null);
  const editorRef = React.useRef<HTMLFormElement>(null);
  
  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  
  const actualFieldErrors = getCategoryFieldErrors(error);
  const setLocalized = (field: 'name' | 'description', locale: 'fr' | 'en' | 'ar', value: string) => onDraftChange({ ...draft, [field]: { ...draft[field], [locale]: value } });
  const save = async () => {
    onError(null, 'saving');
    setError(null);
    try {
      const category = await saveCategory(adapter, draft, editingId);
      onSaved(category);
    } catch (nextError) {
      const nextAdminError = errorFromUnknown(nextError);
      setError(nextAdminError);
      onError(nextAdminError, nextAdminError?.info.fields?.length ? 'validation-error' : 'error');
    }
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(); };

  return (
    <form className="admin-category-editor" onSubmit={submit} noValidate={false} ref={editorRef}>
      <div className="admin-editor-heading"><div><p className="admin-eyebrow">{editingId ? 'Edit category' : 'New category'}</p><h2>{editingId ? 'Update category' : 'Create category'}</h2></div><button type="button" className="admin-text-button" onClick={onCancel}>Cancel</button></div>
      {error ? <CategoryValidationSummary error={error} /> : null}
      <div className="admin-category-id-row">
        <div className="admin-field"><label htmlFor="category-id">Category ID</label><input id="category-id" value={draft.id} disabled={Boolean(editingId)} required onChange={(event) => onDraftChange({ ...draft, id: event.target.value })} aria-invalid={Boolean(actualFieldErrors.id?.length)} />{actualFieldErrors.id?.map((message) => <p className="admin-field-error" key={message}>{message}</p>)}</div>
        <label className="admin-checkbox-label"><input type="checkbox" checked={draft.active} onChange={(event) => onDraftChange({ ...draft, active: event.target.checked })} /> Active</label>
      </div>
      <LocalizedCategoryFields id="name" label="Category name" required value={draft.name} errors={actualFieldErrors} onChange={(locale, value) => setLocalized('name', locale, value)} />
      <LocalizedCategoryFields id="description" label="Description (optional)" value={draft.description} errors={actualFieldErrors} onChange={(locale, value) => setLocalized('description', locale, value)} />
      <div className="admin-editor-actions"><span className={`admin-save-state is-${state}`} aria-live="polite">{state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : state === 'validation-error' ? 'Validation error' : state === 'error' ? 'Could not save' : 'Unsaved changes'}</span><button type="button" className="admin-primary-button" onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'Saving...' : 'Save category'}</button></div>
    </form>
  );
}

function LocalizedCategoryFields({ id, label, required = false, value, errors, onChange }: { id: 'name' | 'description'; label: string; required?: boolean; value: LocalizedText; errors: Record<string, string[]>; onChange: (locale: 'fr' | 'en' | 'ar', value: string) => void }) {
  return <fieldset className="admin-localized-group"><legend>{label}</legend><div className="admin-localized-fields">{locales.map((locale) => { const fieldId = `category-${id}-${locale.key}`; const path = `${id}.${locale.key}`; return <div className="admin-field" key={locale.key}><label htmlFor={fieldId}>{locale.label}{required ? ' *' : ''}</label><textarea id={fieldId} dir={locale.direction} value={value[locale.key] ?? ''} required={required} rows={2} onChange={(event) => onChange(locale.key, event.target.value)} aria-invalid={Boolean(errors[path]?.length)} aria-describedby={errors[path]?.length ? `${fieldId}-error` : undefined} />{errors[path]?.map((message) => <p className="admin-field-error" id={`${fieldId}-error`} key={message}>{message}</p>)}</div>; })}</div></fieldset>;
}

function CategoryValidationSummary({ error }: { error: AdminUiError }) {
  return <section className="admin-validation-summary is-visible" aria-live="assertive" aria-labelledby="category-validation-title"><h3 id="category-validation-title">Unable to save category</h3><p>{error.message}</p>{error.info.fields?.length ? <ul>{error.info.fields.map((field) => <li key={field.path}><strong>{field.path}</strong>: {field.message}</li>)}</ul> : null}</section>;
}

export function CategoryManager({ adapter, serverActions }: CategoryManagerProps) {
  const operations = useMemo(() => adapter ?? (serverActions ? {
    getManagementState: () => serverActions.getManagementState().then(unwrapAdminAction),
    createCategory: (input: AdminUiCategoryCreateInput) => serverActions.createCategory(input).then(unwrapAdminAction),
    updateCategory: (id: string, input: AdminUiCategoryUpdateInput) => serverActions.updateCategory(id, input).then(unwrapAdminAction),
    deleteCategory: (id: string) => serverActions.deleteCategory(id).then(unwrapAdminAction),
    reorderCategories: (ids: string[]) => serverActions.reorderCategories(ids).then(unwrapAdminAction),
  } : undefined), [adapter, serverActions]);
  if (!operations) throw new Error('Category operations are not configured.');
  const [categories, setCategories] = useState<AdminUiCategoryDto[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [editorDraft, setEditorDraft] = useState<CategoryDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, setState] = useState<CategoryEditorState>('loading');
  const [error, setError] = useState<AdminUiError | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const load = async () => {
    const managementState = await operations.getManagementState();
    setCategories(managementState.categories);
    setItemCounts(getCategoryItemCounts(managementState));
  };

  useEffect(() => {
    load().then(() => setState('ready')).catch((nextError) => { setError(errorFromUnknown(nextError)); setState('error'); });
  }, []);

  const openCreate = () => { setEditingId(null); setEditorDraft(createCategoryDraft()); setError(null); setHasChanges(false); setState('ready'); };
  const openEdit = (category: AdminUiCategoryDto) => { setEditingId(category.id); setEditorDraft(categoryToDraft(category)); setError(null); setHasChanges(false); setState('ready'); };
  const closeEditor = () => { setEditorDraft(null); setEditingId(null); setError(null); setHasChanges(false); setState('ready'); };
  const handleDraftChange = (draft: CategoryDraft) => { setEditorDraft(draft); setHasChanges(true); setState('ready'); };
  const handleSaved = async () => { await load(); setEditorDraft(null); setEditingId(null); setHasChanges(false); setError(null); setState('saved'); };
  const handleEditorError = (nextError: AdminUiError | null, nextState: CategoryEditorState) => { setError(nextError); setState(nextState); };
  const moveCategory = async (index: number, direction: -1 | 1) => {
    const orderedIds = getReorderedCategoryIds(categories, index, direction);
    if (!orderedIds) return;
    setState('saving');
    try {
      const updated = await operations.reorderCategories(orderedIds);
      setCategories(updated);
      setState('saved');
    } catch (nextError) {
      setError(errorFromUnknown(nextError));
      setState('error');
    }
  };
  const toggleActive = async (category: AdminUiCategoryDto) => {
    setState('saving');
    try {
      const updated = await operations.updateCategory(category.id, getCategoryActiveUpdate(category));
      setCategories(categories.map((candidate) => candidate.id === updated.id ? updated : candidate));
      setState('saved');
    } catch (nextError) { setError(errorFromUnknown(nextError)); setState('error'); }
  };
  const deleteCategory = async (category: AdminUiCategoryDto) => {
    if (!confirmCategoryDeletion(category, (message) => window.confirm(message))) return;
    setState('saving');
    try {
      await operations.deleteCategory(category.id);
      await load();
      setState('saved');
    } catch (nextError) { setError(errorFromUnknown(nextError)); setState('error'); }
  };

  if (state === 'loading') return <p className="admin-placeholder">Loading categories...</p>;

  return <div className="admin-category-manager">
    {error && !editorDraft ? <CategoryErrorSummary error={error} /> : null}
    <div className="admin-list-toolbar"><div><p className="admin-eyebrow">Menu organization</p><p className="admin-list-count">{categories.length} categories</p></div><button type="button" className="admin-primary-button" onClick={openCreate}>Create category</button></div>
    <CategoryList categories={categories} itemCounts={itemCounts} busy={state === 'saving'} onMove={moveCategory} onEdit={openEdit} onDelete={deleteCategory} onToggle={toggleActive} />
    {categories.length === 0 ? <p className="admin-empty-state">No categories found.</p> : null}
    {editorDraft ? <CategoryEditor adapter={operations} draft={editorDraft} editingId={editingId} state={hasChanges ? state : 'ready'} onDraftChange={handleDraftChange} onCancel={closeEditor} onSaved={handleSaved} onError={handleEditorError} /> : null}
  </div>;
}

function CategoryErrorSummary({ error }: { error: AdminUiError }) {
  const isReferenced = error.info.code === 'category-in-use' || error.info.code === 'category-has-items' || error.info.code === 'category-not-empty';
  return <section className="admin-validation-summary is-visible" aria-live="assertive"><h2>{isReferenced ? 'Category cannot be deleted' : 'Category action failed'}</h2><p>{error.message}</p>{error.info.details?.length ? <ul>{error.info.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}{error.info.fields?.length ? <ul>{error.info.fields.map((field) => <li key={field.path}><strong>{field.path}</strong>: {field.message}</li>)}</ul> : null}</section>;
}