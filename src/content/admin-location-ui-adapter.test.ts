import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveLocationProfileId } from './admin-location-ui-adapter';
import { restaurantProfile } from './restaurant';

test('location admin composition resolves the supplied active profile, not the seed profile', async () => {
  const suppliedProfile = { ...restaurantProfile, id: 'profile-from-repository' };
  const profileId = await resolveActiveLocationProfileId({ getProfile: async () => suppliedProfile, replaceProfile: async () => undefined });
  assert.equal(profileId, 'profile-from-repository');
  assert.notEqual(profileId, restaurantProfile.id);
});