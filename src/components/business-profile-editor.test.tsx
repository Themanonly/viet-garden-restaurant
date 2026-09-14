import assert from 'node:assert/strict';
import test from 'node:test';
import { businessInformationEditableFields, businessInformationLocationHref } from './business-profile-editor';

test('Business Information sends address management to the dedicated Locations page', () => {
  assert.equal(businessInformationLocationHref, '/admin/locations');
  assert.deepEqual(businessInformationEditableFields, ['name', 'description']);
});