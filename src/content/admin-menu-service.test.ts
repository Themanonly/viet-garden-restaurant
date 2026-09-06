import assert from 'node:assert/strict';
import test from 'node:test';
import { menuDocument } from './menu';
import { AdminApplicationError, AdminMenuService, type AdminCategoryCreateInput, type AdminMenuItemCreateInput } from './admin-menu-service';
import { LocalMediaRepository } from './media-repository';
import { InMemoryMenuMutationRepository, MenuMutationService } from './menu-mutations';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function categoryInput(id: string): AdminCategoryCreateInput {
  return {
    id,
    name: { fr: `Catégorie ${id}`, en: `Category ${id}`, ar: `الفئة ${id}` },
    active: true,
  };
}

function itemInput(id: string): AdminMenuItemCreateInput {
  return {
    id,
    categoryId: 'soupes',
    name: { fr: `Article ${id}`, en: `Item ${id}`, ar: `العنصر ${id}` },
    description: { fr: 'Description', en: 'Description', ar: 'الوصف' },
    price: { amount: 12, currency: 'MAD' },
    active: true,
  };
}

function serviceWithRepository() {
  const repository = new InMemoryMenuMutationRepository(clone(menuDocument));
  const service = new AdminMenuService(
    new MenuMutationService(repository, new LocalMediaRepository()),
    new LocalMediaRepository(),
  );
  return { repository, service };
}

async function expectAdminError(action: Promise<unknown>, code: string, resource: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => error instanceof AdminApplicationError && error.info.code === code && error.info.resource === resource);
}

async function expectFieldError(action: Promise<unknown>, path: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => error instanceof AdminApplicationError && error.info.fields?.some((field) => field.path === path));
}

test('Admin category creation reaches the domain service', async () => {
  const { service } = serviceWithRepository();
  const created = await service.createCategory(categoryInput('admin-category'));
  assert.equal(created.id, 'admin-category');
});

test('Admin invalid category creation returns a structured validation error atomically', async () => {
  const { repository, service } = serviceWithRepository();
  const before = await repository.getMenu();
  await expectAdminError(service.createCategory({ ...categoryInput('invalid-category'), name: { fr: 'Only French' } }), 'invalid-menu', 'category');
  await expectFieldError(service.createCategory({ ...categoryInput('invalid-category-2'), name: { fr: 'Only French' } }), 'name.en');
  assert.deepEqual(await repository.getMenu(), before);
});

test('Admin item creation and update use domain mutations', async () => {
  const { service } = serviceWithRepository();
  const created = await service.createItem(itemInput('admin-item'));
  assert.equal(created.id, 'admin-item');
  const updated = await service.updateItem('admin-item', { active: false, price: { amount: 20, currency: 'MAD' } });
  assert.equal(updated.active, false);
  assert.equal(updated.price.amount, 20);
});

test('Admin category deletion preserves referential integrity errors', async () => {
  const { service } = serviceWithRepository();
  await expectAdminError(service.deleteCategory('soupes'), 'category-in-use', 'category');
});

test('Admin item validation exposes price and category field paths', async () => {
  const { service } = serviceWithRepository();
  await expectFieldError(service.createItem({ ...itemInput('invalid-price'), price: { amount: -1, currency: 'MAD' } }), 'price.amount');
  await expectFieldError(service.createItem({ ...itemInput('invalid-category'), categoryId: 'missing-category' }), 'categoryId');
});

test('Admin FeaturedSection mutations work through the facade', async () => {
  const { service } = serviceWithRepository();
  const created = await service.createFeaturedSection({
    id: 'admin-featured',
    title: { fr: 'Sélection', en: 'Selection', ar: 'اختيار' },
    itemIds: ['soupes-pho'],
    active: true,
  });
  assert.equal(created.id, 'admin-featured');
  const updated = await service.updateFeaturedSection('admin-featured', { active: false });
  assert.equal(updated.active, false);
  await service.deleteFeaturedSection('admin-featured');
  assert.equal((await service.listFeaturedSections()).some((section) => section.id === 'admin-featured'), false);
});

test('Admin media removal is safe and does not expose raw repository methods', async () => {
  const { service } = serviceWithRepository();
  await expectAdminError(service.removeMedia('menu-soupe-pho'), 'media-in-use', 'media');
  assert.equal(typeof (service as unknown as { removeMedia: unknown }).removeMedia, 'function');
  assert.equal(typeof (service as unknown as { replaceMedia: unknown }).replaceMedia, 'function');
  assert.equal(typeof (service as unknown as { replaceMenu: unknown }).replaceMenu, 'undefined');
});

test('Admin media DTOs expose usage counts and stable references', async () => {
  const { service } = serviceWithRepository();
  const referenced = await service.getMedia('menu-soupe-pho');
  assert.equal(referenced?.usageCount, 1);
  assert.deepEqual(referenced?.referencedBy.map((reference) => reference.itemId), ['soupes-pho']);
  const unreferenced = await service.getMedia('brand-logo');
  assert.equal(unreferenced?.usageCount, 0);
  assert.deepEqual(unreferenced?.referencedBy, []);
});

test('Admin availability update validates and accepts valid input', async () => {
  const { service } = serviceWithRepository();
  const invalid = clone(menuDocument.availability);
  invalid.schedule.monday = [{ opensAt: '18:00', closesAt: '09:00' }];
  await expectAdminError(service.updateAvailability(invalid), 'invalid-menu', 'availability');
  await expectFieldError(service.updateAvailability(invalid), 'schedule.monday[0].opens');
  const valid = clone(menuDocument.availability);
  valid.status = 'closed';
  valid.manualOverride = 'none';
  valid.schedule.monday = [{ opensAt: '10:00', closesAt: '12:00' }];
  const state = await service.updateAvailability(valid);
  assert.equal(state.availability.status, 'closed');
});
