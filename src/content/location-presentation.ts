import type { Locale } from './models';
import type { Location } from './location';
import { localizedText } from './models';

export function getLocationAddressParts(location: Location, locale: Locale): { address: string; meta?: string } {
  const address = localizedText(location.address, locale);
  const hasPostalCode = address.includes(location.postalCode);
  const hasCity = address.includes(location.city) || (locale === 'ar' && /[,،]/.test(address) && hasPostalCode);
  return { address, meta: hasPostalCode && hasCity ? undefined : `${location.city} ${location.postalCode}`.trim() };
}

export function getLocationCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'location' : 'locations'}`;
}
