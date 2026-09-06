import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AdminUiManagementStateDto } from '../content/admin-menu-ui-adapter';
import { AdminApplicationError } from '../content/admin-menu-service';
import { LocalizedFieldGroup } from './localized-field-group';
import { getFieldErrors, getStatusLabel, getStatusRule, saveAvailability } from './restaurant-status-editor';
import { ScheduleEditor, weekdays } from './schedule-editor';

const baseState: AdminUiManagementStateDto = {
  availability: {
    status: 'open',
    schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
    temporaryClosure: { active: false, message: { fr: '', en: '', ar: '' } },
    manualOverride: 'open',
    statusMessage: { fr: '', en: '', ar: '' },
  },
  effectiveStatus: 'open',
  categories: [],
  items: [],
  featuredSections: [],
};

test('current status and determining rule use the returned management state', () => {
  assert.equal(getStatusLabel(baseState.effectiveStatus), 'OPEN');
  assert.equal(getStatusRule(baseState), 'Manual override');
});

test('status rule honors temporary closure, schedule, and explicit fallback precedence', () => {
  assert.equal(getStatusRule({ ...baseState, availability: { ...baseState.availability, temporaryClosure: { active: true, message: {} } } }), 'Temporary closure');
  assert.equal(getStatusRule({ ...baseState, availability: { ...baseState.availability, manualOverride: 'none', schedule: { ...baseState.availability.schedule, monday: [{ opensAt: '09:00', closesAt: '17:00' }] } } }), 'Weekly schedule');
  assert.equal(getStatusRule({ ...baseState, availability: { ...baseState.availability, manualOverride: 'none' } }), 'Explicit fallback');
});

test('manual override and all seven schedule days render', () => {
  assert.equal(baseState.availability.manualOverride, 'open');
  assert.equal(weekdays.length, 7);
  const markup = renderToStaticMarkup(<ScheduleEditor schedule={baseState.availability.schedule} errors={{}} onChange={() => undefined} />);
  assert.match(markup, /Monday/);
  assert.match(markup, /Sunday/);
});

test('multiple periods are represented and empty days remain empty', () => {
  const schedule = { ...baseState.availability.schedule, monday: [{ opensAt: '09:00', closesAt: '12:00' }, { opensAt: '13:00', closesAt: '18:00' }] };
  const markup = renderToStaticMarkup(<ScheduleEditor schedule={schedule} errors={{}} onChange={() => undefined} />);
  assert.equal((markup.match(/type="time"/g) ?? []).length, 4);
  assert.match(markup, /Tuesday/);
  assert.match(markup, /No periods/);
  assert.doesNotMatch(markup, /08:00/);
});

test('temporary closure and status message expose FR, EN, and AR fields', () => {
  const markup = renderToStaticMarkup(<LocalizedFieldGroup id="statusMessage" label="Status message" value={{ fr: '', en: '', ar: '' }} errors={{}} onChange={() => undefined} />);
  assert.match(markup, />FR</);
  assert.match(markup, />EN</);
  assert.match(markup, />AR</);
  assert.match(markup, /dir="rtl"/);
});

test('structured field paths map to inline field keys without parsing messages', () => {
  const error = new AdminApplicationError({ code: 'invalid-menu', message: 'Validation failed', resource: 'availability', fields: [{ code: 'invalid-availability', message: 'Opening time is invalid', path: 'schedule.monday[0].opens' }, { code: 'missing-translation', message: 'Arabic is required', path: 'temporaryClosure.message.ar' }] });
  assert.deepEqual(getFieldErrors(error), { 'schedule.monday[0].opens': ['Opening time is invalid'], 'temporaryClosure.message.ar': ['Arabic is required'] });
});

test('save delegates to AdminMenuUiAdapter.updateAvailability', async () => {
  let received;
  const expected = { ...baseState, effectiveStatus: 'closed' as const };
  let reread = 0;
  const adapter = { updateAvailability: async (availability: typeof baseState.availability) => { received = availability; return expected; }, getManagementState: async () => { reread += 1; return expected; } } as never;
  const result = await saveAvailability(adapter, baseState.availability);
  assert.equal(received, baseState.availability);
  assert.equal(reread, 1);
  assert.equal(result, expected);
});