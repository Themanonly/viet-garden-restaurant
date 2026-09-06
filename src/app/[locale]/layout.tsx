import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSeoMetadata, localeAlternates } from '../../content/seo';
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

  return {
    title: localizedText(seo.title, locale),
    description: localizedText(seo.description, locale),
    alternates: { canonical: seo.canonicalPath, languages: localeAlternates },
    icons: favicon ? { icon: favicon.reference } : undefined,
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await Promise.resolve(params);
  const locale = supportedLocales.includes(rawLocale as Locale) ? (rawLocale as Locale) : null;

  if (!locale) {
    notFound();
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return <div lang={locale} dir={dir}>{children}</div>;
}
