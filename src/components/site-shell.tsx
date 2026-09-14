'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { localizedText, type Locale, type MediaAsset, type RestaurantProfile } from '../content/models';
import { footerAnchorIds, localizedPathname, restaurantProfile, routeHref, siteNavigation, languageLabels } from '../content/restaurant';
import { contactPresentation, orderingPresentation, socialPresentation } from '../content/platform-presentation';
import { resolvePlatformMedia } from '../content/platform-media';
import { PlatformMediaIcon } from './platform-media-icon';
import { PlatformIcon } from './platform-icon';
import { seedLocationFromProfile, type Location } from '../content/location';

function LanguageSwitcher({ localeOptions, currentLocale, pathname, currentHash }: { localeOptions: Locale[]; currentLocale: Locale; pathname: string | null; currentHash: string }) {
  return (
    <details className="language-menu">
      <summary className="language-menu-trigger" aria-label={localizedText({ fr: 'Changer de langue', en: 'Change language', ar: 'تغيير اللغة' }, currentLocale)}>
        <span className="language-globe" aria-hidden="true" />
        <span className="language-current">{currentLocale.toUpperCase()}</span>
        <span className="language-chevron" aria-hidden="true" />
      </summary>
      <div className="language-menu-options" role="group" aria-label={localizedText({ fr: 'Langues disponibles', en: 'Available languages', ar: 'اللغات المتاحة' }, currentLocale)}>
        {localeOptions.map((option) => (
          <Link
            key={option}
            href={localizedPathname(option, pathname, currentHash)}
            className={option === currentLocale ? 'language-option is-active' : 'language-option'}
            aria-current={option === currentLocale ? 'true' : undefined}
          >
            <span>{option.toUpperCase()}</span>
            <small>{localizedText(languageLabels[option], currentLocale)}</small>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function SiteShell({ locale, logo, profile, media = [], locations, children }: { locale: Locale; logo?: MediaAsset; profile?: RestaurantProfile; media?: MediaAsset[]; locations?: Location[]; children: ReactNode }) {
  const localeOptions: Locale[] = ['fr', 'en', 'ar'];
  const pathname = usePathname();
  const pathLocale = pathname?.split('/')[1] as Locale | undefined;
  const currentLocale = pathLocale && localeOptions.includes(pathLocale) ? pathLocale : locale;
  const [currentHash, setCurrentHash] = useState('');
  const menuRef = useRef<HTMLDetailsElement>(null);
  const menuLabel = localizedText({ fr: 'Menu', en: 'Menu', ar: 'القائمة' }, currentLocale);
  const managedProfile = profile ?? restaurantProfile;
  const managedLocations = locations ?? [seedLocationFromProfile(managedProfile)];
  const resolveMedia = (id?: string) => resolvePlatformMedia(media, id);
  const primaryLocation = managedLocations.find((location) => location.isPrimary) ?? managedLocations[0];
  const enabledOrderingChannels = managedProfile.orderingChannels.filter((channel) => channel.enabled).sort((first, second) => first.sortOrder - second.sortOrder);
  const genericOrderingLabel = localizedText({ fr: 'Commander', en: 'Order Online', ar: 'اطلب الآن' }, currentLocale);
  const orderingLabel = localizedText({ fr: 'Commander', en: 'Order Online', ar: 'اطلب عبر الإنترنت' }, currentLocale);
  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  const renderNavigation = (navigationId: string, className: string) => (
    <nav
      id={navigationId}
      className={className}
      aria-label={localizedText({ fr: 'Navigation principale', en: 'Main navigation', ar: 'التنقل الرئيسي' }, currentLocale)}
    >
      {siteNavigation.filter((item) => item.route !== 'location' || managedLocations.length > 0).map((item) => {
        const href = item.route === 'home' ? `/${currentLocale}` : routeHref(currentLocale, item.route);
        return (
          <a key={item.route} href={href} className="nav-link" onClick={closeMenu}>
            {localizedText(item.label, currentLocale)}
          </a>
        );
      })}

      {enabledOrderingChannels.length > 0 ? (
        <a href={localizedPathname(currentLocale, pathname, '#ordering-details')} className="nav-link nav-order-link" onClick={closeMenu}>
          {genericOrderingLabel}
        </a>
      ) : null}

      <LanguageSwitcher localeOptions={localeOptions} currentLocale={currentLocale} pathname={pathname} currentHash={currentHash} />
    </nav>
  );

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="shell-frame header-inner">
          <Link href={`/${currentLocale}`} className="brand" aria-label={localizedText(managedProfile.name, currentLocale)}>
            {logo ? <img className="brand-logo-image" src={logo.reference} alt={localizedText(logo.alt, currentLocale)} /> : null}
          </Link>

          {renderNavigation('desktop-navigation', 'global-nav desktop-nav')}

          <details ref={menuRef} className="menu-disclosure" suppressHydrationWarning>
            <summary
              className="menu-toggle"
              aria-label={menuLabel}
            >
              <span className="menu-toggle-icon" aria-hidden="true"><span /><span /><span /></span>
            </summary>

            {renderNavigation('primary-navigation', 'global-nav mobile-nav')}
          </details>
        </div>
      </header>

      <div className="site-body shell-frame">
        {children}
      </div>

      <footer className="site-footer">
        <div className={enabledOrderingChannels.length > 0 ? 'shell-frame footer-inner footer-inner-with-ordering' : 'shell-frame footer-inner'}>
          <div className="footer-brand-block">
            <div className="brand brand-footer">
              {logo ? <img className="brand-logo-image" src={logo.reference} alt={localizedText(logo.alt, currentLocale)} /> : null}
            </div>
            <p className="footer-copy">{localizedText({ fr: 'Une table vietnamienne à Casablanca, des assiettes généreuses et des moments à partager.', en: 'A Vietnamese table in Casablanca, generous plates, and moments made to share.', ar: 'مائدة فيتنامية في الدار البيضاء، أطباق سخية ولحظات نتشاركها.' }, currentLocale)}</p>
          </div>

          <div id={footerAnchorIds.contact} className="footer-column">
            <p className="footer-label">{localizedText({ fr: 'Informations de contact', en: 'Contact Information', ar: 'معلومات الاتصال' }, currentLocale)}</p>
            {managedProfile.contacts.filter((contact) => contact.enabled).sort((first, second) => first.sortOrder - second.sortOrder).map((contact) => (
              <a key={contact.id} href={contact.type === 'phone' || contact.type === 'fax' ? `tel:${contact.value}` : contact.type === 'whatsapp' ? `https://wa.me/${contact.value.replace(/\D/g, '')}` : contact.type === 'email' ? `mailto:${contact.value}` : contact.value} className="footer-link">
                <PlatformIcon kind="contact" value={contact.type} className="footer-platform-icon" label={localizedText(contact.label.en || contact.label.fr || contact.label.ar ? contact.label : contactPresentation[contact.type], currentLocale)} /> {contact.displayValue ?? localizedText(contact.label.en || contact.label.fr || contact.label.ar ? contact.label : contactPresentation[contact.type], currentLocale)}
              </a>
            ))}
          </div>

          <div className="footer-column">
            <p className="footer-label">{localizedText({ fr: 'Réseaux sociaux', en: 'Social Links', ar: 'روابط التواصل الاجتماعي' }, currentLocale)}</p>
            {managedProfile.socialLinks.filter((social) => social.enabled).sort((first, second) => first.sortOrder - second.sortOrder).map((social) => (
              <a key={social.id} href={social.url} target="_blank" rel="noreferrer" className="footer-link">
                <>{social.platform === 'custom' && social.iconMediaId ? <PlatformMediaIcon asset={resolveMedia(social.iconMediaId)} className="footer-social-image" /> : <PlatformIcon kind="social" value={social.platform} className="footer-platform-icon" label={localizedText(social.label.en || social.label.fr || social.label.ar ? social.label : socialPresentation[social.platform]?.label ?? { fr: social.platform, en: social.platform, ar: social.platform }, currentLocale)} />} {localizedText(social.label.en || social.label.fr || social.label.ar ? social.label : socialPresentation[social.platform]?.label ?? { fr: social.platform, en: social.platform, ar: social.platform }, currentLocale)}</>
              </a>
            ))}
          </div>

          {primaryLocation ? <div id={footerAnchorIds.location} className="footer-column">
            <p className="footer-label">{localizedText({ fr: 'Nous trouver', en: 'Find Us', ar: 'موقعنا' }, currentLocale)}</p>
            {managedLocations.length === 1 ? <a href={primaryLocation.googleMapsUrl} target="_blank" rel="noreferrer" className="footer-link footer-location-card" aria-label={localizedText(primaryLocation.address, currentLocale)}>
              <PlatformIcon kind="location" className="footer-platform-icon" label={localizedText({ fr: 'Adresse', en: 'Address', ar: 'العنوان' }, currentLocale)} />
              <span className="footer-location-copy"><span>{localizedText(primaryLocation.address, currentLocale)}</span>{localizedText(primaryLocation.address, currentLocale).includes(primaryLocation.postalCode) && (localizedText(primaryLocation.address, currentLocale).includes(primaryLocation.city) || (currentLocale === 'ar' && /[,،]/.test(localizedText(primaryLocation.address, currentLocale)))) ? null : <span className="footer-location-meta">{primaryLocation.city} {primaryLocation.postalCode}</span>}<span className="footer-location-action">{localizedText({ fr: 'Ouvrir dans Google Maps', en: 'Open in Google Maps', ar: 'فتح في خرائط Google' }, currentLocale)}</span></span>
            </a> : <a href={localizedPathname(currentLocale, pathname, '#locations')} className="footer-link footer-location-card"><PlatformIcon kind="location" className="footer-platform-icon" label={localizedText({ fr: 'Adresses', en: 'Locations', ar: 'الفروع' }, currentLocale)} /><span className="footer-location-copy"><span>{localizedText({ fr: 'Voir toutes nos adresses', en: 'View all locations', ar: 'عرض جميع فروعنا' }, currentLocale)}</span><span className="footer-location-meta">{primaryLocation.city}</span></span></a>}
          </div> : null}

          {enabledOrderingChannels.length > 0 ? (
            <div id={footerAnchorIds.ordering} className="footer-column">
              <p className="footer-label">{orderingLabel}</p>
              {enabledOrderingChannels.map((channel) => {
                const channelLabel = localizedText(channel.name ?? orderingPresentation[channel.type]?.name ?? { fr: channel.type, en: channel.type, ar: channel.type }, currentLocale);
                const channelCta = localizedText(channel.ctaText ?? orderingPresentation[channel.type]?.cta ?? { fr: 'Commander', en: 'Order', ar: 'اطلب' }, currentLocale);
                const channelAsset = resolveMedia(channel.logoMediaId);
                return (
                  <a key={channel.id} href={channel.url} target="_blank" rel="noreferrer" className="footer-link footer-link-strong footer-ordering-link">
                    <PlatformMediaIcon asset={channelAsset} className="footer-ordering-image" fallback={channelLabel.slice(0, 1).toUpperCase()} />
                    {channelCta || channelLabel}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </footer>
    </>
  );
}
