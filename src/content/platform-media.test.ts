import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePlatformMedia, socialIconFallback } from './platform-media';
import type { MediaAsset } from './models';

const asset: MediaAsset = { id: 'uploaded-icon', type: 'image', source: 'remote', reference: 'https://example.test/icon.png', alt: {}, visible: true, sortOrder: 0 };
test('Social and Ordering share repository asset resolution and missing-media fallback', () => {
  assert.equal(resolvePlatformMedia([asset], 'uploaded-icon'), asset);
  assert.equal(resolvePlatformMedia([asset], 'deleted'), undefined);
  assert.equal(resolvePlatformMedia([asset]), undefined);
  assert.equal(resolvePlatformMedia([{ ...asset, visible: false }], asset.id), undefined);
  assert.equal(resolvePlatformMedia([{ ...asset, type: 'video' }], asset.id), undefined);
});
test('legacy icon names resolve to glyphs and custom legacy icons remain supported', () => {
  assert.equal(socialIconFallback('facebook', 'facebook'), 'f');
  assert.equal(socialIconFallback('instagram'), '◎');
  assert.equal(socialIconFallback('custom', '★'), '★');
});
