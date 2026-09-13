import type { LocalizedText } from './models';

export interface Location {
  id: string;
  profileId: string;
  name: LocalizedText;
  address: LocalizedText;
  city: string;
  postalCode: string;
  googleMapsUrl?: string;
  isPrimary: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface LocationStoreState {
  initialized: boolean;
  locations: Location[];
}

export interface LocationFieldError {
  code: string;
  message: string;
  path: string;
}

export class LocationValidationError extends Error {
  constructor(public readonly fields: LocationFieldError[], message = fields.map((field) => field.message).join(' ')) {
    super(message);
    this.name = 'LocationValidationError';
  }
}

export function normalizeGoogleMapsUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function locationIdForProfile(profileId: string): string {
  const normalized = profileId.trim();
  if (!normalized) throw new Error('A profile ID is required to derive a location ID.');
  return `location-${normalized}`;
}

export function compareLocations(first: Location, second: Location): number {
  return first.sortOrder - second.sortOrder || first.id.localeCompare(second.id);
}

function requiredLocalizedFields(value: LocalizedText, path: string, label: string): LocationFieldError[] {
  return (['fr', 'en', 'ar'] as const)
    .filter((locale) => !value?.[locale]?.trim())
    .map((locale) => ({ code: 'required', message: `${label} requires a ${locale.toUpperCase()} value.`, path: `${path}.${locale}` }));
}

export function validateLocation(location: Location, index = 0): Location {
  const fields: LocationFieldError[] = [];
  const path = `locations[${index}]`;
  if (!location.id?.trim()) fields.push({ code: 'required', message: 'Location requires a stable ID.', path: `${path}.id` });
  if (!location.profileId?.trim()) fields.push({ code: 'required', message: 'Location requires a profile ID.', path: `${path}.profileId` });
  if (!location.name || typeof location.name !== 'object') fields.push({ code: 'invalid', message: 'Location name must be localized text.', path: `${path}.name` });
  if (!location.address || typeof location.address !== 'object') fields.push({ code: 'invalid', message: 'Location address must be localized text.', path: `${path}.address` });
  if (location.enabled) {
    fields.push(...requiredLocalizedFields(location.name, `${path}.name`, 'Location name'));
    fields.push(...requiredLocalizedFields(location.address, `${path}.address`, 'Location address'));
  }
  if (!location.city?.trim()) fields.push({ code: 'required', message: 'Location city is required.', path: `${path}.city` });
  if (!location.postalCode?.trim()) fields.push({ code: 'required', message: 'Location postal code is required.', path: `${path}.postalCode` });
  if (location.googleMapsUrl) {
    try {
      const url = new URL(location.googleMapsUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      fields.push({ code: 'invalid-url', message: 'Enter a valid HTTP or HTTPS Google Maps URL.', path: `${path}.googleMapsUrl` });
    }
  }
  if (!Number.isInteger(location.sortOrder) || location.sortOrder < 0) fields.push({ code: 'invalid', message: 'Location order must be a non-negative integer.', path: `${path}.sortOrder` });
  if (!location.enabled && location.isPrimary) fields.push({ code: 'invalid-primary', message: 'A disabled location cannot be primary.', path: `${path}.isPrimary` });
  if (fields.length) throw new LocationValidationError(fields);
  return {
    ...structuredClone(location),
    googleMapsUrl: normalizeGoogleMapsUrl(location.googleMapsUrl),
  };
}

export function validateLocationCollection(locations: Location[]): Location[] {
  const fields: LocationFieldError[] = [];
  const ids = new Set<string>();
  let primaryCount = 0;
  const normalized = locations.map((location, index) => {
    try {
      const next = validateLocation(location, index);
      if (ids.has(next.id)) fields.push({ code: 'duplicate', message: `Duplicate location ID: ${next.id}.`, path: `locations[${index}].id` });
      ids.add(next.id);
      if (next.isPrimary) primaryCount += 1;
      return next;
    } catch (error) {
      if (error instanceof LocationValidationError) fields.push(...error.fields);
      return structuredClone(location);
    }
  });
  if (normalized.some((location) => location.enabled) && primaryCount !== 1) {
    fields.push({ code: 'primary-count', message: 'Exactly one enabled location must be primary.', path: 'locations' });
  }
  if (fields.length) throw new LocationValidationError(fields);
  return normalized.sort(compareLocations);
}

export function seedLocationFromProfile(profile: {
  id: string;
  name: LocalizedText;
  address: LocalizedText;
  city: string;
  postalCode: string;
  googleMapsUrl?: string;
}): Location {
  return {
    id: locationIdForProfile(profile.id),
    profileId: profile.id,
    name: structuredClone(profile.name),
    address: structuredClone(profile.address),
    city: profile.city,
    postalCode: profile.postalCode,
    ...(normalizeGoogleMapsUrl(profile.googleMapsUrl) ? { googleMapsUrl: normalizeGoogleMapsUrl(profile.googleMapsUrl) } : {}),
    isPrimary: true,
    enabled: true,
    sortOrder: 0,
  };
}
