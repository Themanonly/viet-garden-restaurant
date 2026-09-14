import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocationFieldErrors } from './locations-manager';
import type { AdminUiError } from '../content/admin-menu-ui-adapter';

function error(fields: { path: string; message: string }[]): AdminUiError {
  return Object.assign(new Error('Location validation failed'), { info: { code: 'location-validation-failed', message: 'Location validation failed', resource: 'location', fields } }) as AdminUiError;
}

test('location editor maps structured paths to inline fields without parsing messages', () => {
  assert.deepEqual(getLocationFieldErrors(error([
    { path: 'locations[0].name.fr', message: 'French name required' },
    { path: 'locations[0].address.ar', message: 'Arabic address required' },
    { path: 'locations[0].googleMapsUrl', message: 'Maps URL invalid' },
  ])), {
    'name.fr': ['French name required'],
    'address.ar': ['Arabic address required'],
    googleMapsUrl: ['Maps URL invalid'],
  });
});
