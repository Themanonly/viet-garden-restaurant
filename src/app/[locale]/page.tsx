import Link from 'next/link';
import { getMediaAsset } from '../../content/media';
import { homepageHero, homepageIdentity, routeHref } from '../../content/restaurant';
import { localizedText, locales, type Locale, type RestaurantProfile } from '../../content/models';
import { createMenuRepository } from '../../content/menu-repository';
import { PublicRestaurantStatus } from '../../components/public-restaurant-status';
import { PublicWeeklySchedule } from '../../components/public-weekly-schedule';
import { createRestaurantProfileRepository } from '../../content/restaurant-profile-repository';
import { createLocationRepository } from '../../content/location-repository';
import { LocationService } from '../../content/location-service';
import { restaurantProfile } from '../../content/restaurant';
import { PublicLocations } from '../../components/public-locations';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function getHomepageBusinessCopy(profile: RestaurantProfile, locale: Locale) {
  return {
    heroName: localizedText(profile.name, locale),
    heroStatement: localizedText(homepageHero.statement, locale),
    about: localizedText(profile.description, locale),
    address: localizedText(profile.address, locale),
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : 'fr';
  const heroVideo = getMediaAsset('hero-visual');
  const identityImage = getMediaAsset('identity-visual');
  const profile = await createRestaurantProfileRepository().getProfile();
  const locations = await new LocationService(createLocationRepository(restaurantProfile.id), restaurantProfile.id).listEnabledLocations();
  const phone = profile.contacts.find((item) => item.enabled && (item.type === 'phone' || item.type === 'whatsapp'));
  const menu = await createMenuRepository().getMenu();
  const businessCopy = getHomepageBusinessCopy(profile, locale);

  return (
    <main id="top" className="page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media" aria-hidden="true">
          <img src="/media/viet-garden-hero-poster.jpg" alt="" className="hero-poster" />
          {heroVideo ? (
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/media/viet-garden-hero-poster.jpg"
              aria-label={localizedText(heroVideo.alt, locale)}
            >
              <source src={heroVideo.reference} type="video/mp4" />
            </video>
          ) : null}
          <div className="hero-shade" />
        </div>

        <div className="hero-content">
          <p className="hero-eyebrow">{localizedText(homepageHero.eyebrow, locale)}</p>
          <h1 id="hero-title">{businessCopy.heroName}</h1>
          <p className="hero-statement">{businessCopy.heroStatement}</p>
          <PublicRestaurantStatus availability={menu.availability} locale={locale} />
          <div className="hero-actions">
            {phone ? (
              <a className="hero-button hero-button-primary" href={phone.type === 'whatsapp' ? `https://wa.me/${phone.value.replace(/\D/g, '')}` : `tel:${phone.value}`}>
                {localizedText(homepageHero.primaryAction, locale)}
              </a>
            ) : null}
            <Link className="hero-button hero-button-secondary" href={routeHref(locale, 'menu')}>
              {localizedText(homepageHero.secondaryAction, locale)}
            </Link>
          </div>
        </div>

      </section>
      <div id="hero-end" className="hero-end" aria-hidden="true" />

      <section className="identity-section" aria-labelledby="identity-title">
        <div className="identity-media">
          {identityImage ? (
            <img src={identityImage.reference} alt={localizedText(identityImage.alt, locale)} />
          ) : null}
        </div>
        <div className="identity-content">
          <p className="identity-eyebrow">{localizedText(homepageIdentity.eyebrow, locale)}</p>
          <h2 id="identity-title">{localizedText(homepageIdentity.title, locale)}</h2>
          <p className="identity-copy">{businessCopy.about}</p>
          {locations.length > 0 ? <a className="identity-location" href="#locations">{locations.length === 1 ? localizedText({ fr: 'Voir notre adresse', en: 'View our location', ar: 'عرض موقعنا' }, locale) : localizedText({ fr: `Découvrir nos ${locations.length} adresses`, en: `Explore our ${locations.length} locations`, ar: `استكشف فروعنا (${locations.length})` }, locale)}</a> : null}
        </div>
      </section>

      <PublicLocations locations={locations} locale={locale} />

      <section className="schedule-section" aria-labelledby="schedule-section-title">
        <PublicWeeklySchedule availability={menu.availability} locale={locale} />
      </section>
    </main>
  );
}

