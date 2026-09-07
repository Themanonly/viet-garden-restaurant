import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicRestaurantStatus } from '../components/public-restaurant-status';
import { createAdminMenuService } from './admin-menu-service';
import { AdminMenuUiAdapter } from './admin-menu-ui-adapter';
import { createMediaRepository } from './media-repository';
import { createMenuRepository } from './menu-repository';
import { createPersistentMenuRepository } from './menu-persistence-repository';

test('Admin mutations propagate through persistent storage to fresh public repositories', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-menu-flow-'));
  const filePath = path.join(directory, 'menu-state.json');

  try {
    const adminAdapter = new AdminMenuUiAdapter(createAdminMenuService(createPersistentMenuRepository(filePath), createMediaRepository()));
    const publicMenu = async () => createMenuRepository(filePath).getMenu();
    const temporaryId = 'admin-verification-flow-test';
    const baseline = await publicMenu();

    await adminAdapter.createCategory({ id: temporaryId, name: { fr: 'Vérification Admin', en: 'Admin Verification', ar: 'تحقق الإدارة' }, active: true });
    assert.equal((await publicMenu()).categories.find((category) => category.id === temporaryId)?.name.fr, 'Vérification Admin');

    await adminAdapter.updateCategory(temporaryId, { name: { fr: 'Vérification Modifiée', en: 'Admin Verification Edited', ar: 'تحقق الإدارة المعدل' } });
    const edited = (await publicMenu()).categories.find((category) => category.id === temporaryId);
    assert.deepEqual(edited?.name, { fr: 'Vérification Modifiée', en: 'Admin Verification Edited', ar: 'تحقق الإدارة المعدل' });

    await adminAdapter.updateCategory(temporaryId, { active: false });
    assert.equal((await publicMenu()).categories.find((category) => category.id === temporaryId)?.active, false);
    await adminAdapter.updateCategory(temporaryId, { active: true });
    assert.equal((await publicMenu()).categories.find((category) => category.id === temporaryId)?.active, true);

    const currentOrder = (await publicMenu()).categories.map((category) => category.id);
    const firstCategoryId = currentOrder[0];
    await adminAdapter.reorderCategories([temporaryId, ...currentOrder.filter((id) => id !== temporaryId)]);
    const reordered = (await publicMenu()).categories.sort((first, second) => first.sortOrder - second.sortOrder).map((category) => category.id);
    assert.equal(reordered[0], temporaryId);
    assert.equal(reordered[1], firstCategoryId);

    await adminAdapter.deleteCategory(temporaryId);
    const restored = await publicMenu();
    assert.equal(restored.categories.some((category) => category.id === temporaryId), false);
    assert.equal(restored.categories.length, baseline.categories.length);
    assert.equal(restored.items.length, baseline.items.length);
    assert.deepEqual(restored.featuredSections, baseline.featuredSections);

    const freshAfterCleanup = await createMenuRepository(filePath).getMenu();
    assert.equal(freshAfterCleanup.categories.length, 10);
    assert.equal(freshAfterCleanup.items.length, 45);
    assert.equal(freshAfterCleanup.featuredSections[0].itemIds.length, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Restaurant Status mutations persist through fresh public repositories', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-status-flow-'));
  const filePath = path.join(directory, 'menu-state.json');

  try {
    const repository = createPersistentMenuRepository(filePath);
    const adminAdapter = new AdminMenuUiAdapter(createAdminMenuService(repository, createMediaRepository()));
    const baseline = await createMenuRepository(filePath).getMenu();
    const changedAvailability = {
      ...baseline.availability,
      manualOverride: 'closed' as const,
      statusMessage: { fr: 'Test de persistance', en: 'Persistence test', ar: 'اختبار الاستمرارية' },
    };

    const updated = await adminAdapter.updateAvailability(changedAvailability);
    const freshPublicState = await createMenuRepository(filePath).getMenu();
    assert.equal(updated.effectiveStatus, 'closed');
    assert.deepEqual(freshPublicState.availability, changedAvailability);
    assert.match(renderToStaticMarkup(React.createElement(PublicRestaurantStatus, { availability: freshPublicState.availability, locale: 'fr' })), /FERMÉ/);
    assert.match(renderToStaticMarkup(React.createElement(PublicRestaurantStatus, { availability: freshPublicState.availability, locale: 'en' })), /CLOSED/);
    assert.match(renderToStaticMarkup(React.createElement(PublicRestaurantStatus, { availability: freshPublicState.availability, locale: 'ar' })), /مغلق/);

    await adminAdapter.updateAvailability(baseline.availability);
    const restored = await createMenuRepository(filePath).getMenu();
    assert.deepEqual(restored.availability, baseline.availability);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid persistence mutations do not replace the previous valid document', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-menu-invalid-'));
  const filePath = path.join(directory, 'menu-state.json');

  try {
    const adapter = new AdminMenuUiAdapter(createAdminMenuService(createPersistentMenuRepository(filePath), createMediaRepository()));
    const before = await createMenuRepository(filePath).getMenu();
    await assert.rejects(() => adapter.createCategory({ id: 'invalid-category', name: { fr: 'Only French' }, active: true }));
    const after = await createMenuRepository(filePath).getMenu();
    assert.deepEqual(after, before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('same-process concurrent Admin mutations are serialized by the persistent repository', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-menu-concurrent-'));
  const filePath = path.join(directory, 'menu-state.json');

  try {
    const adapter = new AdminMenuUiAdapter(createAdminMenuService(createPersistentMenuRepository(filePath), createMediaRepository()));
    await Promise.all([
      adapter.createCategory({ id: 'concurrent-one', name: { fr: 'Concurrent One', en: 'Concurrent One', ar: 'الأول المتزامن' }, active: true }),
      adapter.createCategory({ id: 'concurrent-two', name: { fr: 'Concurrent Two', en: 'Concurrent Two', ar: 'الثاني المتزامن' }, active: true }),
    ]);
    const current = await createMenuRepository(filePath).getMenu();
    assert.equal(current.categories.some((category) => category.id === 'concurrent-one'), true);
    assert.equal(current.categories.some((category) => category.id === 'concurrent-two'), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
