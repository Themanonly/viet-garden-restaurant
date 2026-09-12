import { getEffectiveMenuStatus } from './menu-validation';
import type { BrandSettingsRepository } from './brand-settings';
import {
  createMenuMutationService,
  MenuMutationError,
  type CategoryUpdate,
  type FeaturedSectionUpdate,
  type MenuItemUpdate,
  type MenuMutationRepository,
  type MenuMutationService,
} from './menu-mutations';
import { createMediaRepository, MediaRepositoryError, type MediaRepository } from './media-repository';
import type { UploadedMediaPayload } from './media-upload-storage';
import type { FeaturedSection, MenuAvailability, MenuCategory, MenuDocument, MenuItem, MenuPrice } from './menu';
import type { LocalizedText, MediaAsset } from './models';

export interface AdminCategoryDto {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  sortOrder: number;
  active: boolean;
}

export interface AdminMenuItemDto {
  id: string;
  categoryId: string;
  name: LocalizedText;
  description?: LocalizedText;
  price: MenuPrice;
  mediaId?: string;
  sortOrder: number;
  active: boolean;
}

export interface AdminFeaturedSectionDto {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  itemIds: string[];
  sortOrder: number;
  active: boolean;
}

export interface AdminMediaReferenceDto {
  itemId: string;
  categoryId: string;
}

export interface AdminMediaDto extends MediaAsset {
  usageCount: number;
  referencedBy: AdminMediaReferenceDto[];
  isCanonicalLogo?: boolean;
}

export interface AdminMenuStateDto {
  availability: MenuAvailability;
  effectiveStatus: 'open' | 'closed';
  categories: AdminCategoryDto[];
  items: AdminMenuItemDto[];
  featuredSections: AdminFeaturedSectionDto[];
}

export interface AdminCategoryCreateInput {
  id?: string;
  name: LocalizedText;
  description?: LocalizedText;
  sortOrder?: number;
  active?: boolean;
}

export interface AdminCategoryUpdateInput extends CategoryUpdate {}

export interface AdminMenuItemCreateInput {
  id?: string;
  categoryId: string;
  name: LocalizedText;
  description?: LocalizedText;
  price: MenuPrice;
  mediaId?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface AdminMenuItemUpdateInput extends MenuItemUpdate {}

export interface AdminFeaturedSectionCreateInput {
  id?: string;
  title: LocalizedText;
  description?: LocalizedText;
  itemIds: string[];
  sortOrder?: number;
  active?: boolean;
}

export interface AdminFeaturedSectionUpdateInput extends FeaturedSectionUpdate {}

export interface AdminAvailabilityInput extends MenuAvailability {}
export type AdminMediaCreateInput = MediaAsset;
export type AdminMediaReplacementInput = Omit<MediaAsset, 'id'>;

export type AdminResource = 'menu' | 'availability' | 'category' | 'item' | 'featured-section' | 'media' | 'contact' | 'social' | 'ordering' | 'promotion' | 'profile';

export interface AdminErrorInfo {
  code: string;
  message: string;
  resource: AdminResource;
  field?: string;
  details?: string[];
  fields?: AdminFieldError[];
}

export interface AdminFieldError {
  code: string;
  message: string;
  path: string;
}

export class AdminApplicationError extends Error {
  constructor(public readonly info: AdminErrorInfo) {
    super(info.message);
    this.name = 'AdminApplicationError';
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeOptionalLocalizedText(value: LocalizedText | undefined): LocalizedText | undefined {
  if (!value) return undefined;
  const hasValue = [value.fr, value.en, value.ar].some((entry) => typeof entry === 'string' && entry.trim().length > 0);
  return hasValue ? clone(value) : undefined;
}

function toCategoryDto(category: MenuCategory): AdminCategoryDto {
  return clone(category);
}

function toItemDto(item: MenuItem): AdminMenuItemDto {
  return clone(item);
}

function toFeaturedSectionDto(section: FeaturedSection): AdminFeaturedSectionDto {
  return clone(section);
}

function toMediaDto(asset: MediaAsset, items: MenuItem[], canonicalLogoMediaId = 'brand-logo'): AdminMediaDto {
  const referencedBy = items
    .filter((item) => item.mediaId === asset.id)
    .map((item) => ({ itemId: item.id, categoryId: item.categoryId }));
  return { ...clone(asset), usageCount: referencedBy.length, referencedBy, isCanonicalLogo: asset.id === canonicalLogoMediaId };
}

function generateRecordId(prefix: string, existingIds: string[]): string {
  const base = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const builder = `${base || 'record'}-${crypto.randomUUID()}`;
  return existingIds.includes(builder) ? generateRecordId(prefix, existingIds) : builder;
}

function resourceForMutationCode(code: string): AdminResource {
  if (code.includes('category')) return 'category';
  if (code.includes('item')) return 'item';
  if (code.includes('featured')) return 'featured-section';
  if (code.includes('media')) return 'media';
  if (code.includes('availability')) return 'availability';
  return 'menu';
}

export class AdminMenuService {
  constructor(
    private readonly mutations: MenuMutationService,
    private readonly mediaRepository: MediaRepository,
    private readonly brandSettingsRepository?: BrandSettingsRepository,
  ) {}

  async getManagementState(): Promise<AdminMenuStateDto> {
    return this.execute('menu', async () => {
      const menu = await this.mutations.getMenu();
      return this.toState(menu);
    });
  }

  async updateAvailability(input: AdminAvailabilityInput): Promise<AdminMenuStateDto> {
    return this.execute('availability', async () => this.toState(await this.mutations.updateAvailability(clone(input))));
  }

  async listCategories(): Promise<AdminCategoryDto[]> {
    const state = await this.getManagementState();
    return state.categories;
  }

  async createCategory(input: AdminCategoryCreateInput): Promise<AdminCategoryDto> {
    return this.execute('category', async () => {
      const menu = await this.mutations.getMenu();
      const categoryId = input.id?.trim() ? input.id.trim() : generateRecordId('category', menu.categories.map((candidate) => candidate.id));
      const category: MenuCategory = {
        id: categoryId,
        name: clone(input.name),
        ...(normalizeOptionalLocalizedText(input.description) ? { description: normalizeOptionalLocalizedText(input.description) } : {}),
        sortOrder: input.sortOrder ?? menu.categories.length,
        active: input.active ?? true,
      };
      const updated = await this.mutations.createCategory(category);
      return toCategoryDto(updated.categories.find((candidate) => candidate.id === categoryId) as MenuCategory);
    });
  }

  async updateCategory(categoryId: string, input: AdminCategoryUpdateInput): Promise<AdminCategoryDto> {
    return this.execute('category', async () => {
      const { description, ...rest } = clone(input);
      const normalizedInput: AdminCategoryUpdateInput = {
        ...rest,
        ...(description !== undefined ? { description: normalizeOptionalLocalizedText(description) } : {}),
      };
      const updated = await this.mutations.updateCategory(categoryId, normalizedInput);
      return toCategoryDto(updated.categories.find((candidate) => candidate.id === categoryId) as MenuCategory);
    });
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.execute('category', async () => {
      await this.mutations.deleteCategory(categoryId);
    });
  }

  async reorderCategories(orderedCategoryIds: string[]): Promise<AdminCategoryDto[]> {
    return this.execute('category', async () => {
      const updated = await this.mutations.reorderCategories([...orderedCategoryIds]);
      return updated.categories.sort((first, second) => first.sortOrder - second.sortOrder).map(toCategoryDto);
    });
  }

  async listItems(categoryId?: string): Promise<AdminMenuItemDto[]> {
    const state = await this.getManagementState();
    return state.items.filter((item) => !categoryId || item.categoryId === categoryId).sort((first, second) => first.sortOrder - second.sortOrder);
  }

  async createItem(input: AdminMenuItemCreateInput): Promise<AdminMenuItemDto> {
    return this.execute('item', async () => {
      const menu = await this.mutations.getMenu();
      const categoryItems = menu.items.filter((item) => item.categoryId === input.categoryId);
      const itemId = input.id?.trim() ? input.id.trim() : generateRecordId('item', menu.items.map((candidate) => candidate.id));
      const item: MenuItem = {
        id: itemId,
        categoryId: input.categoryId,
        name: clone(input.name),
        ...(input.description ? { description: clone(input.description) } : {}),
        price: clone(input.price),
        ...(input.mediaId ? { mediaId: input.mediaId } : {}),
        sortOrder: input.sortOrder ?? categoryItems.length,
        active: input.active ?? true,
      };
      const updated = await this.mutations.createMenuItem(item);
      return toItemDto(updated.items.find((candidate) => candidate.id === itemId) as MenuItem);
    });
  }

  async updateItem(itemId: string, input: AdminMenuItemUpdateInput): Promise<AdminMenuItemDto> {
    return this.execute('item', async () => {
      const updated = await this.mutations.updateMenuItem(itemId, clone(input));
      return toItemDto(updated.items.find((candidate) => candidate.id === itemId) as MenuItem);
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.execute('item', async () => {
      await this.mutations.deleteMenuItem(itemId);
    });
  }

  async moveItem(itemId: string, categoryId: string): Promise<AdminMenuItemDto> {
    return this.execute('item', async () => {
      const updated = await this.mutations.moveMenuItem(itemId, categoryId);
      return toItemDto(updated.items.find((candidate) => candidate.id === itemId) as MenuItem);
    });
  }

  async reorderItems(categoryId: string, orderedItemIds: string[]): Promise<AdminMenuItemDto[]> {
    return this.execute('item', async () => {
      const updated = await this.mutations.reorderItems(categoryId, [...orderedItemIds]);
      return updated.items.filter((item) => item.categoryId === categoryId).sort((first, second) => first.sortOrder - second.sortOrder).map(toItemDto);
    });
  }

  async listFeaturedSections(): Promise<AdminFeaturedSectionDto[]> {
    const state = await this.getManagementState();
    return state.featuredSections;
  }

  async createFeaturedSection(input: AdminFeaturedSectionCreateInput): Promise<AdminFeaturedSectionDto> {
    return this.execute('featured-section', async () => {
      const menu = await this.mutations.getMenu();
      const sectionId = input.id?.trim() ? input.id.trim() : generateRecordId('featured', menu.featuredSections.map((candidate) => candidate.id));
      const section: FeaturedSection = {
        id: sectionId,
        title: clone(input.title),
        ...(input.description ? { description: clone(input.description) } : {}),
        itemIds: [...input.itemIds],
        sortOrder: input.sortOrder ?? menu.featuredSections.length,
        active: input.active ?? true,
      };
      const updated = await this.mutations.createFeaturedSection(section);
      return toFeaturedSectionDto(updated.featuredSections.find((candidate) => candidate.id === sectionId) as FeaturedSection);
    });
  }

  async updateFeaturedSection(sectionId: string, input: AdminFeaturedSectionUpdateInput): Promise<AdminFeaturedSectionDto> {
    return this.execute('featured-section', async () => {
      const updated = await this.mutations.updateFeaturedSection(sectionId, clone(input));
      return toFeaturedSectionDto(updated.featuredSections.find((candidate) => candidate.id === sectionId) as FeaturedSection);
    });
  }

  async deleteFeaturedSection(sectionId: string): Promise<void> {
    await this.execute('featured-section', async () => {
      await this.mutations.deleteFeaturedSection(sectionId);
    });
  }

  async reorderFeaturedSections(orderedSectionIds: string[]): Promise<AdminFeaturedSectionDto[]> {
    return this.execute('featured-section', async () => {
      const updated = await this.mutations.reorderFeaturedSections([...orderedSectionIds]);
      return updated.featuredSections.sort((first, second) => first.sortOrder - second.sortOrder).map(toFeaturedSectionDto);
    });
  }

  async listMedia(): Promise<AdminMediaDto[]> {
    return this.execute('media', async () => {
      const [assets, menu, canonicalLogoMediaId] = await Promise.all([this.mediaRepository.listMedia(), this.mutations.getMenu(), this.brandSettingsRepository?.getBrandLogoMediaId() ?? Promise.resolve('brand-logo')]);
      return assets.map((asset) => toMediaDto(asset, menu.items, canonicalLogoMediaId));
    });
  }

  async getMedia(assetId: string): Promise<AdminMediaDto | undefined> {
    return this.execute('media', async () => {
      const [asset, menu, canonicalLogoMediaId] = await Promise.all([this.mediaRepository.getMedia(assetId), this.mutations.getMenu(), this.brandSettingsRepository?.getBrandLogoMediaId() ?? Promise.resolve('brand-logo')]);
      return asset ? toMediaDto(asset, menu.items, canonicalLogoMediaId) : undefined;
    });
  }

  async registerMedia(input: AdminMediaCreateInput): Promise<AdminMediaDto> {
    return this.execute('media', async () => {
      const asset = await this.mediaRepository.registerMedia(clone(input));
      return toMediaDto(asset, (await this.mutations.getMenu()).items, await this.brandSettingsRepository?.getBrandLogoMediaId() ?? 'brand-logo');
    });
  }

  async registerUploadedMedia(input: AdminMediaCreateInput, upload: UploadedMediaPayload): Promise<AdminMediaDto> {
    return this.execute('media', async () => {
      if (!this.mediaRepository.registerUploadedMedia) throw new AdminApplicationError({ code: 'media-upload-unsupported', message: 'Direct media uploads are not available.', resource: 'media' });
      const asset = await this.mediaRepository.registerUploadedMedia({ ...clone(input), reference: '' }, upload);
      return toMediaDto(asset, (await this.mutations.getMenu()).items, await this.brandSettingsRepository?.getBrandLogoMediaId() ?? 'brand-logo');
    });
  }

  async replaceMedia(assetId: string, input: AdminMediaReplacementInput): Promise<AdminMediaDto> {
    return this.execute('media', async () => {
      const asset = await this.mediaRepository.replaceMedia(assetId, clone(input));
      return toMediaDto(asset, (await this.mutations.getMenu()).items, await this.brandSettingsRepository?.getBrandLogoMediaId() ?? 'brand-logo');
    });
  }

  async replaceUploadedMedia(assetId: string, input: AdminMediaReplacementInput, upload: UploadedMediaPayload): Promise<AdminMediaDto> {
    return this.execute('media', async () => {
      if (!this.mediaRepository.replaceUploadedMedia) throw new AdminApplicationError({ code: 'media-upload-unsupported', message: 'Direct media uploads are not available.', resource: 'media' });
      const asset = await this.mediaRepository.replaceUploadedMedia(assetId, clone(input), upload);
      return toMediaDto(asset, (await this.mutations.getMenu()).items, await this.brandSettingsRepository?.getBrandLogoMediaId() ?? 'brand-logo');
    });
  }

  async removeMedia(assetId: string): Promise<void> {
    await this.execute('media', async () => {
      await this.mutations.removeMedia(assetId);
    });
  }

  async setCanonicalBrandLogo(assetId: string): Promise<AdminMediaDto> {
    return this.execute('media', async () => {
      const asset = await this.mediaRepository.getMedia(assetId);
      if (!asset) throw new MediaRepositoryError('media-not-found', `Media asset does not exist: ${assetId}.`);
      if (asset.type !== 'image') throw new MediaRepositoryError('invalid-brand-logo', 'The canonical brand logo must be an image.');
      if (!this.brandSettingsRepository) throw new MediaRepositoryError('settings-unavailable', 'Brand settings are not configured.');
      await this.brandSettingsRepository.setBrandLogoMediaId(assetId);
      return toMediaDto(asset, (await this.mutations.getMenu()).items, assetId);
    });
  }

  private toState(menu: MenuDocument): AdminMenuStateDto {
    return {
      availability: clone(menu.availability),
      effectiveStatus: getEffectiveMenuStatus(menu.availability),
      categories: menu.categories.sort((first, second) => first.sortOrder - second.sortOrder).map(toCategoryDto),
      items: menu.items.map(toItemDto),
      featuredSections: menu.featuredSections.sort((first, second) => first.sortOrder - second.sortOrder).map(toFeaturedSectionDto),
    };
  }

  private async execute<T>(resource: AdminResource, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof AdminApplicationError) throw error;
      if (error instanceof MenuMutationError) {
        throw new AdminApplicationError({
          code: error.code,
          message: error.message,
          resource: error.code === 'invalid-menu' ? resource : resourceForMutationCode(error.code),
          details: error.details.length > 0 ? error.details : undefined,
          field: error.issues[0]?.field,
          fields: error.issues.length > 0 ? error.issues.filter((issue): issue is typeof issue & { field: string } => Boolean(issue.field)).map((issue) => ({ code: issue.code, message: issue.message, path: issue.field })) : undefined,
        });
      }
      if (error instanceof MediaRepositoryError) {
        throw new AdminApplicationError({
          code: error.code,
          message: error.message,
          resource: 'media',
        });
      }
      throw new AdminApplicationError({
        code: `admin-${resource}-operation-failed`,
        message: `The ${resource} operation could not be completed.`,
        resource,
      });
    }
  }
}

export function createAdminMenuService(
  repository: MenuMutationRepository,
  mediaRepository: MediaRepository = createMediaRepository(),
  brandSettingsRepository?: BrandSettingsRepository,
): AdminMenuService {
  return new AdminMenuService(createMenuMutationService(repository, mediaRepository), mediaRepository, brandSettingsRepository);
}
