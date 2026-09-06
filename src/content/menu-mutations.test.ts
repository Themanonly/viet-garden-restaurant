import assert from 'node:assert/strict';
import test from 'node:test';
import { menuDocument, type FeaturedSection, type MenuAvailability, type MenuCategory, type MenuItem } from './menu';
import { LocalMediaRepository } from './media-repository';
import { InMemoryMenuMutationRepository, MenuMutationError, createMenuMutationService } from './menu-mutations';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function category(id: string, sortOrder: number): MenuCategory {
  return {
    id,
    name: { fr: `Catégorie ${id}`, en: `Category ${id}`, ar: `الفئة ${id}` },
    sortOrder,
    active: true,
  };
}

function item(id: string, categoryId: string): MenuItem {
  return {
    id,
    categoryId,
    name: { fr: `Article ${id}`, en: `Item ${id}`, ar: `العنصر ${id}` },
    description: { fr: 'Description', en: 'Description', ar: 'الوصف' },
    price: { amount: 10, currency: 'MAD' },
    sortOrder: 0,
    active: true,
  };
}

function section(id: string, itemIds: string[]): FeaturedSection {
  return {
    id,
    title: { fr: `Section ${id}`, en: `Section ${id}`, ar: `القسم ${id}` },
    itemIds,
    sortOrder: 99,
    active: true,
  };
}

function serviceFor(document = menuDocument) {
  const repository = new InMemoryMenuMutationRepository(clone(document));
  return { repository, service: createMenuMutationService(repository, new LocalMediaRepository()) };
}

async function expectMutationError(action: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => error instanceof MenuMutationError && error.code === code);
}

test('creates and updates a category', async () => {
  const { service } = serviceFor();
  await service.createCategory(category('test-category', 99));
  const updated = await service.updateCategory('test-category', { name: { fr: 'Modifiée', en: 'Updated', ar: 'معدلة' } });
  assert.equal(updated.categories.find((entry) => entry.id === 'test-category')?.name.en, 'Updated');
});

test('rejects duplicate category IDs', async () => {
  const { service } = serviceFor();
  await expectMutationError(service.createCategory(category('soupes', 99)), 'duplicate-category-id');
});

test('rejects deleting a category referenced by an item', async () => {
  const { service } = serviceFor();
  await expectMutationError(service.deleteCategory('soupes'), 'category-in-use');
});

test('creates an item and rejects invalid categories and media', async () => {
  const { repository, service } = serviceFor();
  const created = await service.createMenuItem(item('test-item', 'soupes'));
  assert.ok(created.items.some((entry) => entry.id === 'test-item'));
  const before = await repository.getMenu();
  await expectMutationError(service.createMenuItem(item('invalid-category-item', 'missing-category')), 'category-not-found');
  await expectMutationError(service.createMenuItem({ ...item('invalid-media-item', 'soupes'), mediaId: 'missing-media' }), 'invalid-menu');
  const after = await repository.getMenu();
  assert.equal(after.items.length, before.items.length);
});

test('moves an item and reorders items deterministically', async () => {
  const { service } = serviceFor();
  const moved = await service.moveMenuItem('poulets-mixao-90', 'soupes');
  assert.equal(moved.items.find((entry) => entry.id === 'poulets-mixao-90')?.categoryId, 'soupes');
  const reordered = await service.reorderItems('soupes', ['poulets-mixao-90', 'soupes-formule-chef', 'soupes-pho', 'soupes-ravioli-crevettes', 'soupes-viet-garden', 'soupes-vermicelles-poulet-crevettes', 'soupes-pekinoise']);
  const soupItems = reordered.items.filter((entry) => entry.categoryId === 'soupes').sort((first, second) => first.sortOrder - second.sortOrder);
  assert.deepEqual(soupItems.map((entry) => entry.id), ['poulets-mixao-90', 'soupes-formule-chef', 'soupes-pho', 'soupes-ravioli-crevettes', 'soupes-viet-garden', 'soupes-vermicelles-poulet-crevettes', 'soupes-pekinoise']);
});

test('creates a featured section and rejects unknown item references', async () => {
  const { service } = serviceFor();
  const created = await service.createFeaturedSection(section('test-section', ['soupes-pho']));
  assert.deepEqual(created.featuredSections.at(-1)?.itemIds, ['soupes-pho']);
  await expectMutationError(service.createFeaturedSection(section('invalid-section', ['missing-item'])), 'invalid-menu');
});

test('deleting an item removes its featured references safely', async () => {
  const source = clone(menuDocument);
  source.featuredSections.push(section('test-section', ['soupes-pho']));
  const { service } = serviceFor(source);
  const updated = await service.deleteMenuItem('soupes-pho');
  assert.equal(updated.items.some((entry) => entry.id === 'soupes-pho'), false);
  assert.equal(updated.featuredSections.find((entry) => entry.id === 'test-section')?.itemIds.includes('soupes-pho'), false);
});

test('rejects invalid availability and preserves the previous document', async () => {
  const { repository, service } = serviceFor();
  const before = await repository.getMenu();
  const invalid = clone(before.availability);
  invalid.schedule.monday = [{ opensAt: '18:00', closesAt: '09:00' }];
  await expectMutationError(service.updateAvailability(invalid), 'invalid-menu');
  assert.deepEqual(await repository.getMenu(), before);
});

test('accepts valid availability', async () => {
  const { service } = serviceFor();
  const availability: MenuAvailability = clone(menuDocument.availability);
  availability.status = 'closed';
  availability.manualOverride = 'none';
  availability.schedule.monday = [{ opensAt: '10:00', closesAt: '12:00' }];
  const updated = await service.updateAvailability(availability);
  assert.equal(updated.availability.schedule.monday[0].opensAt, '10:00');
});

test('rejects removal of media referenced by a menu item', async () => {
  const { service } = serviceFor();
  await expectMutationError(service.removeMedia('menu-soupe-pho'), 'media-in-use');
});
