import type { LocalizedText, NavigationItem, RestaurantProfile } from './models';

export const restaurantProfile: RestaurantProfile = {
  id: 'viet-garden-casablanca',
  name: {
    fr: 'Viet Garden Restaurant & Coffee',
    en: 'Viet Garden Restaurant & Coffee',
    ar: 'مطعم ومقهى فييت غاردن',
  },
  description: {
    fr: 'Restaurant vietnamien et asiatique à Casablanca, pensé pour les repas en famille, les déjeuners et les soirées conviviales.',
    en: 'Vietnamese and Asian restaurant in Casablanca, designed for family meals, relaxed lunches, and convivial evenings.',
    ar: 'مطعم فيتنامي وآسيوي في الدار البيضاء، مصمم لوجبات العائلة والغداء الهادئ والأمسيات الودية.',
  },
  sourceLanguage: 'fr',
  address: {
    fr: '80 Bd Moulay Slimane, Casablanca 20250',
    en: '80 Bd Moulay Slimane, Casablanca 20250',
    ar: '80 شارع مولاي سليمان، الدار البيضاء 20250',
  },
  city: 'Casablanca',
  postalCode: '20250',
  googleMapsUrl: 'https://www.google.com/maps/place/VIET+GARDEN+RESTAURANT+%26+COFEE/@33.6098413,-7.5647156,17z',
  contacts: [
    {
      id: 'main',
      type: 'phone',
      value: '+212522666773',
      displayValue: '05 22 66 67 73',
      enabled: true,
      sortOrder: 0,
      primary: true,
      label: { fr: 'Réservations', en: 'Reservations', ar: 'الحجوزات' },
    },
  ],
  socialLinks: [
    {
      id: 'instagram',
      platform: 'instagram',
      label: { fr: 'Instagram', en: 'Instagram', ar: 'Instagram' },
      url: 'https://www.instagram.com/viet_garden_restaurant/',
      enabled: true,
      sortOrder: 0,
    },
    {
      id: 'facebook',
      platform: 'facebook',
      label: { fr: 'Facebook', en: 'Facebook', ar: 'Facebook' },
      url: 'https://www.facebook.com/vietgardenofficiel/',
      enabled: true,
      sortOrder: 1,
    },
  ],
  orderingChannels: [
    {
      id: 'glovo',
      name: { fr: 'Glovo', en: 'Glovo', ar: 'Glovo' },
      type: 'glovo',
      url: 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas',
      ctaText: { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' },
      enabled: true,
      sortOrder: 0,
    },
  ],
};

export const homepageHero = {
  brandName: { fr: 'Viet Garden Restaurant & Coffee', en: 'Viet Garden Restaurant & Coffee', ar: 'Viet Garden Restaurant & Coffee' },
  eyebrow: { fr: 'Cuisine vietnamienne · Casablanca', en: 'Vietnamese cuisine · Casablanca', ar: 'مطبخ فيتنامي · الدار البيضاء' },
  statement: restaurantProfile.description,
  primaryAction: { fr: 'Réserver une table', en: 'Reserve a table', ar: 'احجز طاولة' },
  secondaryAction: { fr: 'Découvrir le menu', en: 'Explore the menu', ar: 'اكتشف القائمة' },
};

export const homepageIdentity = {
  eyebrow: { fr: 'L’expérience Viet Garden', en: 'The Viet Garden experience', ar: 'تجربة فييت غاردن' },
  title: { fr: 'Une table vietnamienne à Casablanca', en: 'A Vietnamese table in Casablanca', ar: 'مائدة فيتنامية في الدار البيضاء' },
  paragraphs: {
    fr: 'Viet Garden Restaurant & Coffee vous accueille autour d’une cuisine vietnamienne et asiatique, dans un cadre pensé pour les repas en famille, les déjeuners et les soirées conviviales.',
    en: 'Viet Garden Restaurant & Coffee welcomes you to Vietnamese and Asian cuisine in a setting shaped for family meals, relaxed lunches, and convivial evenings.',
    ar: 'يستقبلكم Viet Garden Restaurant & Coffee مع المطبخ الفيتنامي والآسيوي، في أجواء مناسبة لوجبات العائلة والغداء الهادئ والأمسيات الودية.',
  },
  location: { fr: '80 Bd Moulay Slimane · Casablanca', en: '80 Bd Moulay Slimane · Casablanca', ar: '80 شارع مولاي سليمان · الدار البيضاء' },
};

export const siteNavigation: NavigationItem[] = [
  { route: 'home', label: { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' } },
  { route: 'menu', label: { fr: 'Menu', en: 'Menu', ar: 'القائمة' } },
  { route: 'location', label: { fr: 'Nous trouver', en: 'Find Us', ar: 'موقعنا' } },
  { route: 'contact', label: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' } },
];

export const routePaths: Record<Exclude<NavigationItem['route'], 'home'>, string> = {
  menu: 'menu',
  location: '#contact-information',
  contact: '#contact-information',
};

export function routeHref(locale: string, route: NavigationItem['route']): string {
  if (route === 'home') return `/${locale}`;
  if (route === 'menu') return `/${locale}/menu`;
  return `/${locale}${routePaths[route]}`;
}

export function localizedPathname(locale: string, pathname: string | null, hash = ''): string {
  const currentPath = pathname?.startsWith('/') ? pathname : '/';
  const pathWithoutLocale = currentPath.replace(/^\/(?:fr|en|ar)(?=\/|$)/, '') || '/';
  const localizedPath = pathWithoutLocale === '/' ? `/${locale}` : `/${locale}${pathWithoutLocale}`;
  return `${localizedPath}${hash.startsWith('#') ? hash : ''}`;
}

export const languageLabels: Record<'fr' | 'en' | 'ar', LocalizedText> = {
  fr: { fr: 'Français', en: 'French', ar: 'الفرنسية' },
  en: { fr: 'Anglais', en: 'English', ar: 'الإنجليزية' },
  ar: { fr: 'Arabe', en: 'Arabic', ar: 'العربية' },
};
