import { SiteShell } from '../../components/site-shell';
import { createBrandSettingsRepository } from '../../content/brand-settings';
import { createMediaRepository } from '../../content/media-repository';
import { locales, type Locale } from '../../content/models';
import { createRestaurantProfileRepository } from '../../content/restaurant-profile-repository';
import { createLocationRepository } from '../../content/location-repository';
import { LocationService } from '../../content/location-service';
import { restaurantProfile } from '../../content/restaurant';

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
  const media = await mediaRepository.listMedia();
  const profile = await createRestaurantProfileRepository().getProfile();
  const locations = await new LocationService(createLocationRepository(restaurantProfile.id), restaurantProfile.id).listLocations();

  return <SiteShell locale={locale} logo={logo} profile={profile} media={media} locations={locations.filter((location) => location.enabled)}>{children}</SiteShell>;
}
