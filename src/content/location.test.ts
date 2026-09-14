import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { restaurantProfile } from './restaurant';
import { locationIdForProfile, LocationValidationError, seedLocationFromProfile, type Location } from './location';
import { FileLocationRepository } from './location-repository';
import { LocationService } from './location-service';

function labels(prefix: string) {
  return { fr: `${prefix} FR`, en: `${prefix} EN`, ar: `${prefix} AR` };
}

function location(overrides: Partial<Location> = {}): Location {
  return {
    id: 'location-test',
    profileId: restaurantProfile.id,
    name: labels('Location'),
    address: labels('Address'),
    city: 'Casablanca',
    postalCode: '20250',
    googleMapsUrl: 'https://maps.google.com/?q=test',
    isPrimary: true,
    enabled: true,
    sortOrder: 0,
    ...overrides,
  };
}

async function serviceWithTempState() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-locations-'));
  const repository = new FileLocationRepository(path.join(directory, 'locations.json'), restaurantProfile.id, seedLocationFromProfile(restaurantProfile));
  return { repository, service: new LocationService(repository, restaurantProfile.id) };
}

test('location domain seeds the existing Casablanca record deterministically', () => {
  const seeded = seedLocationFromProfile(restaurantProfile);
  assert.equal(seeded.id, locationIdForProfile(restaurantProfile.id));
  assert.equal(seeded.profileId, restaurantProfile.id);
  assert.equal(seeded.city, restaurantProfile.city);
  assert.equal(seeded.isPrimary, true);
  assert.equal(seeded.enabled, true);
  assert.equal(seeded.sortOrder, 0);
});

test('location service generates stable-shaped IDs and persists fresh reloads', async () => {
  const { repository, service } = await serviceWithTempState();
  const created = await service.createLocation({ ...location(), id: undefined, isPrimary: false, sortOrder: 1, name: labels('Second'), address: labels('Second address') });
  assert.match(created.id, /^location-/);
  const reloaded = new LocationService(new FileLocationRepository((repository as unknown as { filePath: string }).filePath, restaurantProfile.id, seedLocationFromProfile(restaurantProfile)), restaurantProfile.id);
  assert.equal((await reloaded.listLocations()).some((candidate) => candidate.id === created.id), true);
});

test('local repository seeds Casablanca once and preserves intentional empty state', async () => {
  const { repository, service } = await serviceWithTempState();
  const initial = await service.listLocations();
  assert.equal(initial.length, 1);
  assert.equal(initial[0]?.id, locationIdForProfile(restaurantProfile.id));
  await service.setEnabled(locationIdForProfile(restaurantProfile.id), false);
  assert.deepEqual(await service.listEnabledLocations(), []);
  assert.equal((await repository.getState()).initialized, true);
  assert.deepEqual((await service.listLocations()).map((candidate) => candidate.id), [locationIdForProfile(restaurantProfile.id)]);
  assert.equal((await service.listLocations()).filter((candidate) => candidate.enabled).length, 0);
});

test('location CRUD supports update, visibility, primary selection, and deterministic reordering', async () => {
  const { service } = await serviceWithTempState();
  const first = (await service.listLocations())[0] as Location;
  const second = await service.createLocation({ ...location(), id: undefined, isPrimary: false, sortOrder: 1, name: labels('Second'), address: labels('Second address') });
  await service.setPrimary(second.id);
  assert.equal((await service.listLocations()).find((candidate) => candidate.id === second.id)?.isPrimary, true);
  await service.setEnabled(second.id, false);
  const afterDisable = await service.listLocations();
  assert.equal(afterDisable.find((candidate) => candidate.id === first.id)?.isPrimary, true);
  await service.updateLocation(first.id, { city: 'Rabat' });
  assert.equal((await service.listLocations()).find((candidate) => candidate.id === first.id)?.city, 'Rabat');
  await service.reorderLocations([second.id, first.id]);
  assert.deepEqual((await service.listLocations()).map((candidate) => candidate.id), [second.id, first.id]);
  await service.removeLocation(second.id);
  assert.deepEqual((await service.listLocations()).map((candidate) => candidate.id), [first.id]);
  assert.equal((await service.listLocations())[0]?.isPrimary, true);
  await service.removeLocation(first.id);
  assert.deepEqual(await service.listEnabledLocations(), []);
});

test('hidden incomplete drafts are accepted but cannot be enabled', async () => {
  const { service } = await serviceWithTempState();
  const draft = await service.createLocation({
    name: { fr: 'Brouillon' },
    address: { fr: 'Adresse brouillon' },
    city: 'Rabat',
    postalCode: '10000',
    isPrimary: false,
    enabled: false,
    sortOrder: 1,
  });
  assert.equal(draft.enabled, false);
  await assert.rejects(service.setEnabled(draft.id, true), (error: unknown) => error instanceof LocationValidationError && error.fields.some((field) => field.path.endsWith('name.en')));
});

test('location validation handles Maps URLs, ordering, IDs, and primary invariants', async () => {
  const { service } = await serviceWithTempState();
  const created = await service.createLocation({ ...location(), id: undefined, googleMapsUrl: '  ', isPrimary: false, enabled: false, sortOrder: 1 });
  assert.equal(created.googleMapsUrl, undefined);
  await assert.rejects(service.updateLocation(created.id, { googleMapsUrl: 'javascript:alert(1)' }), /valid HTTP or HTTPS/);
  await assert.rejects(service.createLocation({ ...location(), id: undefined, enabled: true, isPrimary: false, name: { fr: 'FR' }, address: labels('Address') }), (error: unknown) => error instanceof LocationValidationError && error.fields.some((field) => field.path.endsWith('name.en')));
  await assert.rejects(service.reorderLocations(['missing']), /must include each location exactly once/);
});

test('invalid local state is rejected without being overwritten', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-invalid-locations-'));
  const filePath = path.join(directory, 'locations.json');
  const invalid = { initialized: true, locations: [location({ isPrimary: false })] };
  await writeFile(filePath, JSON.stringify(invalid), 'utf8');
  const repository = new FileLocationRepository(filePath, restaurantProfile.id, seedLocationFromProfile(restaurantProfile));
  await assert.rejects(repository.getState(), /Exactly one enabled location must be primary/);
  assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')), invalid);
});

test('uninitialized local storage remains distinguishable before seeding', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-uninitialized-locations-'));
  const repository = new FileLocationRepository(path.join(directory, 'locations.json'), 'other-profile');
  assert.deepEqual(await repository.getState(), { initialized: false, locations: [] });
});

test('profile-derived IDs and injected seeds remain isolated in shared local storage', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'viet-garden-isolated-locations-'));
  const filePath = path.join(directory, 'locations.json');
  const secondProfile = { ...restaurantProfile, id: 'second-profile' };
  const firstRepository = new FileLocationRepository(filePath, restaurantProfile.id, seedLocationFromProfile(restaurantProfile));
  const secondRepository = new FileLocationRepository(filePath, secondProfile.id, seedLocationFromProfile(secondProfile));

  assert.notEqual(locationIdForProfile(restaurantProfile.id), locationIdForProfile(secondProfile.id));
  await firstRepository.ensureSeeded();
  assert.deepEqual((await secondRepository.listLocations()), []);
  await secondRepository.ensureSeeded();
  assert.deepEqual((await firstRepository.listLocations()).map((location) => location.profileId), [restaurantProfile.id]);
  assert.deepEqual((await secondRepository.listLocations()).map((location) => location.profileId), [secondProfile.id]);
});

test('location repositories require explicit profile context and do not fall back to Casablanca', () => {
  assert.throws(() => new FileLocationRepository(undefined, ''), /profile ID is required/);
});
