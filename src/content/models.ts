export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export type LocalizedText = Partial<Record<Locale, string>>;

export type ContentRoute = 'home' | 'menu';
export type NavigationRoute = ContentRoute | 'contact' | 'location';

export interface NavigationItem {
  route: NavigationRoute;
  label: LocalizedText;
}

export interface RestaurantProfile {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  sourceLanguage: 'fr';
  address: LocalizedText;
  city: string;
  postalCode: string;
  googleMapsUrl: string;
  phoneNumbers: Array<{
    id: string;
    display: string;
    dialable: string;
    enabled: boolean;
    label: LocalizedText;
  }>;
  socialLinks: Array<{
    id: string;
    platform: 'instagram' | 'facebook';
    label: LocalizedText;
    url: string;
    enabled: boolean;
  }>;
  ordering: Array<{
    label: LocalizedText;
    url: string;
    source: 'glovo';
  }>;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  source: 'local' | 'remote' | 'brand';
  reference: string;
  alt: LocalizedText;
  visible: boolean;
  sortOrder: number;
  /** Internal key for binaries owned by the upload storage boundary. */
  storageKey?: string;
}

export function localizedText(value: LocalizedText, locale: Locale): string {
  return value[locale] ?? value.fr ?? value.en ?? value.ar ?? '';
}
