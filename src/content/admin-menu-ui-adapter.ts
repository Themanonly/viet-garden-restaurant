import type {
  AdminApplicationError,
  AdminAvailabilityInput,
  AdminCategoryCreateInput,
  AdminCategoryDto,
  AdminCategoryUpdateInput,
  AdminFeaturedSectionCreateInput,
  AdminFeaturedSectionDto,
  AdminFeaturedSectionUpdateInput,
  AdminMediaCreateInput,
  AdminMediaDto,
  AdminMediaReplacementInput,
  AdminMenuItemCreateInput,
  AdminMenuItemDto,
  AdminMenuItemUpdateInput,
  AdminMenuService,
  AdminMenuStateDto,
} from './admin-menu-service';
import type { UploadedMediaPayload } from './media-upload-storage';

export type AdminUiError = AdminApplicationError;
export type AdminUiAvailabilityInput = AdminAvailabilityInput;
export type AdminUiCategoryCreateInput = AdminCategoryCreateInput;
export type AdminUiCategoryUpdateInput = AdminCategoryUpdateInput;
export type AdminUiMenuItemCreateInput = AdminMenuItemCreateInput;
export type AdminUiMenuItemUpdateInput = AdminMenuItemUpdateInput;
export type AdminUiFeaturedSectionCreateInput = AdminFeaturedSectionCreateInput;
export type AdminUiFeaturedSectionUpdateInput = AdminFeaturedSectionUpdateInput;
export type AdminUiMediaCreateInput = AdminMediaCreateInput;
export type AdminUiMediaReplacementInput = AdminMediaReplacementInput;

export interface AdminUiManagementStateDto extends AdminMenuStateDto {}
export interface AdminUiCategoryDto extends AdminCategoryDto {}
export interface AdminUiMenuItemDto extends AdminMenuItemDto {}
export interface AdminUiFeaturedSectionDto extends AdminFeaturedSectionDto {}
export interface AdminUiMediaDto extends AdminMediaDto {}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return structuredClone(value);
}

export class AdminMenuUiAdapter {
  constructor(private readonly service: AdminMenuService) {}

  async getManagementState(): Promise<AdminUiManagementStateDto> {
    return clone(await this.service.getManagementState());
  }

  async updateAvailability(input: AdminUiAvailabilityInput): Promise<AdminUiManagementStateDto> {
    return clone(await this.service.updateAvailability(clone(input)));
  }

  async listCategories(): Promise<AdminUiCategoryDto[]> {
    return clone(await this.service.listCategories());
  }

  async createCategory(input: AdminUiCategoryCreateInput): Promise<AdminUiCategoryDto> {
    return clone(await this.service.createCategory(clone(input)));
  }

  async updateCategory(categoryId: string, input: AdminUiCategoryUpdateInput): Promise<AdminUiCategoryDto> {
    return clone(await this.service.updateCategory(categoryId, clone(input)));
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.service.deleteCategory(categoryId);
  }

  async reorderCategories(orderedCategoryIds: string[]): Promise<AdminUiCategoryDto[]> {
    return clone(await this.service.reorderCategories([...orderedCategoryIds]));
  }

  async listItems(categoryId?: string): Promise<AdminUiMenuItemDto[]> {
    return clone(await this.service.listItems(categoryId));
  }

  async createItem(input: AdminUiMenuItemCreateInput): Promise<AdminUiMenuItemDto> {
    return clone(await this.service.createItem(clone(input)));
  }

  async updateItem(itemId: string, input: AdminUiMenuItemUpdateInput): Promise<AdminUiMenuItemDto> {
    return clone(await this.service.updateItem(itemId, clone(input)));
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.service.deleteItem(itemId);
  }

  async moveItem(itemId: string, categoryId: string): Promise<AdminUiMenuItemDto> {
    return clone(await this.service.moveItem(itemId, categoryId));
  }

  async reorderItems(categoryId: string, orderedItemIds: string[]): Promise<AdminUiMenuItemDto[]> {
    return clone(await this.service.reorderItems(categoryId, [...orderedItemIds]));
  }

  async listFeaturedSections(): Promise<AdminUiFeaturedSectionDto[]> {
    return clone(await this.service.listFeaturedSections());
  }

  async createFeaturedSection(input: AdminUiFeaturedSectionCreateInput): Promise<AdminUiFeaturedSectionDto> {
    return clone(await this.service.createFeaturedSection(clone(input)));
  }

  async updateFeaturedSection(sectionId: string, input: AdminUiFeaturedSectionUpdateInput): Promise<AdminUiFeaturedSectionDto> {
    return clone(await this.service.updateFeaturedSection(sectionId, clone(input)));
  }

  async deleteFeaturedSection(sectionId: string): Promise<void> {
    await this.service.deleteFeaturedSection(sectionId);
  }

  async reorderFeaturedSections(orderedSectionIds: string[]): Promise<AdminUiFeaturedSectionDto[]> {
    return clone(await this.service.reorderFeaturedSections([...orderedSectionIds]));
  }

  async listMedia(): Promise<AdminUiMediaDto[]> {
    return clone(await this.service.listMedia());
  }

  async getMedia(assetId: string): Promise<AdminUiMediaDto | undefined> {
    return clone(await this.service.getMedia(assetId));
  }

  async registerMedia(input: AdminUiMediaCreateInput): Promise<AdminUiMediaDto> {
    return clone(await this.service.registerMedia(clone(input)));
  }

  async registerUploadedMedia(input: AdminUiMediaCreateInput, upload: UploadedMediaPayload): Promise<AdminUiMediaDto> {
    return clone(await this.service.registerUploadedMedia(clone(input), upload));
  }

  async replaceMedia(assetId: string, input: AdminUiMediaReplacementInput): Promise<AdminUiMediaDto> {
    return clone(await this.service.replaceMedia(assetId, clone(input)));
  }

  async replaceUploadedMedia(assetId: string, input: AdminUiMediaReplacementInput, upload: UploadedMediaPayload): Promise<AdminUiMediaDto> {
    return clone(await this.service.replaceUploadedMedia(assetId, clone(input), upload));
  }

  async removeMedia(assetId: string): Promise<void> {
    await this.service.removeMedia(assetId);
  }

  async setCanonicalBrandLogo(assetId: string): Promise<AdminUiMediaDto> {
    return clone(await this.service.setCanonicalBrandLogo(assetId));
  }
}

export function createAdminMenuUiAdapter(service: AdminMenuService): AdminMenuUiAdapter {
  return new AdminMenuUiAdapter(service);
}
