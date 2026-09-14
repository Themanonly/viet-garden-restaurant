import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { locales, type Locale } from '../content/models';
import { getSiteOrigin } from '../content/seo';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: 'Viet Garden Restaurant & Coffee',
  description: 'Official website foundation for Viet Garden Restaurant & Coffee.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestLocale = (await headers()).get('x-viet-garden-locale');
  const locale = locales.includes(requestLocale as Locale) ? (requestLocale as Locale) : 'fr';

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
