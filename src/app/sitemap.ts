import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '../content/seo';

const publicRoutes = ['', '/menu'];
const locales = ['fr', 'en', 'ar'];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  return locales.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: `${origin}/${locale}${route}`,
      changeFrequency: 'weekly' as const,
      priority: route ? 0.8 : 1,
    })),
  );
}