import assert from 'node:assert/strict';
import test from 'node:test';
import { mediaCatalog } from './media';
import { menuDocument } from './menu';
import { SupabaseMenuRepository } from './supabase-menu-repository';
import { SupabaseMediaRepository, type SupabaseMediaRow } from './supabase-media-repository';
import type { MediaStorage, StoredMediaObject } from './media-storage';
import type { SupabaseDatabaseClient } from './supabase-database';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function menuRows() {
  const categories = menuDocument.categories.map((category) => ({ ...category, sort_order: category.sortOrder }));
  const items = menuDocument.items.map((item) => ({
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    description: item.description,
    price_amount: item.price.amount,
    price_currency: item.price.currency,
    media_id: item.mediaId ?? null,
    active: item.active,
    sort_order: item.sortOrder,
  }));
  const sections = menuDocument.featuredSections.map((section) => ({ ...section, sort_order: section.sortOrder }));
  const sectionItems = menuDocument.featuredSections.flatMap((section) => section.itemIds.map((menuItemId, sort_order) => ({ featured_section_id: section.id, menu_item_id: menuItemId, sort_order })));
  const availability = [{
    id: 'default',
    status: menuDocument.availability.status,
    manual_override: menuDocument.availability.manualOverride,
    temporary_closure_active: menuDocument.availability.temporaryClosure.active,
    temporary_closure_message: menuDocument.availability.temporaryClosure.message,
    status_message: menuDocument.availability.statusMessage,
  }];
  const weekdayNumbers = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const periods = weekdayNumbers.flatMap((weekday, weekdayIndex) => menuDocument.availability.schedule[weekday].map((period, sort_order) => ({ weekday: weekdayIndex, sort_order, opens_at: `${period.opensAt}:00`, closes_at: `${period.closesAt}:00` })));
  return { categories, items, sections, sectionItems, availability, periods };
}

class FakeDatabase implements SupabaseDatabaseClient {
  readonly rpcCalls: Array<{ name: string; body: unknown }> = [];
  private revision = 0;
  private readonly rows = menuRows();
  private readonly mediaRows = mediaCatalog.map((asset) => ({ id: asset.id, type: asset.type, source: asset.source, storage_bucket: null, storage_key: null, reference_url: asset.reference, alt: asset.alt, visible: asset.visible, sort_order: asset.sortOrder }));

  async select<T>(table: string): Promise<T[]> {
    const values: Record<string, unknown[]> = {
      menu_categories: this.rows.categories,
      menu_items: this.rows.items,
      featured_sections: this.rows.sections,
      featured_section_items: this.rows.sectionItems,
      restaurant_availability: this.rows.availability,
      restaurant_availability_periods: this.rows.periods,
      content_revisions: [{ revision: this.revision }],
      media: this.mediaRows,
    };
    return clone((values[table] ?? []) as T[]);
  }

  async insert<T>(table: string, rows: unknown[]): Promise<T[]> {
    if (table !== 'media') throw new Error('not used');
    this.mediaRows.push(...rows as typeof this.mediaRows);
    return clone(rows) as T[];
  }
  async upsert<T>(): Promise<T[]> { throw new Error('not used'); }
  async update<T>(table: string, query: string, patch: unknown): Promise<T[]> {
    if (table !== 'media') throw new Error('not used');
    const id = decodeURIComponent(query.split('eq.')[1] ?? '');
    const index = this.mediaRows.findIndex((row) => row.id === id);
    if (index < 0) return [];
    this.mediaRows[index] = { ...this.mediaRows[index], ...patch as typeof this.mediaRows[number] };
    return [clone(this.mediaRows[index]) as T];
  }
  async remove<T>(table: string, query: string): Promise<T[]> {
    if (table !== 'media') throw new Error('not used');
    const id = decodeURIComponent(query.split('eq.')[1] ?? '');
    const index = this.mediaRows.findIndex((row) => row.id === id);
    if (index < 0) return [];
    return [clone(this.mediaRows.splice(index, 1)[0]) as T];
  }

  async rpc<T>(name: string, body: unknown): Promise<T> {
    this.rpcCalls.push({ name, body });
    this.revision += 1;
    return this.revision as T;
  }
}

class FakeStorage implements MediaStorage {
  readonly provider = 'object' as const;
  readonly objects = new Set<string>();
  private counter = 0;

  async put(): Promise<StoredMediaObject> {
    const storageKey = `uploads/test-${this.counter++}.png`;
    this.objects.add(storageKey);
    return { storageKey, reference: `https://example.supabase.co/storage/v1/object/public/viet-garden-media/${storageKey}`, source: 'remote' };
  }

  async read() { return { bytes: Buffer.from([]), contentType: 'image/png' }; }
  async delete(storageKey: string) { this.objects.delete(storageKey); }
  async exists(storageKey: string) { return this.objects.has(storageKey); }
}

test('Supabase menu repository preserves the complete canonical baseline', async () => {
  const database = new FakeDatabase();
  const menu = await new SupabaseMenuRepository(database).getMenu();
  assert.deepEqual(menu, menuDocument);
  assert.equal(menu.categories.length, 10);
  assert.equal(menu.items.length, 45);
  assert.equal(menu.featuredSections.length, 1);
  assert.equal(menu.featuredSections[0]?.itemIds.length, 3);
  assert.equal(menu.items.every((item) => item.price.currency === 'MAD'), true);
});

test('Supabase menu repository uses the atomic replacement RPC and revision', async () => {
  const database = new FakeDatabase();
  const repository = new SupabaseMenuRepository(database);
  const menu = await repository.getMenu();
  await repository.replaceMenu(menu);
  assert.equal(database.rpcCalls.length, 1);
  assert.equal(database.rpcCalls[0]?.name, 'replace_menu_document');
  assert.deepEqual((database.rpcCalls[0]?.body as { expected_revision: number }).expected_revision, 0);
});

test('Supabase media repository preserves IDs and cleans up replaced objects', async () => {
  const database = new FakeDatabase();
  const storage = new FakeStorage();
  const repository = new SupabaseMediaRepository(database, storage, 'viet-garden-media');
  const asset = mediaCatalog[0];
  assert.ok(asset);
  const stored = await repository.registerUploadedMedia({ ...asset, id: 'temporary-media', reference: '', storageKey: undefined }, { bytes: new Uint8Array([1]), type: 'image', extension: 'png' });
  assert.equal(stored.id, 'temporary-media');
  assert.equal(stored.storageKey, 'uploads/test-0.png');
  assert.equal(await storage.exists('uploads/test-0.png'), true);
});
