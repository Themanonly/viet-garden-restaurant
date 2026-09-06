import type { LocalizedText } from './models';

export type MenuCurrency = 'MAD';

export interface MenuPrice {
  amount: number;
  currency: MenuCurrency;
}

export interface MenuCategory {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  sortOrder: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: LocalizedText;
  description?: LocalizedText;
  price: MenuPrice;
  mediaId?: string;
  sortOrder: number;
  active: boolean;
}

export type MenuWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface MenuOpeningPeriod {
  opensAt: string;
  closesAt: string;
}

export interface MenuAvailability {
  status: 'open' | 'closed';
  schedule: Record<MenuWeekday, MenuOpeningPeriod[]>;
  temporaryClosure: { active: boolean; message: LocalizedText };
  manualOverride: 'none' | 'open' | 'closed';
  statusMessage: LocalizedText;
}

export interface FeaturedSection {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  itemIds: string[];
  sortOrder: number;
  active: boolean;
}

export interface MenuDocument {
  sourceLanguage: 'fr';
  availability: MenuAvailability;
  categories: MenuCategory[];
  items: MenuItem[];
  featuredSections: FeaturedSection[];
}

export { glovoMenuDocument as menuDocument } from './menu-glovo-data';

export const menuUiCopy: Record<'eyebrow' | 'title' | 'empty' | 'categoryNavigation', LocalizedText> = {
  eyebrow: { fr: 'Carte', en: 'Menu', ar: 'القائمة' },
  title: { fr: 'La carte', en: 'The menu', ar: 'القائمة' },
  categoryNavigation: { fr: 'Catégories du menu', en: 'Menu categories', ar: 'فئات القائمة' },
  empty: {
    fr: 'La carte sera bientôt disponible.',
    en: 'The menu will be available soon.',
    ar: 'ستتوفر القائمة قريباً.',
  },
};
