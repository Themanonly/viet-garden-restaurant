export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export type LocalizedText = Partial<Record<Locale, string>>;

export type ContentRoute = 'home' | 'menu';
export type NavigationRoute = ContentRoute | 'contact' | 'location';

export interface NavigationItem {
  route: NavigationRoute;
  label: LocalizedText;
}

export type RestaurantContactType = 'phone' | 'whatsapp' | 'email' | 'fax' | 'other';

export interface RestaurantContact {
  id: string;
  type: RestaurantContactType;
  label: LocalizedText;
  value: string;
  displayValue?: string;
  enabled: boolean;
  sortOrder: number;
  primary?: boolean;
}

export interface RestaurantSocialLink {
  id: string;
  platform: string;
  label: LocalizedText;
  url: string;
  handle?: string;
  icon?: string;
  enabled: boolean;
  sortOrder: number;
}

export type OrderingChannelType = 'glovo' | 'yassir' | 'uber-eats' | 'direct' | 'whatsapp' | 'other' | (string & {});

export interface OrderingChannel {
  id: string;
  name: LocalizedText;
  type: OrderingChannelType;
  url: string;
  logoMediaId?: string;
  description?: LocalizedText;
  ctaText?: LocalizedText;
  enabled: boolean;
  sortOrder: number;
}

export type BusinessType = 'restaurant' | 'cafe' | 'bakery' | 'bar' | 'food-stand' | 'other' | (string & {});

export interface BusinessProfileSettings {
  currency?: string;
  timezone?: string;
  defaultLocale?: Locale;
  supportedLocales?: Locale[];
  reservationsAvailable?: boolean;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
}

export interface RestaurantProfile {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  sourceLanguage: 'fr';
  address: LocalizedText;
  city: string;
  postalCode: string;
  country?: string;
  region?: string;
  googleMapsUrl?: string;
  businessType?: BusinessType;
  settings?: BusinessProfileSettings;
  contacts: RestaurantContact[];
  socialLinks: RestaurantSocialLink[];
  orderingChannels: OrderingChannel[];
}

export type MediaAssetType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';

export interface MediaAsset {
  id: string;
  type: MediaAssetType;
  source: 'local' | 'remote' | 'brand';
  reference: string;
  title?: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
  alt: LocalizedText;
  visible: boolean;
  sortOrder: number;
  /** Internal key for binaries owned by the upload storage boundary. */
  storageKey?: string;
}

export function localizedText(value: LocalizedText, locale: Locale): string {
  return value[locale] ?? value.fr ?? value.en ?? value.ar ?? '';
}
