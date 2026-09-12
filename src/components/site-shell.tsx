'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { localizedText, type Locale, type MediaAsset, type RestaurantProfile } from '../content/models';
import { localizedPathname, restaurantProfile, routeHref, siteNavigation, languageLabels } from '../content/restaurant';
import { contactPresentation, orderingPresentation, socialPresentation } from '../content/platform-presentation';
import { resolvePlatformMedia, socialIconFallback } from '../content/platform-media';
import { PlatformMediaIcon } from './platform-media-icon';

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

export function SiteShell({ locale, logo, profile, media = [], children }: { locale: Locale; logo?: MediaAsset; profile?: RestaurantProfile; media?: MediaAsset[]; children: ReactNode }) {
  const localeOptions: Locale[] = ['fr', 'en', 'ar'];
  const pathname = usePathname();
  const pathLocale = pathname?.split('/')[1] as Locale | undefined;
  const currentLocale = pathLocale && localeOptions.includes(pathLocale) ? pathLocale : locale;
  const [currentHash, setCurrentHash] = useState('');
  const menuRef = useRef<HTMLDetailsElement>(null);
  const menuLabel = localizedText({ fr: 'Menu', en: 'Menu', ar: 'القائمة' }, currentLocale);
  const managedProfile = profile ?? restaurantProfile;
  const resolveMedia = (id?: string) => resolvePlatformMedia(media, id);
  const primaryOrder = managedProfile.orderingChannels.filter((channel) => channel.enabled).sort((first, second) => first.sortOrder - second.sortOrder)[0];
  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  const renderNavigation = (navigationId: string, className: string) => (
    <nav
      id={navigationId}
      className={className}
      aria-label={localizedText({ fr: 'Navigation principale', en: 'Main navigation', ar: 'التنقل الرئيسي' }, currentLocale)}
    >
      {siteNavigation.map((item) => {
        const href = item.route === 'home' ? `/${currentLocale}` : routeHref(currentLocale, item.route);
        return (
          <a key={item.route} href={href} className="nav-link">
            {localizedText(item.label, currentLocale)}
          </a>
        );
      })}

      {primaryOrder ? (
        <a href={primaryOrder.url} className="nav-order-link">
          {localizedText(primaryOrder.ctaText ?? primaryOrder.name, currentLocale)}
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

      <footer id="contact-information" className="site-footer">
        <div className="shell-frame footer-inner">
          <div className="footer-brand-block">
            <div className="brand brand-footer">
              {logo ? <img className="brand-logo-image" src={logo.reference} alt={localizedText(logo.alt, currentLocale)} /> : null}
            </div>
            <p className="footer-copy">{localizedText(managedProfile.description, currentLocale)}</p>
          </div>

          <div className="footer-column">
            <p className="footer-label">{localizedText({ fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' }, currentLocale)}</p>
            {managedProfile.contacts.filter((contact) => contact.enabled).sort((first, second) => first.sortOrder - second.sortOrder).map((contact) => (
              <a key={contact.id} href={contact.type === 'phone' || contact.type === 'fax' ? `tel:${contact.value}` : contact.type === 'whatsapp' ? `https://wa.me/${contact.value.replace(/\D/g, '')}` : contact.type === 'email' ? `mailto:${contact.value}` : contact.value} className="footer-link">
                {contact.displayValue ?? localizedText(contact.label.en || contact.label.fr || contact.label.ar ? contact.label : contactPresentation[contact.type], currentLocale)}
              </a>
            ))}
            {managedProfile.socialLinks.filter((social) => social.enabled).sort((first, second) => first.sortOrder - second.sortOrder).map((social) => (
              <a key={social.id} href={social.url} target="_blank" rel="noreferrer" className="footer-link">
                <><PlatformMediaIcon asset={resolveMedia(social.iconMediaId ?? undefined)} className="footer-social-image" fallback={socialIconFallback(social.platform, social.icon)} /> {localizedText(social.label.en || social.label.fr || social.label.ar ? social.label : socialPresentation[social.platform]?.label ?? { fr: social.platform, en: social.platform, ar: social.platform }, currentLocale)}</>
              </a>
            ))}
          </div>

          <div className="footer-column">
            <p className="footer-label">{localizedText({ fr: 'Nous trouver', en: 'Find Us', ar: 'موقعنا' }, currentLocale)}</p>
            <a href={managedProfile.googleMapsUrl} target="_blank" rel="noreferrer" className="footer-link">
              {localizedText(managedProfile.address, currentLocale)}
            </a>
            <a href={managedProfile.googleMapsUrl} target="_blank" rel="noreferrer" className="footer-link footer-link-strong">
              {localizedText({ fr: 'Google Maps', en: 'Google Maps', ar: 'خرائط Google' }, currentLocale)}
            </a>
            {primaryOrder ? <a href={primaryOrder.url} target="_blank" rel="noreferrer" className="footer-link footer-link-strong"><PlatformMediaIcon asset={resolveMedia(primaryOrder.logoMediaId)} className="footer-ordering-image" />{localizedText(primaryOrder.ctaText ?? orderingPresentation[primaryOrder.type]?.cta ?? primaryOrder.name, currentLocale)}</a> : null}
          </div>
        </div>
      </footer>
    </>
  );
}
