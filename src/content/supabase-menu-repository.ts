import type { FeaturedSection, MenuAvailability, MenuCategory, MenuDocument, MenuItem, MenuOpeningPeriod, MenuWeekday } from './menu';
import type { MenuMutationRepository } from './menu-mutations';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';

const weekdays: MenuWeekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const weekdayNumbers = new Map(weekdays.map((weekday, index) => [index, weekday]));

type CategoryRow = Omit<MenuCategory, 'sortOrder'> & { sort_order: number };
type ItemRow = Omit<MenuItem, 'categoryId' | 'price' | 'mediaId' | 'sortOrder'> & {
  category_id: string;
  price_amount: number | string;
  price_currency: 'MAD';
  media_id: string | null;
  sort_order: number;
};
type FeaturedSectionRow = Omit<FeaturedSection, 'itemIds' | 'sortOrder'> & { sort_order: number };
type FeaturedItemRow = { featured_section_id: string; menu_item_id: string; sort_order: number };
type AvailabilityRow = {
  id: string;
  status: MenuAvailability['status'];
  manual_override: MenuAvailability['manualOverride'];
  temporary_closure_active: boolean;
  temporary_closure_message: MenuAvailability['temporaryClosure']['message'];
  status_message: MenuAvailability['statusMessage'];
};
type AvailabilityPeriodRow = { weekday: number; sort_order: number; opens_at: string; closes_at: string };
type RevisionRow = { revision: number };

const queues = new Map<string, Promise<unknown>>();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function timeValue(value: string): string {
  return value.slice(0, 5);
}

function queryEquals(column: string, value: string): string {
  return `${column}=eq.${encodeURIComponent(value)}`;
}

export class SupabaseMenuRepository implements MenuMutationRepository {
  private revision: number | undefined;

  constructor(private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient()) {}

  async getMenu(): Promise<MenuDocument> {
    const [categories, items, sections, sectionItems, availability, periods, revision] = await Promise.all([
      this.database.select<CategoryRow>('menu_categories', 'select=*&order=sort_order.asc'),
      this.database.select<ItemRow>('menu_items', 'select=*&order=category_id.asc,sort_order.asc'),
      this.database.select<FeaturedSectionRow>('featured_sections', 'select=*&order=sort_order.asc'),
      this.database.select<FeaturedItemRow>('featured_section_items', 'select=*&order=featured_section_id.asc,sort_order.asc'),
      this.database.select<AvailabilityRow>('restaurant_availability', 'select=*&id=eq.default'),
      this.database.select<AvailabilityPeriodRow>('restaurant_availability_periods', 'select=weekday,sort_order,opens_at,closes_at&availability_id=eq.default&order=weekday.asc,sort_order.asc'),
      this.database.select<RevisionRow>('content_revisions', 'select=revision&id=eq.default'),
    ]);
    if (!availability[0] || !revision[0]) throw new Error('Supabase menu baseline is not initialized.');
    this.revision = Number(revision[0].revision);
    return clone({
      sourceLanguage: 'fr',
      categories: categories.map((category) => ({ id: category.id, name: clone(category.name), ...(category.description ? { description: clone(category.description) } : {}), active: category.active, sortOrder: category.sort_order })),
      items: items
        .map((item) => ({
          id: item.id,
          categoryId: item.category_id,
          name: clone(item.name),
          description: clone(item.description),
          price: { amount: Number(item.price_amount), currency: item.price_currency },
          ...(item.media_id ? { mediaId: item.media_id } : {}),
          active: item.active,
          sortOrder: item.sort_order,
        }))
        .sort((first, second) => (categories.find((category) => category.id === first.categoryId)?.sort_order ?? Number.MAX_SAFE_INTEGER) - (categories.find((category) => category.id === second.categoryId)?.sort_order ?? Number.MAX_SAFE_INTEGER) || first.sortOrder - second.sortOrder),
      featuredSections: sections.map((section) => ({
        id: section.id,
        title: clone(section.title),
        ...(section.description ? { description: clone(section.description) } : {}),
        active: section.active,
        sortOrder: section.sort_order,
        itemIds: sectionItems.filter((item) => item.featured_section_id === section.id).sort((first, second) => first.sort_order - second.sort_order).map((item) => item.menu_item_id),
      })),
      availability: this.toAvailability(availability[0], periods),
    });
  }

  async replaceMenu(menu: MenuDocument): Promise<void> {
    if (this.revision === undefined) await this.getMenu();
    const revision = await this.database.rpc<number>('replace_menu_document', { payload: clone(menu), expected_revision: this.revision });
    this.revision = Number(revision);
  }

  async runExclusive<T>(action: () => Promise<T>): Promise<T> {
    const key = 'supabase-menu-repository';
    const previous = queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(action);
    queues.set(key, current);
    try {
      return await current;
    } finally {
      if (queues.get(key) === current) queues.delete(key);
    }
  }

  private toAvailability(row: AvailabilityRow, periods: AvailabilityPeriodRow[]): MenuAvailability {
    const schedule = Object.fromEntries(weekdays.map((weekday) => [weekday, [] as MenuOpeningPeriod[]])) as MenuAvailability['schedule'];
    periods.forEach((period) => {
      const weekday = weekdayNumbers.get(period.weekday);
      if (weekday) schedule[weekday].push({ opensAt: timeValue(period.opens_at), closesAt: timeValue(period.closes_at) });
    });
    return {
      status: row.status,
      manualOverride: row.manual_override,
      schedule,
      temporaryClosure: { active: row.temporary_closure_active, message: clone(row.temporary_closure_message) },
      statusMessage: clone(row.status_message),
    };
  }
}

export function createSupabaseMenuRepository(database?: SupabaseDatabaseClient): SupabaseMenuRepository {
  return new SupabaseMenuRepository(database);
}
