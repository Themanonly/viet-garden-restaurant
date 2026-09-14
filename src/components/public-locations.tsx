import type { Locale } from '../content/models';
import { localizedText } from '../content/models';
import type { Location } from '../content/location';

const copy = {
  title: { fr: 'Nos adresses', en: 'Our locations', ar: 'فروعنا' },
  primary: { fr: 'Principal', en: 'Primary', ar: 'الرئيسي' },
  map: { fr: 'Ouvrir dans Google Maps', en: 'Open in Google Maps', ar: 'فتح في خرائط Google' },
};

export function PublicLocations({ locations, locale }: { locations: Location[]; locale: Locale }) {
  if (!locations.length) return null;
  const orderedLocations = [...locations].sort((first, second) => first.sortOrder - second.sortOrder || first.id.localeCompare(second.id));
  return <section id="locations" className="locations-section" aria-labelledby="locations-title"><div className="locations-heading"><p className="identity-eyebrow">{localizedText(copy.title, locale)}</p><h2 id="locations-title">{localizedText(copy.title, locale)}</h2></div><div className="locations-grid">{orderedLocations.map((location) => {
    const address = localizedText(location.address, locale);
    const includesMeta = address.includes(location.postalCode) && (address.includes(location.city) || (locale === 'ar' && /[,،]/.test(address)));
    return <article className="location-card" key={location.id}><div className="location-card-heading"><h3>{localizedText(location.name, locale)}</h3>{location.isPrimary ? <span className="location-primary-badge">{localizedText(copy.primary, locale)}</span> : null}</div><p className="location-card-address">{address}</p>{includesMeta ? null : <p className="location-card-meta">{location.city} {location.postalCode}</p>}{location.googleMapsUrl ? <a className="location-map-link" href={location.googleMapsUrl} target="_blank" rel="noreferrer">{localizedText(copy.map, locale)}</a> : null}</article>;
  })}</div></section>;
}
