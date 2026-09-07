import { localizedText, type ContentRoute, type Locale, type LocalizedText } from './models';
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

export function getRestaurantJsonLd(locale: Locale) {
  const baseUrl = 'https://viet-garden.netlify.app';
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${baseUrl}/#restaurant`,
    name: 'Viet Garden Restaurant & Coffee',
    alternateName: ['Viet Garden', 'VIET GARDEN RESTAURANT & COFEE'],
    description: localizedText(restaurantProfile.description, locale),
    url: `${baseUrl}/${locale}`,
    image: `${baseUrl}/media/viet-garden-hero-poster.jpg`,
    logo: `${baseUrl}/media/viet-garden-logo.png`,
    telephone: '+212522666773',
    priceRange: '$$',
    servableCuisine: ['Vietnamese', 'Asian', 'Sushi'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '80 Bd Moulay Slimane, Aïn Sebaâ',
      addressLocality: 'Casablanca',
      postalCode: '20250',
      addressCountry: 'MA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 33.6098413,
      longitude: -7.5647156,
    },
    sameAs: restaurantProfile.socialLinks.filter((s) => s.enabled).map((s) => s.url),
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

