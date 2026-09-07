import { menuDocument, type FeaturedSection, type MenuAvailability, type MenuCategory, type MenuDocument, type MenuItem } from './menu';
import { createMediaRepository, type MediaRepository } from './media-repository';
import { validateMenuDocument, type MenuValidationIssue } from './menu-validation';

export interface MenuMutationRepository {
  getMenu(): Promise<MenuDocument>;
  replaceMenu(menu: MenuDocument): Promise<void>;
  runExclusive?<T>(action: () => Promise<T>): Promise<T>;
}

export class InMemoryMenuMutationRepository implements MenuMutationRepository {
  private document: MenuDocument;

  constructor(initialDocument: MenuDocument) {
    this.document = clone(initialDocument);
  }

  async getMenu(): Promise<MenuDocument> {
    return clone(this.document);
  }

  async replaceMenu(menu: MenuDocument): Promise<void> {
    this.document = clone(menu);
  }
}

export type CategoryUpdate = Partial<Omit<MenuCategory, 'id'>>;
export type MenuItemUpdate = Partial<Omit<MenuItem, 'id'>>;
export type FeaturedSectionUpdate = Partial<Omit<FeaturedSection, 'id'>>;

export class MenuMutationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: string[] = [],
    public readonly issues: MenuValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'MenuMutationError';
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSortOrder<T extends { sortOrder: number }>(records: T[]): void {
  records
    .map((record, index) => ({ record, index }))
    .sort((first, second) => first.record.sortOrder - second.record.sortOrder || first.index - second.index)
    .forEach(({ record }, index) => {
      record.sortOrder = index;
    });
}

function assertCompleteOrder(orderedIds: string[], existingIds: string[], label: string): void {
  if (orderedIds.length !== existingIds.length || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !existingIds.includes(id))) {
    throw new MenuMutationError('invalid-order', `${label} reordering must include each existing ID exactly once.`);
  }
}

export class MenuMutationService {
  constructor(
    private readonly repository: MenuMutationRepository,
    private readonly mediaRepository: MediaRepository = createMediaRepository(),
  ) {}

  async getMenu(): Promise<MenuDocument> {
    return this.repository.getMenu();
  }

  async createCategory(category: MenuCategory): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (draft.categories.some((candidate) => candidate.id === category.id)) {
        throw new MenuMutationError('duplicate-category-id', `Category ID already exists: ${category.id}.`);
      }
      draft.categories.push(clone(category));
      normalizeSortOrder(draft.categories);
    });
  }

  async updateCategory(categoryId: string, update: CategoryUpdate): Promise<MenuDocument> {
    return this.mutate((draft) => {
      const category = draft.categories.find((candidate) => candidate.id === categoryId);
      if (!category) throw new MenuMutationError('category-not-found', `Category does not exist: ${categoryId}.`);
      const clearsDescription = Object.prototype.hasOwnProperty.call(update, 'description') && update.description === undefined;
      const nextUpdate = clone(update);
      if (clearsDescription) delete category.description;
      Object.assign(category, nextUpdate);
      normalizeSortOrder(draft.categories);
    });
  }

  async deleteCategory(categoryId: string): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (!draft.categories.some((category) => category.id === categoryId)) {
        throw new MenuMutationError('category-not-found', `Category does not exist: ${categoryId}.`, [], [{ code: 'category-not-found', message: `Category does not exist: ${categoryId}.`, field: 'categoryId' }]);
      }
      if (draft.items.some((item) => item.categoryId === categoryId)) {
        throw new MenuMutationError('category-in-use', `Category cannot be deleted while menu items reference it: ${categoryId}.`);
      }
      draft.categories = draft.categories.filter((category) => category.id !== categoryId);
      normalizeSortOrder(draft.categories);
    });
  }

  async reorderCategories(orderedCategoryIds: string[]): Promise<MenuDocument> {
    return this.mutate((draft) => {
      const existingIds = draft.categories.map((category) => category.id);
      assertCompleteOrder(orderedCategoryIds, existingIds, 'Category');
      orderedCategoryIds.forEach((categoryId, index) => {
        const category = draft.categories.find((candidate) => candidate.id === categoryId);
        if (category) category.sortOrder = index;
      });
    });
  }

  async createMenuItem(item: MenuItem): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (draft.items.some((candidate) => candidate.id === item.id)) {
        throw new MenuMutationError('duplicate-item-id', `Menu item ID already exists: ${item.id}.`);
      }
      if (!draft.categories.some((category) => category.id === item.categoryId)) {
        throw new MenuMutationError('category-not-found', `Category does not exist: ${item.categoryId}.`, [], [{ code: 'category-not-found', message: `Category does not exist: ${item.categoryId}.`, field: 'categoryId' }]);
      }
      draft.items.push(clone(item));
      normalizeItemsForCategories(draft, [item.categoryId]);
    });
  }

  async updateMenuItem(itemId: string, update: MenuItemUpdate): Promise<MenuDocument> {
    return this.mutate((draft) => {
      const item = draft.items.find((candidate) => candidate.id === itemId);
      if (!item) throw new MenuMutationError('item-not-found', `Menu item does not exist: ${itemId}.`);
      const previousCategoryId = item.categoryId;
      Object.assign(item, clone(update));
      normalizeItemsForCategories(draft, [previousCategoryId, item.categoryId]);
    });
  }

  async deleteMenuItem(itemId: string): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (!draft.items.some((item) => item.id === itemId)) {
        throw new MenuMutationError('item-not-found', `Menu item does not exist: ${itemId}.`);
      }
      const affectedCategories = draft.items.filter((item) => item.id === itemId).map((item) => item.categoryId);
      draft.items = draft.items.filter((item) => item.id !== itemId);
      draft.featuredSections.forEach((section) => {
        section.itemIds = section.itemIds.filter((featuredItemId) => featuredItemId !== itemId);
      });
      normalizeItemsForCategories(draft, affectedCategories);
    });
  }

  async moveMenuItem(itemId: string, categoryId: string): Promise<MenuDocument> {
    return this.mutate((draft) => {
      const item = draft.items.find((candidate) => candidate.id === itemId);
      if (!item) throw new MenuMutationError('item-not-found', `Menu item does not exist: ${itemId}.`);
      if (!draft.categories.some((category) => category.id === categoryId)) {
        throw new MenuMutationError('category-not-found', `Category does not exist: ${categoryId}.`, [], [{ code: 'category-not-found', message: `Category does not exist: ${categoryId}.`, field: 'categoryId' }]);
      }
      const previousCategoryId = item.categoryId;
      item.categoryId = categoryId;
      item.sortOrder = draft.items.filter((candidate) => candidate.categoryId === categoryId && candidate.id !== itemId).length;
      normalizeItemsForCategories(draft, [previousCategoryId, categoryId]);
    });
  }

  async reorderItems(categoryId: string, orderedItemIds: string[]): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (!draft.categories.some((category) => category.id === categoryId)) {
        throw new MenuMutationError('category-not-found', `Category does not exist: ${categoryId}.`);
      }
      const categoryItems = draft.items.filter((item) => item.categoryId === categoryId);
      assertCompleteOrder(orderedItemIds, categoryItems.map((item) => item.id), `Items in category ${categoryId}`);
      orderedItemIds.forEach((itemId, index) => {
        const item = draft.items.find((candidate) => candidate.id === itemId);
        if (item) item.sortOrder = index;
      });
    });
  }

  async createFeaturedSection(section: FeaturedSection): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (draft.featuredSections.some((candidate) => candidate.id === section.id)) {
        throw new MenuMutationError('duplicate-featured-section-id', `Featured section ID already exists: ${section.id}.`);
      }
      draft.featuredSections.push(clone(section));
      normalizeSortOrder(draft.featuredSections);
    });
  }

  async updateFeaturedSection(sectionId: string, update: FeaturedSectionUpdate): Promise<MenuDocument> {
    return this.mutate((draft) => {
      const section = draft.featuredSections.find((candidate) => candidate.id === sectionId);
      if (!section) throw new MenuMutationError('featured-section-not-found', `Featured section does not exist: ${sectionId}.`);
      Object.assign(section, clone(update));
      normalizeSortOrder(draft.featuredSections);
    });
  }

  async deleteFeaturedSection(sectionId: string): Promise<MenuDocument> {
    return this.mutate((draft) => {
      if (!draft.featuredSections.some((section) => section.id === sectionId)) {
        throw new MenuMutationError('featured-section-not-found', `Featured section does not exist: ${sectionId}.`);
      }
      draft.featuredSections = draft.featuredSections.filter((section) => section.id !== sectionId);
      normalizeSortOrder(draft.featuredSections);
    });
  }

  async reorderFeaturedSections(orderedSectionIds: string[]): Promise<MenuDocument> {
    return this.mutate((draft) => {
      const existingIds = draft.featuredSections.map((section) => section.id);
      assertCompleteOrder(orderedSectionIds, existingIds, 'Featured section');
      orderedSectionIds.forEach((sectionId, index) => {
        const section = draft.featuredSections.find((candidate) => candidate.id === sectionId);
        if (section) section.sortOrder = index;
      });
    });
  }

  async updateAvailability(availability: MenuAvailability): Promise<MenuDocument> {
    return this.mutate((draft) => {
      draft.availability = clone(availability);
    });
  }

  async removeMedia(assetId: string): Promise<void> {
    const menu = await this.repository.getMenu();
    if (menu.items.some((item) => item.mediaId === assetId)) {
      throw new MenuMutationError('media-in-use', `Media asset cannot be removed while a menu item references it: ${assetId}.`);
    }
    await this.mediaRepository.removeMedia(assetId);
  }

  private async mutate(change: (draft: MenuDocument) => void): Promise<MenuDocument> {
    if (this.repository.runExclusive) return this.repository.runExclusive(() => this.mutateUnlocked(change));
    return this.mutateUnlocked(change);
  }

  private async mutateUnlocked(change: (draft: MenuDocument) => void): Promise<MenuDocument> {
    const current = await this.repository.getMenu();
    const draft = clone(current);
    change(draft);
    const mediaAssetIds = new Set((await this.mediaRepository.listMedia()).map((asset) => asset.id));
    const validation = validateMenuDocument(draft, { mediaAssetIds });
    if (!validation.valid) {
      throw new MenuMutationError('invalid-menu', validation.errors.join(' '), validation.errors, validation.issues);
    }
    await this.repository.replaceMenu(draft);
    return clone(draft);
  }
}

function normalizeItemsForCategories(menu: MenuDocument, categoryIds: string[]): void {
  [...new Set(categoryIds)].forEach((categoryId) => {
    normalizeSortOrder(menu.items.filter((item) => item.categoryId === categoryId));
  });
}

export function createMenuMutationService(
  repository: MenuMutationRepository,
  mediaRepository: MediaRepository = createMediaRepository(),
): MenuMutationService {
  return new MenuMutationService(repository, mediaRepository);
}

export function createInMemoryMenuMutationService(initialDocument: MenuDocument = menuDocument): MenuMutationService {
  return createMenuMutationService(new InMemoryMenuMutationRepository(initialDocument));
}
