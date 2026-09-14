import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRestaurantJsonLd, getSeoMetadata, getSiteOrigin, localeAlternates } from '../../content/seo';
import { localizedText, locales, type Locale } from '../../content/models';
import { getMediaAsset } from '../../content/media';
import { createRestaurantProfileRepository } from '../../content/restaurant-profile-repository';
import { createLocationRepository } from '../../content/location-repository';
import { LocationService } from '../../content/location-service';
import { createMenuRepository } from '../../content/menu-repository';
import { LocaleDocumentAttributes } from '../../components/locale-document-attributes';

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
  const profile = await createRestaurantProfileRepository().getProfile();
  const seo = getSeoMetadata(locale, 'home', profile);
  const favicon = getMediaAsset('brand-favicon');
  const titleText = localizedText(seo.title, locale);
  const descriptionText = localizedText(seo.description, locale);
  const siteOrigin = getSiteOrigin();
  const siteUrl = `${siteOrigin}/${locale}`;
  const ogLocale = locale === 'fr' ? 'fr_FR' : locale === 'ar' ? 'ar_MA' : 'en_US';
  const siteName = localizedText(profile.name, locale);

  return {
    title: titleText,
    description: descriptionText,
    alternates: { canonical: seo.canonicalPath, languages: localeAlternates },
    icons: favicon ? { icon: favicon.reference } : undefined,
    openGraph: {
      title: titleText,
      description: descriptionText,
      url: siteUrl,
      siteName: siteName,
      locale: ogLocale,
      type: 'website',
      images: [
        {
          url: `${siteOrigin}/media/viet-garden-hero-poster.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} ${profile.city}`.trim(),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      description: descriptionText,
      images: [`${siteOrigin}/media/viet-garden-hero-poster.jpg`],
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
  const profile = await createRestaurantProfileRepository().getProfile();
  const locations = await new LocationService(createLocationRepository(profile.id), profile.id).listEnabledLocations();
  const menu = await createMenuRepository().getMenu();
  const jsonLd = getRestaurantJsonLd(locale, profile, locations, menu.availability);

  return (
    <div dir={dir}>
      <LocaleDocumentAttributes locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}


