import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRestaurantJsonLd, getSeoMetadata, localeAlternates } from '../../content/seo';
import { localizedText, locales, type Locale } from '../../content/models';
import { getMediaAsset } from '../../content/media';

const supportedLocales = locales;

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
};

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> | { locale: string } }): Promise<Metadata> {
  const { locale: rawLocale } = await Promise.resolve(params);
  const locale = supportedLocales.includes(rawLocale as Locale) ? (rawLocale as Locale) : 'fr';
  const seo = getSeoMetadata(locale, 'home');
  const favicon = getMediaAsset('brand-favicon');
  const titleText = localizedText(seo.title, locale);
  const descriptionText = localizedText(seo.description, locale);
  const siteUrl = `https://viet-garden.netlify.app/${locale}`;
  const ogLocale = locale === 'fr' ? 'fr_FR' : locale === 'ar' ? 'ar_MA' : 'en_US';

  return {
    title: titleText,
    description: descriptionText,
    alternates: { canonical: seo.canonicalPath, languages: localeAlternates },
    icons: favicon ? { icon: favicon.reference } : undefined,
    openGraph: {
      title: titleText,
      description: descriptionText,
      url: siteUrl,
      siteName: 'Viet Garden Restaurant & Coffee',
      locale: ogLocale,
      type: 'website',
      images: [
        {
          url: 'https://viet-garden.netlify.app/media/viet-garden-hero-poster.jpg',
          width: 1200,
          height: 630,
          alt: 'Viet Garden Restaurant & Coffee Casablanca',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      description: descriptionText,
      images: ['https://viet-garden.netlify.app/media/viet-garden-hero-poster.jpg'],
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await Promise.resolve(params);
  const locale = supportedLocales.includes(rawLocale as Locale) ? (rawLocale as Locale) : null;

  if (!locale) {
    notFound();
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const jsonLd = getRestaurantJsonLd(locale);

  return (
    <div lang={locale} dir={dir}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}

