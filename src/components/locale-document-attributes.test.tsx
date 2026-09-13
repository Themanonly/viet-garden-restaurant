import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { getDocumentDirection } from './locale-document-attributes';

test('document direction follows the active locale', () => {
  assert.equal(getDocumentDirection('fr'), 'ltr');
  assert.equal(getDocumentDirection('en'), 'ltr');
  assert.equal(getDocumentDirection('ar'), 'rtl');
});