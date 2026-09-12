import { SiteShell } from '../../components/site-shell';
import { createBrandSettingsRepository } from '../../content/brand-settings';
import { createMediaRepository } from '../../content/media-repository';
import { locales, type Locale } from '../../content/models';
import { createRestaurantProfileRepository } from '../../content/restaurant-profile-repository';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleTemplate({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: Promise<{ locale: string }> | { locale: string };
}) {
  const resolvedParams = await Promise.resolve(params ?? { locale: 'fr' });
  const rawLocale = resolvedParams.locale ?? 'fr';
  const locale = (locales as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : 'fr';
  const settings = createBrandSettingsRepository();
  const mediaRepository = createMediaRepository();
  const logo = await mediaRepository.getMedia(await settings.getBrandLogoMediaId());
  const profile = await createRestaurantProfileRepository().getProfile();

  return <SiteShell locale={locale} logo={logo} profile={profile}>{children}</SiteShell>;
}
