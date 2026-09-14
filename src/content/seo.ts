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

const routeTitles: Record<ContentRoute, LocalizedText> = {
  home: { fr: 'Viet Garden Restaurant & Coffee', en: 'Viet Garden Restaurant & Coffee', ar: 'مطعم ومقهى فييت غاردن' },
  menu: { fr: 'Menu | Viet Garden Restaurant & Coffee', en: 'Menu | Viet Garden Restaurant & Coffee', ar: 'القائمة | مطعم ومقهى فييت غاردن' },
};

const basePaths = (locale: Locale, route: ContentRoute) => route === 'home' ? `/${locale}` : `/${locale}/${route}`;

export const seoMetadata: Record<string, SeoMetadata> = Object.fromEntries(
  (['fr', 'en', 'ar'] as Locale[]).flatMap((locale) =>
    (['home', 'menu'] as ContentRoute[]).map((route) => [
      basePaths(locale, route),
      {
        title: routeTitles[route],
        description: restaurantProfile.description,
        canonicalPath: basePaths(locale, route),
        indexable: true,
      },
    ])),
);

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

export function getRestaurantJsonLd(
  locale: Locale,
  profile: RestaurantProfile = restaurantProfile,
  locations: Location[] = [],
  availability?: MenuAvailability,
  siteOriginOverride?: string,
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
  } else if (profile.address && (profile.address[locale] || profile.city || profile.postalCode)) {
    address = {
      '@type': 'PostalAddress',
      streetAddress: localizedText(profile.address, locale),
      addressLocality: profile.city ?? '',
      postalCode: profile.postalCode ?? '',
      addressCountry: profile.country ?? 'MA',
    };
  }

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

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${siteOrigin}/#restaurant`,
    name: localizedText(profile.name, locale),
    alternateName: ['Viet Garden', 'VIET GARDEN RESTAURANT & COFEE'],
    description: localizedText(profile.description, locale),
    url: `${siteOrigin}/${locale}`,
    image: `${siteOrigin}/media/viet-garden-hero-poster.jpg`,
    logo: `${siteOrigin}/media/viet-garden-logo.png`,
    ...(primaryPhone ? { telephone: primaryPhone } : {}),
    priceRange: '$$',
    servesCuisine: ['Vietnamese', 'Asian', 'Sushi'],
    ...(address ? { address } : {}),
    ...(socialUrls.length > 0 ? { sameAs: socialUrls } : {}),
    ...(openingHoursSpecification.length > 0 ? { openingHoursSpecification } : {}),
    hasMenu: `${siteOrigin}/${locale}/menu`,
    acceptsReservations: true,
  };
}


