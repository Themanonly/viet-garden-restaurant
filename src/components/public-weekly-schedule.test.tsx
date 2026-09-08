import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MenuAvailability } from '../content/menu';
import { PublicWeeklySchedule } from './public-weekly-schedule';

const mockAvailability: MenuAvailability = {
  status: 'open',
  schedule: {
    monday: [{ opensAt: '13:00', closesAt: '22:15' }],
    tuesday: [{ opensAt: '13:00', closesAt: '22:15' }],
    wednesday: [{ opensAt: '13:00', closesAt: '22:15' }],
    thursday: [{ opensAt: '13:00', closesAt: '22:15' }],
    friday: [{ opensAt: '13:00', closesAt: '22:15' }],
    saturday: [{ opensAt: '13:00', closesAt: '22:15' }],
    sunday: [],
  },
  temporaryClosure: { active: false, message: {} },
  manualOverride: 'open',
  statusMessage: {},
};

test('PublicWeeklySchedule renders all seven days and opening times in FR', () => {
  const markup = renderToStaticMarkup(<PublicWeeklySchedule availability={mockAvailability} locale="fr" />);
  assert.match(markup, /Lundi/);
  assert.match(markup, /Mardi/);
  assert.match(markup, /Mercredi/);
  assert.match(markup, /Jeudi/);
  assert.match(markup, /Vendredi/);
  assert.match(markup, /Samedi/);
  assert.match(markup, /Dimanche/);
  assert.match(markup, /13:00 – 22:15/);
  assert.match(markup, /Fermé/);
});

test('PublicWeeklySchedule renders localized day labels and closed state in EN', () => {
  const markup = renderToStaticMarkup(<PublicWeeklySchedule availability={mockAvailability} locale="en" />);
  assert.match(markup, /Monday/);
  assert.match(markup, /Sunday/);
  assert.match(markup, /Closed/);
});

test('PublicWeeklySchedule renders localized Arabic labels in AR', () => {
  const markup = renderToStaticMarkup(<PublicWeeklySchedule availability={mockAvailability} locale="ar" />);
  assert.match(markup, /الإثنين/);
  assert.match(markup, /الأحد/);
  assert.match(markup, /مغلق/);
});
