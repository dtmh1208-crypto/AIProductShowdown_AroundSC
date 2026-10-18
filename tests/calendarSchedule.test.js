import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { composeCalendarSchedule, mockCalendarOccurrences } from '../src/utils/calendarSchedule.js';
import { loadPersonalCalendar, savePersonalCalendar, parseIcs, isImportedCampusOccurrence, PERSONAL_CALENDAR_KEY } from '../src/utils/personalCalendar.js';
import { getIcsContent, checkCalendarConflict, campusTimeToIso } from '../src/utils/calendar.js';
import { updateRsvps, filterEvents } from '../src/utils/eventDiscovery.js';
import { loadShowcaseRsvps, SHOWCASE_RSVP_KEY } from '../src/utils/rsvpStorage.js';
import { timeGridModel } from '../src/utils/calendarLayout.js';
import { MOCK_STUDENT_SCHEDULE } from '../src/data/mockSchedule.js';
const campus = Object.freeze({ id: 'saved-occurrence', title: 'Original campus engagement', organizer: 'Original organizer', description: 'Original description', category: 'Academic', tags: ['AI'], sourceUrl: 'https://calendar.usc.edu/event/test-fixture', registrationUrl: 'https://example.test/register', eligibility: 'Original eligibility', admission: 'Original admission', location: Object.freeze({ name: 'Existing fixture venue', code: 'DML' }), room: 'Original room', startTime: '2026-10-20T17:00:00.123Z', endTime: '2026-10-20T18:30:00.123Z' });
const untouched = Object.freeze({ ...campus, id: 'discovery-only', title: 'Discovery-only record' });
const savedImport = Object.freeze(parseIcs(getIcsContent(campus), 'existing-engagement.ics').events[0]);
const privateCommitment = Object.freeze({ ...savedImport, id: 'personal-original', uid: 'independent-personal-uid', title: 'Independent personal commitment' });
const storage = () => {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};

test('previously saved imported engagement survives load and composition without any storage rewrite', () => {
  const local = storage();
  const originalState = { events: [savedImport, privateCommitment], remember: true, continued: true, useMock: false };
  savePersonalCalendar(local, originalState);
  const before = local.values.get(PERSONAL_CALENDAR_KEY);
  const loaded = loadPersonalCalendar(local);
  const result = composeCalendarSchedule([campus, untouched], [], loaded.events);
  assert.equal(result.items.length, 2); assert.ok(result.items.includes(campus)); assert.ok(result.savedIds.has(campus.id));
  assert.equal(result.campusEvents[0], campus); assert.equal(result.campusEvents[0].eligibility, 'Original eligibility');
  assert.deepEqual(loaded.events, originalState.events); assert.equal(local.values.get(PERSONAL_CALENDAR_KEY), before);
});
test('new RSVP adds a record, persists through the existing RSVP mechanism, and never adds unrelated campus records', () => {
  const local = storage(), aliases = { sample: {}, verified: {} };
  let ids = updateRsvps([], untouched.id, true);
  local.setItem(SHOWCASE_RSVP_KEY, JSON.stringify(ids)); ids = loadShowcaseRsvps(local, aliases);
  assert.deepEqual(composeCalendarSchedule([campus, untouched], ids, []).items, [untouched]);
  ids = updateRsvps(ids, untouched.id, false);
  assert.deepEqual(composeCalendarSchedule([campus, untouched], ids, []).items, []);
});
test('cancelling RSVP removes only that source; independently imported campus and personal engagements remain', () => {
  const personal = [savedImport, privateCommitment];
  const ids = updateRsvps([campus.id, untouched.id], campus.id, false);
  const result = composeCalendarSchedule([campus, untouched], ids, personal);
  assert.equal(result.items.length, 3); assert.ok(result.items.includes(campus)); assert.ok(result.items.includes(privateCommitment));
  assert.equal(result.rsvpCount, 1); assert.equal(personal[0], savedImport);
  const noImport = composeCalendarSchedule([campus, untouched], ids, [privateCommitment]);
  assert.ok(!noImport.items.includes(campus)); assert.ok(noImport.items.includes(privateCommitment));
});
test('the same campus occurrence from import and RSVP is displayed once using its original campus metadata', () => {
  const result = composeCalendarSchedule([campus, campus, untouched], [campus.id, campus.id], [savedImport, savedImport]);
  assert.deepEqual(result.items, [campus]); assert.equal(result.rsvpCount, 1); assert.equal(result.savedIds.size, 1);
  assert.equal(result.items[0].registrationUrl, campus.registrationUrl); assert.equal(savedImport.uid, `${campus.id}@aroundsc.local`);
  assert.ok(isImportedCampusOccurrence(savedImport, campus)); // includes the export's known whole-second precision
});
test('title equality, a different UID, or a changed occurrence interval never merges independent commitments', () => {
  for (const record of [{ ...privateCommitment, title: campus.title }, { ...savedImport, endTime: '2026-10-20T19:00:00Z' }, { ...savedImport, uid: `${untouched.id}@aroundsc.local` }]) {
    assert.equal(isImportedCampusOccurrence(record, campus), false);
    const result = composeCalendarSchedule([campus], [campus.id], [record]); assert.equal(result.items.length, 2); assert.ok(result.items.includes(record));
  }
});
test('missing historical campus records fall back to original imported metadata; IDs alone do not invent records', () => {
  assert.deepEqual(composeCalendarSchedule([], [campus.id], []).items, []);
  assert.deepEqual(composeCalendarSchedule([], [], [savedImport]).items, [savedImport]);
  const changed = { ...campus, startTime: '2026-10-21T17:00:00Z', endTime: '2026-10-21T18:30:00Z' };
  assert.deepEqual(composeCalendarSchedule([changed], [], [savedImport]).items, [savedImport]);
});
test('an imported copy does not conflict with itself, while genuine personal overlaps still warn', () => {
  assert.equal(checkCalendarConflict(campus, [savedImport]).hasConflict, false);
  const result = checkCalendarConflict(campus, [savedImport, privateCommitment]);
  assert.equal(result.hasConflict, true); assert.equal(result.conflicts.length, 1); assert.equal(result.conflictingClass.uid, privateCommitment.uid);
});
test('legacy RSVP cancellation remains authoritative and discovery still exposes the full campus collection', () => {
  const local = storage(); local.setItem(SHOWCASE_RSVP_KEY, '[]'); local.setItem('aroundsc_rsvps', JSON.stringify([untouched.id]));
  const ids = loadShowcaseRsvps(local, { sample: {}, verified: {} }); assert.deepEqual(ids, []);
  assert.deepEqual(composeCalendarSchedule([campus, untouched], ids, []).items, []);
  assert.deepEqual(filterEvents([campus, untouched]), [campus, untouched]);
});
test('mock occurrences derive only from existing weekly rules, independent of RSVP, with stable rule/date IDs', () => {
  const events = mockCalendarOccurrences(MOCK_STUDENT_SCHEDULE, '2026-10-20', 'week');
  assert.equal(events.length, 8); assert.ok(events.every((event) => event.kind === 'mock' && MOCK_STUDENT_SCHEDULE.some((block) => event.mockRuleId === block.id)));
  const tuesday = mockCalendarOccurrences(MOCK_STUDENT_SCHEDULE, '2026-10-20', 'day');
  assert.equal(tuesday.length, 1); assert.equal(tuesday[0].mockRuleId, 'buad-304'); assert.equal(tuesday[0].startTime, campusTimeToIso('2026-10-20', 10));
  assert.equal(tuesday[0].endTime, campusTimeToIso('2026-10-20', 11, 50));
  assert.deepEqual(mockCalendarOccurrences(MOCK_STUDENT_SCHEDULE, '2026-10-18', 'day'), []);
});
let server, CalendarView, CalendarTimeGrid, CalendarMonth;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ CalendarView, CalendarMonth } = await server.ssrLoadModule('/src/components/CalendarView.jsx'));
  ({ CalendarTimeGrid } = await server.ssrLoadModule('/src/components/CalendarTimeView.jsx'));
});
after(async () => server?.close());
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test('all calendar views retain a saved campus import independently of RSVP while hiding discovery-only records', () => {
  for (const view of ['day', 'week', 'month', 'year']) {
    const html = render(CalendarView, { events: [campus, untouched], rsvpIds: [], calendarState: { events: [savedImport, privateCommitment], continued: true, remember: true, useMock: false }, initialView: view });
    assert.ok(html.includes('1 saved campus imports')); assert.ok(!html.includes(untouched.title));
    assert.ok(html.includes('Day')); assert.ok(html.includes('Week')); assert.ok(html.includes('Month'));
  }
});
test('enabled mock rules render explicitly labeled calendar entries; disabled rules do not appear', () => {
  const props = { events: [], rsvpIds: [], calendarState: { events: [], continued: true, remember: false, useMock: false }, initialView: 'week' };
  assert.ok(!render(CalendarView, props).includes('Data Structures &amp; Object-Oriented Design'));
  const enabled = render(CalendarView, { ...props, calendarState: { ...props.calendarState, useMock: true } });
  assert.ok(enabled.includes('Data Structures &amp; Object-Oriented Design')); assert.ok(enabled.includes('Mock class:')); assert.ok(enabled.includes('Mock class · demo only'));
});
test('Day/Week and Month mock buttons select their existing labeled rule, without masquerading as campus or personal events', () => {
  const items = mockCalendarOccurrences(MOCK_STUDENT_SCHEDULE, '2026-10-20', 'day');
  const now = new Date('2026-10-20T17:00:00Z'), calls = [];
  const html = render(CalendarTimeGrid, { model: timeGridModel('2026-10-20', 'day'), items, now, selectedDate: '2026-10-20', onDate: () => {}, onEvent: () => {} });
  assert.ok(html.includes('Mock class: CSCI') === false); assert.ok(html.includes('Mock class: BUAD 304'));
  const month = CalendarMonth({ month: '2026-10', selectedDate: '2026-10-20', today: '2026-10-20', items, schedule: MOCK_STUDENT_SCHEDULE, showHeader: false, onDate: () => {}, onEvent: (event) => calls.push(event) });
  function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  const button = nodes(month).find((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Mock class:'));
  button.props.onClick(); assert.equal(calls[0], items[0]); assert.equal(button.props.className.includes('mock'), true);
});
