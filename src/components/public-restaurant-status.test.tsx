import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MenuAvailability } from '../content/menu';
import { getEffectiveMenuStatus } from '../content/menu-validation';
import { PublicRestaurantStatus } from './public-restaurant-status';

const baseline: MenuAvailability = {
  status: 'open',
  schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
  temporaryClosure: { active: false, message: {} },
  manualOverride: 'open',
  statusMessage: {},
};

test('public status renders localized effective status and message', () => {
  const markup = renderToStaticMarkup(<PublicRestaurantStatus availability={{ ...baseline, statusMessage: { fr: 'Message FR', en: 'Message EN', ar: 'رسالة عربية' } }} locale="en" />);
  assert.match(markup, /OPEN/);
  assert.match(markup, /Message EN/);
});

test('temporary closure takes precedence and renders Arabic copy', () => {
  const markup = renderToStaticMarkup(<PublicRestaurantStatus availability={{ ...baseline, temporaryClosure: { active: true, message: { fr: 'Fermeture', en: 'Closed for testing', ar: 'إغلاق مؤقت للاختبار' } } }} locale="ar" />);
  assert.match(markup, /مغلق/);
  assert.match(markup, /إغلاق مؤقت/);
  assert.match(markup, /إغلاق مؤقت للاختبار/);
});

test('effective status preserves manual, closure, schedule, and fallback precedence', () => {
  assert.equal(getEffectiveMenuStatus({ ...baseline, status: 'closed', manualOverride: 'open' }), 'open');
  assert.equal(getEffectiveMenuStatus({ ...baseline, temporaryClosure: { active: true, message: { fr: 'Fermeture', en: 'Closed', ar: 'مغلق' } } }), 'closed');
  assert.equal(getEffectiveMenuStatus({ ...baseline, manualOverride: 'none', schedule: { ...baseline.schedule, monday: [{ opensAt: '00:00', closesAt: '23:59' }] } }, new Date(2024, 0, 1, 12, 0)), 'open');
  assert.equal(getEffectiveMenuStatus({ ...baseline, status: 'closed', manualOverride: 'none' }), 'closed');
});