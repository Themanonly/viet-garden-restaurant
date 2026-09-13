import { validateLocationCollection, type Location, type LocationStoreState } from './location';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';
import type { LocationRepository } from './location-repository';

type LocationRow = {
  id: string;
  profile_id: string;
  name: Location['name'];
  address: Location['address'];
  city: string;
  postal_code: string;
  google_maps_url: string | null;
  is_primary: boolean;
  enabled: boolean;
  sort_order: number;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function queryEquals(column: string, value: string): string {
  return `${column}=eq.${encodeURIComponent(value)}`;
}

function toLocation(row: LocationRow): Location {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: clone(row.name),
    address: clone(row.address),
    city: row.city,
    postalCode: row.postal_code,
    ...(row.google_maps_url ? { googleMapsUrl: row.google_maps_url } : {}),
    isPrimary: row.is_primary,
    enabled: row.enabled,
    sortOrder: row.sort_order,
  };
}

function toRow(location: Location): LocationRow {
  return {
    id: location.id,
    profile_id: location.profileId,
    name: clone(location.name),
    address: clone(location.address),
    city: location.city,
    postal_code: location.postalCode,
    google_maps_url: location.googleMapsUrl ?? null,
    is_primary: location.isPrimary,
    enabled: location.enabled,
    sort_order: location.sortOrder,
  };
}

export class SupabaseLocationRepository implements LocationRepository {
  constructor(private readonly profileId: string, private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient()) {
    if (!profileId.trim()) throw new Error('A profile ID is required for Location persistence.');
  }

  async getState(): Promise<LocationStoreState> {
    const rows = await this.database.select<LocationRow>('restaurant_locations', `select=*&${queryEquals('profile_id', this.profileId)}&order=sort_order.asc,id.asc`);
    return { initialized: true, locations: clone(validateLocationCollection(rows.map(toLocation))) };
  }

  async listLocations(): Promise<Location[]> {
    return (await this.getState()).locations;
  }

  async ensureSeeded(): Promise<Location[]> {
    return this.listLocations();
  }

  async replaceLocations(locations: Location[]): Promise<void> {
    const nextLocations = validateLocationCollection(locations);
    await this.database.rpc('replace_restaurant_locations', {
      p_profile_id: this.profileId,
      p_locations: nextLocations.map(toRow),
    });
  }
}

export function createSupabaseLocationRepository(profileId: string, database?: SupabaseDatabaseClient): SupabaseLocationRepository {
  return new SupabaseLocationRepository(profileId, database);
}
