import type { ContentRoute, Locale, LocalizedText } from './models';
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
