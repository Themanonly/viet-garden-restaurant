import { getMediaAsset } from './media';
import type { MenuAvailability, MenuDocument, MenuWeekday } from './menu';

const weekdays: MenuWeekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function hasFrenchSource(value: { fr?: unknown }): boolean {
  return typeof value.fr === 'string' && value.fr.trim().length > 0;
}

function hasLocaleSource(value: { en?: unknown; ar?: unknown }): boolean {
  return typeof value.en === 'string' && value.en.trim().length > 0 && typeof value.ar === 'string' && value.ar.trim().length > 0;
}

function hasAnyLocalizedValue(value: { fr?: unknown; en?: unknown; ar?: unknown } | undefined): boolean {
  return Boolean(value && [value.fr, value.en, value.ar].some((entry) => typeof entry === 'string' && entry.trim().length > 0));
}

function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export interface MenuValidationOptions {
  mediaAssetIds?: ReadonlySet<string>;
}

export interface MenuValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export interface MenuValidationResult {
  valid: boolean;
  errors: string[];
  issues: MenuValidationIssue[];
}

function issue(errors: string[], issues: MenuValidationIssue[], message: string, field?: string, code = 'invalid-menu'): void {
  errors.push(message);
  issues.push({ code, message, ...(field ? { field } : {}) });
}

export function validateMenuAvailability(availability: MenuAvailability | undefined): MenuValidationIssue[] {
  const errors: string[] = [];
  const issues: MenuValidationIssue[] = [];
  if (!availability || !['open', 'closed'].includes(availability.status)) {
    issue(errors, issues, 'Unsupported menu availability status.', 'status', 'invalid-availability');
    return issues;
  }
  if (!['none', 'open', 'closed'].includes(availability.manualOverride)) {
    issue(errors, issues, 'Unsupported menu manual availability override.', 'manualOverride', 'invalid-availability');
  }
  if (!availability.schedule) {
    issue(errors, issues, 'Menu availability requires a weekly schedule.', 'schedule', 'invalid-availability');
  } else {
    for (const weekday of weekdays) {
      const periods = availability.schedule[weekday];
      if (!Array.isArray(periods)) {
        issue(errors, issues, `Menu availability requires a schedule for ${weekday}.`, `schedule.${weekday}`, 'invalid-availability');
        continue;
      }
      let previousClose = -1;
      for (const [index, period] of periods.entries()) {
        if (!period || !isTime(period.opensAt) || !isTime(period.closesAt)) {
          issue(errors, issues, `Invalid availability time range for ${weekday}.`, `schedule.${weekday}[${index}]`, 'invalid-availability');
          continue;
        }
        const opensAt = timeToMinutes(period.opensAt);
        const closesAt = timeToMinutes(period.closesAt);
        if (opensAt >= closesAt) issue(errors, issues, `Availability must open before closing on ${weekday}.`, `schedule.${weekday}[${index}].opens`, 'invalid-availability');
        if (opensAt < previousClose) issue(errors, issues, `Overlapping availability periods on ${weekday}.`, `schedule.${weekday}[${index}]`, 'invalid-availability');
        previousClose = Math.max(previousClose, closesAt);
      }
    }
  }
  if (!availability.temporaryClosure || typeof availability.temporaryClosure.active !== 'boolean') {
    issue(errors, issues, 'Menu availability requires temporary closure settings.', 'temporaryClosure', 'invalid-availability');
  } else if (availability.temporaryClosure.active) {
    if (!availability.temporaryClosure.message?.fr) issue(errors, issues, 'Temporary closure requires a French message.', 'temporaryClosure.message.fr', 'missing-translation');
    if (!availability.temporaryClosure.message?.en) issue(errors, issues, 'Temporary closure requires an English message.', 'temporaryClosure.message.en', 'missing-translation');
    if (!availability.temporaryClosure.message?.ar) issue(errors, issues, 'Temporary closure requires an Arabic message.', 'temporaryClosure.message.ar', 'missing-translation');
  }
  if (!availability.statusMessage || (hasAnyLocalizedValue(availability.statusMessage) && (!hasFrenchSource(availability.statusMessage) || !hasLocaleSource(availability.statusMessage)))) {
    if (!availability.statusMessage?.fr) issue(errors, issues, 'Availability status messages require a French value.', 'statusMessage.fr', 'missing-translation');
    if (!availability.statusMessage?.en) issue(errors, issues, 'Availability status messages require an English value.', 'statusMessage.en', 'missing-translation');
    if (!availability.statusMessage?.ar) issue(errors, issues, 'Availability status messages require an Arabic value.', 'statusMessage.ar', 'missing-translation');
  }
  return issues;
}

export function getEffectiveMenuStatus(availability: MenuAvailability, now = new Date()): 'open' | 'closed' {
  if (availability.temporaryClosure.active) return 'closed';
  if (availability.manualOverride !== 'none') return availability.manualOverride;
  const hasSchedule = weekdays.some((weekday) => availability.schedule[weekday].length > 0);
  if (!hasSchedule) return availability.status;
  const weekday = weekdays[(now.getDay() + 6) % 7];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return availability.schedule[weekday].some((period) => timeToMinutes(period.opensAt) <= currentMinutes && currentMinutes < timeToMinutes(period.closesAt)) ? 'open' : 'closed';
}

export function validateMenuDocument(menu: MenuDocument, options: MenuValidationOptions = {}): MenuValidationResult {
  const errors: string[] = [];
  const issues: MenuValidationIssue[] = [];
  validateMenuAvailability(menu?.availability).forEach((validationIssue) => {
    errors.push(validationIssue.message);
    issues.push(validationIssue);
  });
  const categoryIds = new Set<string>();
  const categorySortOrders = new Set<number>();

  for (const category of menu.categories) {
    if (!category.id.trim()) issue(errors, issues, 'Menu categories require a stable id.', 'id');
    if (!hasFrenchSource(category.name)) issue(errors, issues, `Menu category requires a French name: ${category.id}.`, 'name.fr');
    if (!hasLocaleSource(category.name)) {
      if (!category.name.en) issue(errors, issues, `Menu category requires an English name: ${category.id}.`, 'name.en');
      if (!category.name.ar) issue(errors, issues, `Menu category requires an Arabic name: ${category.id}.`, 'name.ar');
    }
    if (categoryIds.has(category.id)) issue(errors, issues, `Duplicate menu category id: ${category.id}.`, 'id', 'duplicate-category-id');
    if (!Number.isFinite(category.sortOrder) || category.sortOrder < 0) {
      issue(errors, issues, `Invalid menu category ordering: ${category.id}.`, 'sortOrder');
    }
    if (categorySortOrders.has(category.sortOrder)) issue(errors, issues, `Duplicate menu category ordering: ${category.sortOrder}.`, 'sortOrder', 'duplicate-sort-order');
    categorySortOrders.add(category.sortOrder);
    if (category.description) {
      if (!hasFrenchSource(category.description)) issue(errors, issues, `Menu category description requires a French value: ${category.id}.`, 'description.fr');
      if (!hasLocaleSource(category.description)) {
        if (!category.description.en) issue(errors, issues, `Menu category description requires an English value: ${category.id}.`, 'description.en');
        if (!category.description.ar) issue(errors, issues, `Menu category description requires an Arabic value: ${category.id}.`, 'description.ar');
      }
    }
    categoryIds.add(category.id);
  }

  const itemIds = new Set<string>();
  const itemSortOrders = new Map<string, Set<number>>();
  for (const item of menu.items) {
    if (!item.id.trim()) issue(errors, issues, 'Menu items require a stable id.', 'id');
    if (!hasFrenchSource(item.name)) issue(errors, issues, `Menu item requires a French name: ${item.id}.`, 'name.fr');
    if (!hasLocaleSource(item.name)) {
      if (!item.name.en) issue(errors, issues, `Menu item requires an English name: ${item.id}.`, 'name.en');
      if (!item.name.ar) issue(errors, issues, `Menu item requires an Arabic name: ${item.id}.`, 'name.ar');
    }
    if (!item.description) {
      issue(errors, issues, `Menu item requires a description: ${item.id}.`, 'description');
    } else {
      if (!hasFrenchSource(item.description)) issue(errors, issues, `Menu item requires a French description: ${item.id}.`, 'description.fr');
      if (!hasLocaleSource(item.description)) {
        if (!item.description.en) issue(errors, issues, `Menu item requires an English description: ${item.id}.`, 'description.en');
        if (!item.description.ar) issue(errors, issues, `Menu item requires an Arabic description: ${item.id}.`, 'description.ar');
      }
    }
    if (itemIds.has(item.id)) issue(errors, issues, `Duplicate menu item id: ${item.id}.`, 'id', 'duplicate-item-id');
    if (!categoryIds.has(item.categoryId)) {
      issue(errors, issues, `Menu item references an unknown category: ${item.id}.`, 'categoryId', 'category-not-found');
    }
    if (!Number.isFinite(item.sortOrder) || item.sortOrder < 0) {
      issue(errors, issues, `Invalid menu item ordering: ${item.id}.`, 'sortOrder');
    }
    const categoryOrders = itemSortOrders.get(item.categoryId) ?? new Set<number>();
    if (categoryOrders.has(item.sortOrder)) issue(errors, issues, `Duplicate menu item ordering: ${item.categoryId}/${item.sortOrder}.`, 'sortOrder', 'duplicate-sort-order');
    categoryOrders.add(item.sortOrder);
    itemSortOrders.set(item.categoryId, categoryOrders);
    if (!Number.isFinite(item.price.amount) || item.price.amount < 0) {
      issue(errors, issues, `Invalid menu item price: ${item.id}.`, 'price.amount');
    }
    if (item.price.currency !== 'MAD') issue(errors, issues, `Unsupported menu item currency: ${item.id}.`, 'price.currency');
    const hasMedia = options.mediaAssetIds ? options.mediaAssetIds.has(item.mediaId ?? '') : Boolean(item.mediaId && getMediaAsset(item.mediaId));
    if (item.mediaId && !hasMedia) {
      issue(errors, issues, `Menu item references unknown media: ${item.id}.`, 'mediaId', 'media-not-found');
    }
    itemIds.add(item.id);
  }

  const featuredSectionIds = new Set<string>();
  const featuredSortOrders = new Set<number>();
  for (const section of menu.featuredSections) {
    if (!section.id.trim()) issue(errors, issues, 'Featured sections require a stable id.', 'id');
    if (featuredSectionIds.has(section.id)) issue(errors, issues, `Duplicate featured section id: ${section.id}.`, 'id', 'duplicate-featured-section-id');
    if (!hasFrenchSource(section.title)) issue(errors, issues, `Featured section requires a French title: ${section.id}.`, 'title.fr');
    if (!hasLocaleSource(section.title)) {
      if (!section.title.en) issue(errors, issues, `Featured section requires an English title: ${section.id}.`, 'title.en');
      if (!section.title.ar) issue(errors, issues, `Featured section requires an Arabic title: ${section.id}.`, 'title.ar');
    }
    if (section.description) {
      if (!hasFrenchSource(section.description)) issue(errors, issues, `Featured section description requires a French value: ${section.id}.`, 'description.fr');
      if (!hasLocaleSource(section.description)) {
        if (!section.description.en) issue(errors, issues, `Featured section description requires an English value: ${section.id}.`, 'description.en');
        if (!section.description.ar) issue(errors, issues, `Featured section description requires an Arabic value: ${section.id}.`, 'description.ar');
      }
    }
    if (!Number.isFinite(section.sortOrder) || section.sortOrder < 0) {
      issue(errors, issues, `Invalid featured section ordering: ${section.id}.`, 'sortOrder');
    }
    if (featuredSortOrders.has(section.sortOrder)) issue(errors, issues, `Duplicate featured section ordering: ${section.sortOrder}.`, 'sortOrder', 'duplicate-sort-order');
    featuredSortOrders.add(section.sortOrder);
    const sectionItemIds = new Set<string>();
    for (const itemId of section.itemIds) {
      if (sectionItemIds.has(itemId)) issue(errors, issues, `Duplicate item in featured section ${section.id}: ${itemId}.`, 'itemIds', 'duplicate-featured-item');
      if (!itemIds.has(itemId)) issue(errors, issues, `Featured section item does not exist: ${section.id}/${itemId}.`, 'itemIds', 'item-not-found');
      sectionItemIds.add(itemId);
    }
    featuredSectionIds.add(section.id);
  }

  return { valid: errors.length === 0, errors, issues };
}
