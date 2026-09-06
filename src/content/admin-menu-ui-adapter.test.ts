import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AdminApplicationError,
  type AdminMenuItemCreateInput,
  type AdminMenuStateDto,
  type AdminMediaDto,
  type AdminMenuService,
} from './admin-menu-service';
import { AdminMenuUiAdapter } from './admin-menu-ui-adapter';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fakeService(overrides: Partial<Record<keyof AdminMenuService, unknown>> = {}): { service: AdminMenuService; calls: string[] } {
  const calls: string[] = [];
  const state = {
    availability: {
      status: 'open',
      schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
      temporaryClosure: { active: false, message: {} },
      manualOverride: 'open',
      statusMessage: {},
    },
    effectiveStatus: 'open',
    categories: [],
    items: [],
    featuredSections: [],
  } as unknown as AdminMenuStateDto;
  const methods = {
    getManagementState: async () => { calls.push('getManagementState'); return state; },
    updateAvailability: async (input: unknown) => { calls.push('updateAvailability'); return { ...state, availability: input }; },
    listCategories: async () => { calls.push('listCategories'); return []; },
    createCategory: async () => { calls.push('createCategory'); return { id: 'category' }; },
    updateCategory: async () => { calls.push('updateCategory'); return { id: 'category' }; },
    deleteCategory: async () => { calls.push('deleteCategory'); },
    reorderCategories: async () => { calls.push('reorderCategories'); return []; },
    listItems: async () => { calls.push('listItems'); return []; },
    createItem: async () => { calls.push('createItem'); return { id: 'item' }; },
    updateItem: async () => { calls.push('updateItem'); return { id: 'item' }; },
    deleteItem: async () => { calls.push('deleteItem'); },
    moveItem: async () => { calls.push('moveItem'); return { id: 'item' }; },
    reorderItems: async () => { calls.push('reorderItems'); return []; },
    listFeaturedSections: async () => { calls.push('listFeaturedSections'); return []; },
    createFeaturedSection: async () => { calls.push('createFeaturedSection'); return { id: 'section' }; },
    updateFeaturedSection: async () => { calls.push('updateFeaturedSection'); return { id: 'section' }; },
    deleteFeaturedSection: async () => { calls.push('deleteFeaturedSection'); },
    reorderFeaturedSections: async () => { calls.push('reorderFeaturedSections'); return []; },
    listMedia: async () => { calls.push('listMedia'); return []; },
    getMedia: async () => { calls.push('getMedia'); return undefined; },
    registerMedia: async () => { calls.push('registerMedia'); return {}; },
    replaceMedia: async () => { calls.push('replaceMedia'); return {}; },
    removeMedia: async () => { calls.push('removeMedia'); },
  };
  return { service: { ...methods, ...overrides } as unknown as AdminMenuService, calls };
}

test('delegates the complete Admin operation surface', async () => {
  const { service, calls } = fakeService();
  const adapter = new AdminMenuUiAdapter(service);
  await adapter.getManagementState();
  await adapter.updateAvailability({} as never);
  await adapter.listCategories();
  await adapter.createCategory({} as never);
  await adapter.updateCategory('category', {});
  await adapter.deleteCategory('category');
  await adapter.reorderCategories([]);
  await adapter.listItems();
  await adapter.createItem({} as AdminMenuItemCreateInput);
  await adapter.updateItem('item', {});
  await adapter.deleteItem('item');
  await adapter.moveItem('item', 'category');
  await adapter.reorderItems('category', []);
  await adapter.listFeaturedSections();
  await adapter.createFeaturedSection({} as never);
  await adapter.updateFeaturedSection('section', {});
  await adapter.deleteFeaturedSection('section');
  await adapter.reorderFeaturedSections([]);
  await adapter.listMedia();
  await adapter.getMedia('media');
  await adapter.registerMedia({} as never);
  await adapter.replaceMedia('media', {} as never);
  await adapter.removeMedia('media');
  assert.equal(calls.length, 23);
});

test('preserves field-path errors without converting them to strings', async () => {
  const error = new AdminApplicationError({
    code: 'invalid-menu',
    message: 'Invalid price.',
    resource: 'item',
    field: 'price.amount',
    fields: [{ code: 'invalid-price', message: 'Invalid price.', path: 'price.amount' }],
  });
  const { service } = fakeService({ createItem: async () => { throw error; } });
  await assert.rejects(new AdminMenuUiAdapter(service).createItem({} as never), (received: unknown) => received === error);
});

test('preserves media usage DTOs and protects input/output references', async () => {
  const media: AdminMediaDto = {
    id: 'media',
    type: 'image',
    source: 'remote',
    reference: 'https://example.test/media.jpg',
    alt: { fr: 'Image' },
    visible: true,
    sortOrder: 1,
    usageCount: 1,
    referencedBy: [{ itemId: 'item', categoryId: 'category' }],
  };
  const input = { name: { fr: 'Original' } };
  const { service } = fakeService({
    updateCategory: async (categoryId: string, update: { name: { fr: string } }) => {
      update.name.fr = 'Changed';
      return { id: categoryId, name: update.name };
    },
    getMedia: async () => media,
  });
  const adapter = new AdminMenuUiAdapter(service);
  const updated = await adapter.updateCategory('category', input);
  const fetched = await adapter.getMedia('media');
  assert.equal(input.name.fr, 'Original');
  assert.equal(updated.name.fr, 'Changed');
  assert.equal(fetched?.usageCount, 1);
  assert.deepEqual(fetched?.referencedBy, [{ itemId: 'item', categoryId: 'category' }]);
  assert.notEqual(fetched, media);
});
