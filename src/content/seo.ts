import { localizedText, type ContentRoute, type Locale, type LocalizedText, type RestaurantProfile } from './models';
import { restaurantProfile } from './restaurant';

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

export function getSeoMetadata(locale: Locale, route: ContentRoute): SeoMetadata {
  return seoMetadata[basePaths(locale, route)] ?? seoMetadata['/fr'];
}

export function getRestaurantJsonLd(locale: Locale, profile: RestaurantProfile = restaurantProfile) {
  const baseUrl = 'https://viet-garden.netlify.app';
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${baseUrl}/#restaurant`,
    name: 'Viet Garden Restaurant & Coffee',
    alternateName: ['Viet Garden', 'VIET GARDEN RESTAURANT & COFEE'],
    description: localizedText(profile.description, locale),
    url: `${baseUrl}/${locale}`,
    image: `${baseUrl}/media/viet-garden-hero-poster.jpg`,
    logo: `${baseUrl}/media/viet-garden-logo.png`,
    telephone: profile.contacts.filter((contact) => contact.enabled && contact.type === 'phone').sort((first, second) => Number(Boolean(second.primary)) - Number(Boolean(first.primary)) || first.sortOrder - second.sortOrder)[0]?.value,
    priceRange: '$$',
    servableCuisine: ['Vietnamese', 'Asian', 'Sushi'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: localizedText(profile.address, locale),
      addressLocality: profile.city,
      postalCode: profile.postalCode,
      addressCountry: 'MA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 33.6098413,
      longitude: -7.5647156,
    },
    sameAs: profile.socialLinks.filter((s) => s.enabled).sort((first, second) => first.sortOrder - second.sortOrder).map((s) => s.url),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '13:00',
        closes: '22:15',
      },
    ],
    hasMenu: `${baseUrl}/${locale}/menu`,
    acceptsReservations: 'True',
  };
}

