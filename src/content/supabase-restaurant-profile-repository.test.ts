import assert from 'node:assert/strict';
import test from 'node:test';
import { restaurantProfile } from './restaurant';
import { SupabaseRestaurantProfileRepository } from './supabase-restaurant-profile-repository';
import type { SupabaseDatabaseClient } from './supabase-database';

class FakeProfileDatabase implements SupabaseDatabaseClient {
  profile = [{ id: restaurantProfile.id, name: restaurantProfile.name, description: restaurantProfile.description, source_language: 'fr' as const, address: restaurantProfile.address, city: restaurantProfile.city, postal_code: restaurantProfile.postalCode, google_maps_url: restaurantProfile.googleMapsUrl, ordering: restaurantProfile.orderingChannels }];
  contacts: Record<string, unknown>[] = [];
  socialLinks: Record<string, unknown>[] = [];

  async select<T>(table: string): Promise<T[]> {
    if (table === 'restaurant_profiles') return this.profile as T[];
    if (table === 'restaurant_contacts') return this.contacts as T[];
    if (table === 'restaurant_social_links') return this.socialLinks as T[];
    return [];
  }

  async insert<T>(table: string, rows: unknown[]): Promise<T[]> {
    if (table === 'restaurant_contacts') this.contacts = rows as Record<string, unknown>[];
    if (table === 'restaurant_social_links') this.socialLinks = rows as Record<string, unknown>[];
    return rows as T[];
  }

  async upsert<T>(_table: string, rows: unknown[]): Promise<T[]> { this.profile = rows as typeof this.profile; return rows as T[]; }
  async update<T>(): Promise<T[]> { return []; }
  async remove<T>(table: string): Promise<T[]> { if (table === 'restaurant_contacts') this.contacts = []; if (table === 'restaurant_social_links') this.socialLinks = []; return []; }
  async rpc<T>(): Promise<T> { throw new Error('Not used'); }
}

test('Supabase profile repository maps structured contact and social records', async () => {
  const database = new FakeProfileDatabase();
  const repository = new SupabaseRestaurantProfileRepository(database);
  await repository.replaceProfile(restaurantProfile);
  const profile = await repository.getProfile();
  assert.equal(profile.contacts[0].value, '+212522666773');
  assert.deepEqual(profile.socialLinks.map((social) => social.platform), ['instagram', 'facebook']);
  assert.equal(database.contacts.length, 1);
  assert.equal(database.socialLinks.length, 2);
});
