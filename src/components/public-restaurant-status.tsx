import { getEffectiveMenuStatus } from '../content/menu-validation';
import type { MenuAvailability } from '../content/menu';
import { localizedText, type Locale } from '../content/models';

const statusCopy = {
  open: { fr: 'OUVERT', en: 'OPEN', ar: 'مفتوح' },
  closed: { fr: 'FERMÉ', en: 'CLOSED', ar: 'مغلق' },
} as const;

const temporaryClosureCopy = { fr: 'Fermeture temporaire', en: 'Temporary closure', ar: 'إغلاق مؤقت' } as const;

export function PublicRestaurantStatus({ availability, locale }: { availability: MenuAvailability; locale: Locale }) {
  const effectiveStatus = getEffectiveMenuStatus(availability);
  const message = availability.temporaryClosure.active
    ? localizedText(availability.temporaryClosure.message, locale)
    : localizedText(availability.statusMessage, locale);

  return (
    <aside className={`public-status is-${effectiveStatus}`} aria-label={localizedText({ fr: 'Statut du restaurant', en: 'Restaurant status', ar: 'حالة المطعم' }, locale)}>
      <span className="public-status-indicator" aria-hidden="true" />
      <span className="public-status-label">{localizedText(statusCopy[effectiveStatus], locale)}</span>
      {availability.temporaryClosure.active ? <span className="public-status-context">{localizedText(temporaryClosureCopy, locale)}</span> : null}
      {message ? <span className="public-status-message">{message}</span> : null}
    </aside>
  );
}
