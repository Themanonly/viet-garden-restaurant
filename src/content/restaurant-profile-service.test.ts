import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FileRestaurantProfileRepository } from './restaurant-profile-repository';
import { RestaurantProfileService } from './restaurant-profile-service';
import { restaurantProfile } from './restaurant';

function labels(prefix: string) {
  return { fr: `${prefix} FR`, en: `${prefix} EN`, ar: `${prefix} AR` };
}

async function serviceWithTempProfile() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-profile-'));
  const repository = new FileRestaurantProfileRepository(path.join(directory, 'profile.json'));
  return { repository, service: new RestaurantProfileService(repository) };
}

test('profile seed preserves the existing Viet Garden contact and social records', async () => {
  const { service } = await serviceWithTempProfile();
  const profile = await service.getProfile();
  assert.equal(profile.contacts[0].value, '+212522666773');
  assert.deepEqual(profile.socialLinks.map((social) => social.platform), ['instagram', 'facebook']);
});

test('legacy Glovo ordering records migrate to a stable generic channel ID', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-legacy-profile-'));
  const filePath = path.join(directory, 'profile.json');
  const legacyProfile = { ...JSON.parse(JSON.stringify(restaurantProfile)), ordering: [{ label: { fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo' }, url: 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas', source: 'glovo' }] } as Record<string, unknown>;
  delete legacyProfile.orderingChannels;
  await writeFile(filePath, JSON.stringify(legacyProfile), 'utf8');
  const repository = new FileRestaurantProfileRepository(filePath);
  const profile = await repository.getProfile();
  assert.equal(profile.orderingChannels[0]?.id, 'glovo');
  assert.equal(profile.orderingChannels[0]?.type, 'glovo');
});

test('contact CRUD generates IDs, persists, reorders, toggles, and removes safely', async () => {
  const { repository, service } = await serviceWithTempProfile();
  const created = await service.createContact({ type: 'email', label: labels('Email'), value: 'hello@example.com', enabled: true, sortOrder: 1 });
  assert.match(created.id, /^contact-/);
  const updated = await service.updateContact(created.id, { enabled: false, displayValue: 'hello@example.com' });
  assert.equal(updated.enabled, false);
  const contacts = await service.listContacts();
  const reordered = await service.reorderContacts([created.id, contacts[0].id]);
  assert.equal(reordered[0].id, created.id);
  await service.deleteContact(created.id);
  assert.equal((await service.listContacts()).some((contact) => contact.id === created.id), false);
  const persisted = JSON.parse(await readFile((repository as unknown as { filePath: string }).filePath ?? '', 'utf8'));
  assert.equal(persisted.contacts.some((contact: { id: string }) => contact.id === created.id), false);
});

test('social CRUD generates IDs and rejects invalid URLs', async () => {
  const { service } = await serviceWithTempProfile();
  const created = await service.createSocialLink({ platform: 'tiktok', label: labels('TikTok'), url: 'https://www.tiktok.com/@vietgarden', enabled: true, sortOrder: 2 });
  assert.match(created.id, /^social-/);
  await assert.rejects(service.createSocialLink({ platform: 'custom', label: labels('Bad'), url: 'not-a-url', enabled: true, sortOrder: 3 }), /valid HTTP or HTTPS URL/);
  await service.deleteSocialLink(created.id);
});

test('ordering channel CRUD generates IDs, preserves Glovo, validates, reorders, and removes', async () => {
  const { service } = await serviceWithTempProfile();
  const initial = await service.listOrderingChannels();
  assert.equal(initial[0]?.id, 'glovo');
  assert.equal(initial[0]?.url, 'https://glovoapp.com/ma/fr/casablanca/viet-garden-cas');
  const created = await service.createOrderingChannel({ name: labels('Yassir'), type: 'yassir', url: 'https://yassir.io/order', enabled: true, sortOrder: 1 });
  assert.match(created.id, /^ordering-/);
  const updated = await service.updateOrderingChannel(created.id, { enabled: false, ctaText: labels('Order') });
  assert.equal(updated.enabled, false);
  await assert.rejects(service.createOrderingChannel({ name: labels('Bad'), type: 'other', url: 'not-a-url', enabled: true, sortOrder: 2 }), /valid HTTP or HTTPS ordering URL/);
  const reordered = await service.reorderOrderingChannels([created.id, 'glovo']);
  assert.deepEqual(reordered.map((channel) => channel.id), [created.id, 'glovo']);
  await service.deleteOrderingChannel(created.id);
  assert.deepEqual((await service.listOrderingChannels()).map((channel) => channel.id), ['glovo']);
});

test('business profile update persists generic identity, location, and settings without disturbing existing contacts or ordering', async () => {
  const { service } = await serviceWithTempProfile();
  const profile = await service.updateProfile({
    name: { fr: 'Restaurant Exemple', en: 'Example Restaurant', ar: 'مطعم مثال' },
    description: { fr: 'Description FR', en: 'Description EN', ar: 'وصف عربي' },
    city: 'Rabat',
    postalCode: '10000',
    country: 'Morocco',
    region: 'Rabat-Salé-Kénitra',
    googleMapsUrl: 'https://maps.google.com/?q=Rabat',
    businessType: 'restaurant',
    settings: { currency: 'MAD', timezone: 'Africa/Casablanca', defaultLocale: 'fr', supportedLocales: ['fr', 'en', 'ar'], reservationsAvailable: true, deliveryEnabled: true, pickupEnabled: true },
  });

  assert.equal(profile.name.fr, 'Restaurant Exemple');
  assert.equal(profile.city, 'Rabat');
  assert.equal(profile.country, 'Morocco');
  assert.equal(profile.settings?.currency, 'MAD');
  assert.equal(profile.contacts.length > 0, true);
  assert.equal(profile.orderingChannels[0]?.type, 'glovo');
  await assert.rejects(service.updateProfile({ googleMapsUrl: 'not-a-url' }), /valid HTTP or HTTPS URL/);
});
