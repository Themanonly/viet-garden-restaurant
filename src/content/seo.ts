import { localizedText, type ContentRoute, type Locale, type LocalizedText, type RestaurantProfile } from './models';
import { restaurantProfile } from './restaurant';
import type { Location } from './location';
import type { MenuAvailability, MenuWeekday } from './menu';

export const DEFAULT_SITE_ORIGIN = 'https://viet-garden.netlify.app';

const weekdaysList: MenuWeekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function getSiteOrigin(overrideUrl?: string): string {
  const candidate = overrideUrl
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.URL
    ?? DEFAULT_SITE_ORIGIN;

  try {
    const trimmed = candidate.trim();
    if (!trimmed) return DEFAULT_SITE_ORIGIN;
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return DEFAULT_SITE_ORIGIN;
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export interface SeoMetadata {
  title: LocalizedText;
  description: LocalizedText;
  canonicalPath: string;
  indexable: boolean;
}

const basePaths = (locale: Locale, route: ContentRoute) => (route === 'home' ? `/${locale}` : `/${locale}/${route}`);

export const localeAlternates: Record<Locale, string> = {
  fr: '/fr',
  en: '/en',
  ar: '/ar',
};

export function getSeoMetadata(locale: Locale, route: ContentRoute, profile: RestaurantProfile = restaurantProfile): SeoMetadata {
  const localizedName = profile.name;
  const title: LocalizedText = route === 'home'
    ? localizedName
    : {
        fr: `Menu | ${localizedName.fr || localizedName.en || localizedName.ar || 'Viet Garden'}`,
        en: `Menu | ${localizedName.en || localizedName.fr || localizedName.ar || 'Viet Garden'}`,
        ar: `القائمة | ${localizedName.ar || localizedName.fr || localizedName.en || 'فييت غاردن'}`,
      };

  return {
    title,
    description: profile.description,
    canonicalPath: basePaths(locale, route),
    indexable: true,
  };
}

const schemaDayMap: Record<MenuWeekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export type JsonLdMediaOptions = {
  imageUrl?: string;
  logoUrl?: string;
};

export function getRestaurantJsonLd(
  locale: Locale,
  profile: RestaurantProfile = restaurantProfile,
  locations: Location[] = [],
  availability?: MenuAvailability,
  siteOriginOverride?: string,
  mediaOptions?: JsonLdMediaOptions,
) {
  const siteOrigin = getSiteOrigin(siteOriginOverride);
  const primaryPhone = profile.contacts
    ?.filter((contact) => contact.enabled && (contact.type === 'phone' || contact.type === 'whatsapp'))
    .sort((first, second) => Number(Boolean(second.primary)) - Number(Boolean(first.primary)) || first.sortOrder - second.sortOrder)[0]?.value;

  const enabledLocations = locations.filter((loc) => loc.enabled);
  const primaryLocation = enabledLocations.find((loc) => loc.isPrimary) ?? enabledLocations[0];

  let address: Record<string, string> | undefined;
  if (primaryLocation) {
    address = {
      '@type': 'PostalAddress',
      streetAddress: localizedText(primaryLocation.address, locale),
      addressLocality: primaryLocation.city,
      postalCode: primaryLocation.postalCode,
      addressCountry: profile.country ?? 'MA',
    };
  }

  const acceptsReservations = typeof profile.settings?.reservationsAvailable === 'boolean'
    ? profile.settings.reservationsAvailable
    : true;

  const openingHoursSpecification: Array<{
    '@type': string;
    dayOfWeek: string;
    opens: string;
    closes: string;
  }> = [];

  if (availability?.schedule) {
    for (const day of weekdaysList) {
      const periods = availability.schedule[day] ?? [];
      for (const period of periods) {
        if (period.opensAt && period.closesAt) {
          openingHoursSpecification.push({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: schemaDayMap[day],
            opens: period.opensAt,
            closes: period.closesAt,
          });
        }
      }
    }
  }

  const socialUrls = (profile.socialLinks ?? [])
    .filter((s) => s.enabled)
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((s) => s.url);

  const image = mediaOptions?.imageUrl
    ? (mediaOptions.imageUrl.startsWith('http') ? mediaOptions.imageUrl : `${siteOrigin}${mediaOptions.imageUrl}`)
    : `${siteOrigin}/media/viet-garden-hero-poster.jpg`;

  const logo = mediaOptions?.logoUrl
    ? (mediaOptions.logoUrl.startsWith('http') ? mediaOptions.logoUrl : `${siteOrigin}${mediaOptions.logoUrl}`)
    : `${siteOrigin}/media/viet-garden-logo.png`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${siteOrigin}/#restaurant`,
    name: localizedText(profile.name, locale),
    alternateName: ['Viet Garden', 'VIET GARDEN RESTAURANT & COFEE'],
    description: localizedText(profile.description, locale),
    url: `${siteOrigin}/${locale}`,
    image,
    logo,
    ...(primaryPhone ? { telephone: primaryPhone } : {}),
    priceRange: '$$',
    servesCuisine: ['Vietnamese', 'Asian', 'Sushi'],
    ...(address ? { address } : {}),
    ...(socialUrls.length > 0 ? { sameAs: socialUrls } : {}),
    ...(openingHoursSpecification.length > 0 ? { openingHoursSpecification } : {}),
    hasMenu: `${siteOrigin}/${locale}/menu`,
    acceptsReservations,
  };
}


