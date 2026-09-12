'use server';

import type { AdminUiAvailabilityInput, AdminUiCategoryCreateInput, AdminUiCategoryUpdateInput, AdminUiFeaturedSectionCreateInput, AdminUiFeaturedSectionUpdateInput, AdminUiMediaCreateInput, AdminUiMediaReplacementInput, AdminUiMenuItemCreateInput, AdminUiMenuItemUpdateInput } from './admin-menu-ui-adapter';
import { AdminAuthorizationError, requireAdmin } from './admin-auth';
import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import { getAdminMenuUiAdapter } from './admin-ui-adapter-instance';
import type { AdminUiContactCreateInput, AdminUiContactUpdateInput, AdminUiOrderingChannelCreateInput, AdminUiOrderingChannelUpdateInput, AdminUiSocialCreateInput, AdminUiSocialUpdateInput } from './admin-restaurant-profile-ui-adapter';
import { getAdminRestaurantProfileUiAdapter } from './admin-restaurant-profile-adapter-instance';
import type { AdminUiPromotionCreateInput, AdminUiPromotionUpdateInput } from './admin-promotion-ui-adapter';
import { getAdminPromotionUiAdapter } from './admin-promotion-adapter-instance';

export type AdminActionResult<T> = { ok: true; value: T } | { ok: false; error: AdminErrorInfo };

async function execute<T>(resource: AdminErrorInfo['resource'], action: () => Promise<T>): Promise<AdminActionResult<T>> {
  try {
    await requireAdmin();
    return { ok: true, value: await action() };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { ok: false, error: { code: error.status === 401 ? 'admin-authentication-required' : 'admin-authorization-required', message: error.message, resource } };
    if (error instanceof AdminApplicationError) return { ok: false, error: error.info };
    return { ok: false, error: { code: `admin-${resource}-operation-failed`, message: `The ${resource} operation could not be completed.`, resource } };
  }
}

export async function readAdminManagementState() {
  return execute('menu', () => getAdminMenuUiAdapter().getManagementState());
}

export async function saveAdminAvailability(input: AdminUiAvailabilityInput) {
  const adapter = getAdminMenuUiAdapter();
  return execute('availability', async () => {
    await adapter.updateAvailability(input);
    return adapter.getManagementState();
  });
}

export async function createAdminCategory(input: AdminUiCategoryCreateInput) {
  return execute('category', () => getAdminMenuUiAdapter().createCategory(input));
}

export async function updateAdminCategory(categoryId: string, input: AdminUiCategoryUpdateInput) {
  return execute('category', () => getAdminMenuUiAdapter().updateCategory(categoryId, input));
}

export async function deleteAdminCategory(categoryId: string) {
  return execute('category', () => getAdminMenuUiAdapter().deleteCategory(categoryId));
}

export async function reorderAdminCategories(categoryIds: string[]) {
  return execute('category', () => getAdminMenuUiAdapter().reorderCategories(categoryIds));
}

export async function createAdminItem(input: AdminUiMenuItemCreateInput) {
  return execute('item', () => getAdminMenuUiAdapter().createItem(input));
}

export async function updateAdminItem(itemId: string, input: AdminUiMenuItemUpdateInput) {
  return execute('item', () => getAdminMenuUiAdapter().updateItem(itemId, input));
}

export async function deleteAdminItem(itemId: string) {
  return execute('item', () => getAdminMenuUiAdapter().deleteItem(itemId));
}

export async function moveAdminItem(itemId: string, categoryId: string) {
  return execute('item', () => getAdminMenuUiAdapter().moveItem(itemId, categoryId));
}

export async function reorderAdminItems(categoryId: string, itemIds: string[]) {
  return execute('item', () => getAdminMenuUiAdapter().reorderItems(categoryId, itemIds));
}

export async function createAdminFeaturedSection(input: AdminUiFeaturedSectionCreateInput) {
  return execute('featured-section', () => getAdminMenuUiAdapter().createFeaturedSection(input));
}

export async function updateAdminFeaturedSection(sectionId: string, input: AdminUiFeaturedSectionUpdateInput) {
  return execute('featured-section', () => getAdminMenuUiAdapter().updateFeaturedSection(sectionId, input));
}

export async function deleteAdminFeaturedSection(sectionId: string) {
  return execute('featured-section', () => getAdminMenuUiAdapter().deleteFeaturedSection(sectionId));
}

export async function reorderAdminFeaturedSections(sectionIds: string[]) {
  return execute('featured-section', () => getAdminMenuUiAdapter().reorderFeaturedSections(sectionIds));
}

export async function readAdminMedia() {
  return execute('media', () => getAdminMenuUiAdapter().listMedia());
}

export async function registerAdminMedia(input: AdminUiMediaCreateInput) {
  return execute('media', () => getAdminMenuUiAdapter().registerMedia(input));
}

export async function replaceAdminMedia(assetId: string, input: AdminUiMediaReplacementInput) {
  return execute('media', () => getAdminMenuUiAdapter().replaceMedia(assetId, input));
}

export async function deleteAdminMedia(assetId: string) {
  return execute('media', () => getAdminMenuUiAdapter().removeMedia(assetId));
}

export async function setCanonicalAdminBrandLogo(assetId: string) {
  return execute('media', () => getAdminMenuUiAdapter().setCanonicalBrandLogo(assetId));
}

export async function readAdminProfile() {
  return execute('profile', () => getAdminRestaurantProfileUiAdapter().getProfile());
}

export async function saveAdminProfile(input: Partial<Parameters<ReturnType<typeof getAdminRestaurantProfileUiAdapter>['updateProfile']>[0]>) {
  return execute('profile', async () => {
    const adapter = getAdminRestaurantProfileUiAdapter();
    return adapter.updateProfile(input);
  });
}

export async function readAdminContacts() {
  return execute('contact', () => getAdminRestaurantProfileUiAdapter().listContacts());
}

export async function createAdminContact(input: AdminUiContactCreateInput) {
  return execute('contact', () => getAdminRestaurantProfileUiAdapter().createContact(input));
}

export async function updateAdminContact(id: string, input: AdminUiContactUpdateInput) {
  return execute('contact', () => getAdminRestaurantProfileUiAdapter().updateContact(id, input));
}

export async function deleteAdminContact(id: string) {
  return execute('contact', () => getAdminRestaurantProfileUiAdapter().deleteContact(id));
}

export async function reorderAdminContacts(ids: string[]) {
  return execute('contact', () => getAdminRestaurantProfileUiAdapter().reorderContacts(ids));
}

export async function readAdminSocialLinks() {
  return execute('social', () => getAdminRestaurantProfileUiAdapter().listSocialLinks());
}

export async function createAdminSocialLink(input: AdminUiSocialCreateInput) {
  return execute('social', () => getAdminRestaurantProfileUiAdapter().createSocialLink(input));
}

export async function updateAdminSocialLink(id: string, input: AdminUiSocialUpdateInput) {
  return execute('social', () => getAdminRestaurantProfileUiAdapter().updateSocialLink(id, input));
}

export async function deleteAdminSocialLink(id: string) {
  return execute('social', () => getAdminRestaurantProfileUiAdapter().deleteSocialLink(id));
}

export async function reorderAdminSocialLinks(ids: string[]) {
  return execute('social', () => getAdminRestaurantProfileUiAdapter().reorderSocialLinks(ids));
}

export async function readAdminOrderingChannels() {
  return execute('ordering', () => getAdminRestaurantProfileUiAdapter().listOrderingChannels());
}

export async function createAdminOrderingChannel(input: AdminUiOrderingChannelCreateInput) {
  return execute('ordering', () => getAdminRestaurantProfileUiAdapter().createOrderingChannel(input));
}

export async function updateAdminOrderingChannel(id: string, input: AdminUiOrderingChannelUpdateInput) {
  return execute('ordering', () => getAdminRestaurantProfileUiAdapter().updateOrderingChannel(id, input));
}

export async function deleteAdminOrderingChannel(id: string) {
  return execute('ordering', () => getAdminRestaurantProfileUiAdapter().deleteOrderingChannel(id));
}

export async function reorderAdminOrderingChannels(ids: string[]) {
  return execute('ordering', () => getAdminRestaurantProfileUiAdapter().reorderOrderingChannels(ids));
}

export async function readAdminPromotions() { return execute('promotion', () => getAdminPromotionUiAdapter().listPromotions()); }
export async function createAdminPromotion(input: AdminUiPromotionCreateInput) { return execute('promotion', () => getAdminPromotionUiAdapter().createPromotion(input)); }
export async function updateAdminPromotion(id: string, input: AdminUiPromotionUpdateInput) { return execute('promotion', () => getAdminPromotionUiAdapter().updatePromotion(id, input)); }
export async function deleteAdminPromotion(id: string) { return execute('promotion', () => getAdminPromotionUiAdapter().deletePromotion(id)); }
export async function reorderAdminPromotions(ids: string[]) { return execute('promotion', () => getAdminPromotionUiAdapter().reorderPromotions(ids)); }