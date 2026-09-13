import assert from 'node:assert/strict';
import test from 'node:test';
import { restaurantProfile } from './restaurant';
import { defaultLocationId, locationProfileId, type Location } from './location';
import { LocationService } from './location-service';
import { SupabaseLocationRepository } from './supabase-location-repository';
import type { SupabaseDatabaseClient } from './supabase-database';

class FakeLocationDatabase implements SupabaseDatabaseClient {
  rows: Record<string, unknown>[] = [];
  profile = [{ id: restaurantProfile.id }];
  rpcCalls: { name: string; body: unknown }[] = [];

  async select<T>(table: string): Promise<T[]> {
    if (table === 'restaurant_profiles') return this.profile as T[];
    if (table === 'restaurant_locations') return this.rows as T[];
    return [];
  }

  async insert<T>(): Promise<T[]> { return []; }
  async upsert<T>(): Promise<T[]> { return []; }
  async update<T>(): Promise<T[]> { return []; }
  async remove<T>(): Promise<T[]> { return []; }

  async rpc<T>(name: string, body: unknown): Promise<T> {
    assert.equal(name, 'replace_restaurant_locations');
    this.rpcCalls.push({ name, body });
    const payload = body as { p_profile_id: string; p_locations: Record<string, unknown>[] };
    assert.equal(payload.p_profile_id, locationProfileId);
    this.rows = structuredClone(payload.p_locations);
    return undefined as T;
  }
}

function row(location: Location): Record<string, unknown> {
  return {
    id: location.id,
    profile_id: location.profileId,
    name: location.name,
    address: location.address,
    city: location.city,
    postal_code: location.postalCode,
    google_maps_url: location.googleMapsUrl ?? null,
    is_primary: location.isPrimary,
    enabled: location.enabled,
    sort_order: location.sortOrder,
  };
}

function seededLocation(): Location {
  return {
    id: defaultLocationId,
    profileId: locationProfileId,
    name: structuredClone(restaurantProfile.name),
    address: structuredClone(restaurantProfile.address),
    city: restaurantProfile.city,
    postalCode: restaurantProfile.postalCode,
    googleMapsUrl: restaurantProfile.googleMapsUrl,
    isPrimary: true,
    enabled: true,
    sortOrder: 0,
  };
}

test('Supabase location repository maps deterministic rows and preserves initialized empty state', async () => {
  const database = new FakeLocationDatabase();
  const repository = new SupabaseLocationRepository(database);
  assert.deepEqual(await repository.getState(), { initialized: true, locations: [] });
  database.rows = [row({ ...seededLocation(), id: 'location-z', sortOrder: 1, isPrimary: false, enabled: false }), row(seededLocation())];
  assert.deepEqual((await repository.listLocations()).map((location) => location.id), [defaultLocationId, 'location-z']);
});

test('Supabase location replacement uses the atomic location RPC and maps rows back', async () => {
  const database = new FakeLocationDatabase();
  const repository = new SupabaseLocationRepository(database);
  const service = new LocationService(repository, locationProfileId);
  await repository.replaceLocations([seededLocation()]);
  const locations = await service.listLocations();
  assert.equal(locations[0]?.id, defaultLocationId);
  assert.equal(database.rpcCalls.length, 1);
  assert.deepEqual(database.rpcCalls[0]?.body, { p_profile_id: locationProfileId, p_locations: [row(seededLocation())] });
});

test('Supabase location mutations preserve primary and ordering invariants', async () => {
  const database = new FakeLocationDatabase();
  const repository = new SupabaseLocationRepository(database);
  const service = new LocationService(repository, locationProfileId);
  await repository.replaceLocations([seededLocation()]);
  const second = await service.createLocation({
    name: { fr: 'Second', en: 'Second', ar: 'الثاني' },
    address: { fr: 'Second address', en: 'Second address', ar: 'العنوان الثاني' },
    city: 'Rabat',
    postalCode: '10000',
    enabled: true,
    isPrimary: true,
    sortOrder: 1,
  });
  assert.equal((await service.listLocations()).filter((location) => location.isPrimary).length, 1);
  assert.equal((await service.listLocations()).find((location) => location.id === second.id)?.isPrimary, true);
  assert.equal(database.rows.length, 2);
});
