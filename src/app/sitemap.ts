import type { MetadataRoute } from 'next';

const publicRoutes = ['', '/menu'];
const locales = ['fr', 'en', 'ar'];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: `https://viet-garden.netlify.app/${locale}${route}`,
      changeFrequency: 'weekly' as const,
      priority: route ? 0.8 : 1,
    })),
  );
}