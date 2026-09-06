import type { Locale, LocalizedText, NavigationItem, RestaurantProfile } from './models';

export type PageKey = 'home' | 'menu';

export type ContentSource = 'local' | 'cms';

export interface ContentBoundary {
  source: ContentSource;
  locale: Locale;
  sections: Record<string, LocalizedText>;
}

export const contentBoundary: ContentBoundary = {
  source: 'local',
  locale: 'fr',
  sections: {
    navigation: {
      fr: 'Navigation principale',
      en: 'Main navigation',
      ar: 'التنقل الرئيسي',
    },
    homePage: {
      fr: 'Page d’accueil',
      en: 'Home page',
      ar: 'الصفحة الرئيسية',
    },
    menuPage: {
      fr: 'Page du menu',
      en: 'Menu page',
      ar: 'صفحة القائمة',
    },
    locationAnchor: {
      fr: 'Nous trouver',
      en: 'Find Us',
      ar: 'موقعنا',
    },
    contactAnchor: {
      fr: 'Contact',
      en: 'Contact',
      ar: 'اتصل بنا',
    },
  },
};

export const contentRoutes: NavigationItem[] = [
  { route: 'home', label: { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' } },
  { route: 'menu', label: { fr: 'Menu', en: 'Menu', ar: 'القائمة' } },
  { route: 'location', label: { fr: 'Nous trouver', en: 'Find Us', ar: 'موقعنا' } },
  { route: 'contact', label: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' } },
];

export function adminReadyProfile(profile: RestaurantProfile): RestaurantProfile {
  return profile;
}
