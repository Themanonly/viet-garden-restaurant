import assert from 'node:assert/strict';
import test from 'node:test';
import { restaurantProfile } from './restaurant';
import { SupabaseRestaurantProfileRepository } from './supabase-restaurant-profile-repository';
import type { SupabaseDatabaseClient } from './supabase-database';
import { RestaurantProfileService } from './restaurant-profile-service';

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
  async rpc<T>(name: string, body: unknown): Promise<T> {
    assert.equal(name, 'replace_restaurant_profile');
    const payload = structuredClone(body) as { p_profile: FakeProfileDatabase['profile'][number]; p_contacts: Record<string, unknown>[]; p_socials: Record<string, unknown>[] };
    // Provider contract: validate the candidate transaction before committing.
    if (payload.p_socials.some(row => row.icon_media_id && row.icon_media_id !== 'brand-logo')) throw new Error('23503 invalid media reference');
    if (new Set(payload.p_socials.map(row => row.sort_order)).size !== payload.p_socials.length) throw new Error('23505 duplicate Social sort order');
    this.profile = [payload.p_profile];
    this.contacts = payload.p_contacts;
    this.socialLinks = payload.p_socials;
    return null as T;
  }
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

test('atomic replacement preserves every existing record on failure', async () => {
  const database = new FakeProfileDatabase();
  const repository = new SupabaseRestaurantProfileRepository(database);
  await repository.replaceProfile(structuredClone(restaurantProfile));
  const before = await repository.getProfile();
  const candidate = structuredClone(before);
  candidate.socialLinks[0].iconMediaId = 'missing-media';
  candidate.contacts = [];
  candidate.city = 'Must roll back';
  await assert.rejects(repository.replaceProfile(candidate), /23503/);
  assert.deepEqual(await repository.getProfile(), before);
});

test('media reference survives replacement and reload, clearing persists null and preserves legacy icons', async () => {
  const database = new FakeProfileDatabase();
  const repository = new SupabaseRestaurantProfileRepository(database);
  const candidate = structuredClone(restaurantProfile);
  candidate.socialLinks[0].iconMediaId = 'brand-logo';
  candidate.socialLinks[0].icon = 'instagram';
  await repository.replaceProfile(candidate);
  assert.equal(database.socialLinks[0].icon_media_id, 'brand-logo');
  const reloaded = await repository.getProfile();
  assert.equal(reloaded.socialLinks[0].iconMediaId, 'brand-logo');
  reloaded.socialLinks[0].iconMediaId = undefined;
  await repository.replaceProfile(reloaded);
  assert.equal(database.socialLinks[0].icon_media_id, null);
  const cleared = await repository.getProfile();
  assert.equal(cleared.socialLinks[0].iconMediaId, undefined);
  assert.equal(cleared.socialLinks[0].icon, 'instagram');
  assert.equal(cleared.socialLinks.length, 2);
});

test('new Social form position zero appends safely with a selected media asset', async () => {
  const database = new FakeProfileDatabase();
  const repository = new SupabaseRestaurantProfileRepository(database);
  await repository.replaceProfile(structuredClone(restaurantProfile));
  const service = new RestaurantProfileService(repository);
  const created = await service.createSocialLink({ platform: 'instagram', label: { fr: 'Instagram', en: 'Instagram', ar: 'Instagram' }, url: 'https://example.test/social', enabled: true, sortOrder: 0, iconMediaId: 'brand-logo' });
  assert.equal(created.sortOrder, 2);
  const saved = await service.listSocialLinks();
  assert.equal(saved.length, 3);
  assert.equal(saved[2].iconMediaId, 'brand-logo');
  assert.equal(saved[1].platform, 'facebook');
});
