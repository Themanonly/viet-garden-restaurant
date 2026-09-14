import type { LocalizedText } from './models';
import { LocationValidationError, compareLocations, normalizeGoogleMapsUrl, validateLocationCollection, type Location } from './location';
import type { LocationRepository } from './location-repository';

export type LocationCreateInput = Omit<Location, 'id' | 'profileId'> & { id?: string; profileId?: string };
export type LocationUpdateInput = Partial<Omit<Location, 'id' | 'profileId'>>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function generateLocationId(existingIds: string[]): string {
  const candidate = `location-${crypto.randomUUID()}`;
  return existingIds.includes(candidate) ? generateLocationId(existingIds) : candidate;
}

function normalizeLocation(location: Location): Location {
  return { ...clone(location), googleMapsUrl: normalizeGoogleMapsUrl(location.googleMapsUrl) };
}

export class LocationService {
  constructor(private readonly repository: LocationRepository, private readonly profileId: string) {}

  async getState() {
    const state = await this.repository.getState();
    return { initialized: state.initialized, locations: clone(state.locations.filter((location) => location.profileId === this.profileId).sort(compareLocations)) };
  }

  async listLocations(): Promise<Location[]> {
    return clone((await this.repository.listLocations()).filter((location) => location.profileId === this.profileId).sort(compareLocations));
  }

  async listEnabledLocations(): Promise<Location[]> {
    return (await this.listLocations()).filter((location) => location.enabled);
  }

  async ensureSeeded(): Promise<Location[]> {
    return clone((await this.repository.ensureSeeded()).filter((location) => location.profileId === this.profileId).sort(compareLocations));
  }

  async createLocation(input: LocationCreateInput): Promise<Location> {
    const locations = await this.listLocations();
    const location = normalizeLocation({ ...clone(input), id: input.id?.trim() || generateLocationId(locations.map((candidate) => candidate.id)), profileId: this.profileId });
    const next = this.applyPrimaryRule([...locations, location], location.isPrimary ? location.id : undefined);
    await this.repository.replaceLocations(next);
    return clone(next.find((candidate) => candidate.id === location.id) as Location);
  }

  async updateLocation(id: string, input: LocationUpdateInput): Promise<Location> {
    const locations = await this.listLocations();
    const index = locations.findIndex((location) => location.id === id);
    if (index < 0) throw new LocationValidationError([{ code: 'not-found', message: `Location not found: ${id}.`, path: 'id' }]);
    const updated = normalizeLocation({ ...locations[index], ...clone(input), id, profileId: this.profileId });
    let next = [...locations];
    next[index] = updated;
    next = this.applyPrimaryRule(next, updated.isPrimary ? id : undefined);
    await this.repository.replaceLocations(next);
    return clone(next.find((candidate) => candidate.id === id) as Location);
  }

  async setEnabled(id: string, enabled: boolean): Promise<Location> {
    const locations = await this.listLocations();
    const index = locations.findIndex((location) => location.id === id);
    if (index < 0) throw new LocationValidationError([{ code: 'not-found', message: `Location not found: ${id}.`, path: 'id' }]);
    const next = [...locations];
    next[index] = { ...next[index], enabled, isPrimary: enabled ? next[index].isPrimary : false };
    const primaryId = enabled && next[index].isPrimary ? id : this.primaryForEnabled(next, id);
    const normalized = this.applyPrimaryRule(next, primaryId);
    await this.repository.replaceLocations(normalized);
    return clone(normalized.find((candidate) => candidate.id === id) as Location);
  }

  async setPrimary(id: string): Promise<Location> {
    const locations = await this.listLocations();
    const target = locations.find((location) => location.id === id);
    if (!target) throw new LocationValidationError([{ code: 'not-found', message: `Location not found: ${id}.`, path: 'id' }]);
    if (!target.enabled) throw new LocationValidationError([{ code: 'invalid-primary', message: 'A disabled location cannot be primary.', path: 'isPrimary' }]);
    const next = this.applyPrimaryRule(locations, id);
    await this.repository.replaceLocations(next);
    return clone(next.find((candidate) => candidate.id === id) as Location);
  }

  async removeLocation(id: string): Promise<void> {
    const locations = await this.listLocations();
    const target = locations.find((location) => location.id === id);
    if (!target) throw new LocationValidationError([{ code: 'not-found', message: `Location not found: ${id}.`, path: 'id' }]);
    const remaining = locations.filter((location) => location.id !== id);
    await this.repository.replaceLocations(this.applyPrimaryRule(remaining));
  }

  async reorderLocations(ids: string[]): Promise<Location[]> {
    const locations = await this.listLocations();
    if (ids.length !== locations.length || new Set(ids).size !== ids.length || ids.some((id) => !locations.some((location) => location.id === id))) {
      throw new LocationValidationError([{ code: 'invalid-order', message: 'Location ordering must include each location exactly once.', path: 'sortOrder' }]);
    }
    const byId = new Map(locations.map((location) => [location.id, location]));
    const next = ids.map((id, sortOrder) => ({ ...byId.get(id) as Location, sortOrder }));
    await this.repository.replaceLocations(next);
    return clone(next);
  }

  private primaryForEnabled(locations: Location[], excludedId?: string): string | undefined {
    return locations.filter((location) => location.enabled && location.id !== excludedId).sort(compareLocations)[0]?.id;
  }

  private applyPrimaryRule(locations: Location[], requestedPrimaryId?: string): Location[] {
    const normalized = locations.map(normalizeLocation);
    const enabled = normalized.filter((location) => location.enabled).sort(compareLocations);
    const primaryId = requestedPrimaryId && enabled.some((location) => location.id === requestedPrimaryId)
      ? requestedPrimaryId
      : enabled[0]?.id;
    return validateLocationCollection(normalized.map((location) => ({ ...location, isPrimary: location.id === primaryId })));
  }
}
