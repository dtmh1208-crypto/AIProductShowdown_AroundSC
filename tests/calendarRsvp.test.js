import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { getCalendarCampusEvents, updateRsvps, filterEvents } from '../src/utils/eventDiscovery.js';
import { loadShowcaseRsvps, SHOWCASE_RSVP_KEY } from '../src/utils/rsvpStorage.js';
import { todayAtCampus, addDays } from '../src/utils/personalCalendar.js';
import { hasCalendarEventsInPeriod, timeGridModel, positionTimedEvents } from '../src/utils/calendarLayout.js';
import { campusTimeToIso, checkCalendarConflict } from '../src/utils/calendar.js';
import { parseDiscoveryRequest } from '../src/utils/discoveryParser.js';
const date = todayAtCampus();
const attending = Object.freeze({ id: 'campus-attending', title: 'RSVP_CAMPUS_TITLE', organizer: 'Test organizer', description: 'Technology meetup', tags: ['AI'], room: '', category: 'Academic', location: { name: 'Existing location', code: 'DML' }, startTime: campusTimeToIso(date, 10), endTime: campusTimeToIso(date, 11, 30) });
const notAttending = Object.freeze({ ...attending, id: 'campus-not-attending', title: 'UNRSVP_CAMPUS_TITLE' });
const campus = Object.freeze([attending, notAttending]);
const personal = Object.freeze({ id: 'personal-private', uid: 'private-uid', kind: 'personal', title: 'PRIVATE_PERSONAL_TITLE', allDay: false, busy: true, startTime: campusTimeToIso(date, 10, 30), endTime: campusTimeToIso(date, 11), location: 'Private location', sourceName: 'calendar.ics', sourceUrl: '' });
const empty = { events: [], continued: true, remember: false, useMock: false };

test('calendar selection uses only stable RSVP IDs, retains source identity and rejects duplicate representations', () => {
  assert.deepEqual(getCalendarCampusEvents(campus, []), []);
  const sameTitle = { ...notAttending, title: attending.title };
  const result = getCalendarCampusEvents([attending, sameTitle, attending], [attending.id, attending.id, 'not-in-dataset']);
  assert.deepEqual(result, [attending]); assert.equal(result[0], attending);
  assert.equal(campus.length, 2);
});
test('real RSVP add/remove helpers immediately produce updated calendar membership and survive storage reload', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null };
  const aliases = { sample: {}, verified: {} };
  let ids = loadShowcaseRsvps(storage, aliases); assert.deepEqual(ids, []);
  ids = updateRsvps(ids, attending.id, true); ids = updateRsvps(ids, attending.id, true);
  assert.deepEqual(getCalendarCampusEvents(campus, ids), [attending]);
  values.set(SHOWCASE_RSVP_KEY, JSON.stringify(ids));
  assert.deepEqual(getCalendarCampusEvents(campus, loadShowcaseRsvps(storage, aliases)), [attending]);
  ids = updateRsvps(ids, attending.id, false); assert.deepEqual(getCalendarCampusEvents(campus, ids), []);
  values.set(SHOWCASE_RSVP_KEY, JSON.stringify(ids)); assert.deepEqual(loadShowcaseRsvps(storage, aliases), []);
});
test('filtered campus records retain correct time positions and conflict only when present on the calendar', () => {
  const selected = getCalendarCampusEvents(campus, [attending.id]);
  const positioned = positionTimedEvents(selected, timeGridModel(date, 'day').days[0]);
  assert.equal(positioned.length, 1); assert.equal(positioned[0].event, attending); assert.equal(positioned[0].top, 640); assert.equal(positioned[0].height, 96);
  assert.equal(checkCalendarConflict(selected[0], [personal]).hasConflict, true);
  assert.deepEqual(getCalendarCampusEvents(campus, []).map((event) => checkCalendarConflict(event, [personal])), []);
});
test('discovery still contains un-RSVPd events and NLP does not receive personal commitments', () => {
  assert.deepEqual(filterEvents(campus, { rsvpIds: [attending.id] }), campus);
  const parsed = parseDiscoveryRequest(`Find academic events on ${date}`);
  const results = filterEvents(campus, { discovery: parsed, rsvpIds: [] });
  assert.ok(results.includes(notAttending)); assert.ok(!results.includes(personal));
});
test('period empty detection includes personal-only, cross-midnight and all-day events in every supported view', () => {
  for (const view of ['day', 'week', 'month', 'year']) {
    assert.equal(hasCalendarEventsInPeriod([], date, view), false);
    assert.equal(hasCalendarEventsInPeriod([personal], date, view), true);
    assert.equal(hasCalendarEventsInPeriod([attending], date, view), true);
  }
  const nextDay = addDays(date, 1);
  assert.equal(hasCalendarEventsInPeriod([{ ...personal, allDay: true, startTime: date, endTime: nextDay }], nextDay, 'day'), false);
  assert.equal(hasCalendarEventsInPeriod([{ ...personal, startTime: campusTimeToIso(date, 23), endTime: campusTimeToIso(nextDay, 1) }], nextDay, 'day'), true);
  assert.equal(hasCalendarEventsInPeriod([{ ...attending, startTime: campusTimeToIso(addDays(date, 400), 10), endTime: campusTimeToIso(addDays(date, 400), 11) }], date, 'year'), false);
});
let server, CalendarView, DiscoverPage;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ CalendarView } = await server.ssrLoadModule('/src/components/CalendarView.jsx'));
  ({ DiscoverPage } = await server.ssrLoadModule('/src/components/DiscoverPage.jsx'));
});
after(async () => server?.close());
const render = (props) => renderToStaticMarkup(React.createElement(CalendarView, { events: campus, calendarState: empty, ...props }));
function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }

test('all four rendered calendar views omit un-RSVPd campus records, include personal data and update from new RSVP props', () => {
  for (const view of ['day', 'week', 'month', 'year']) {
    const props = { initialView: view, calendarState: { ...empty, events: [personal] } };
    const before = render({ ...props, rsvpIds: [] });
    assert.ok(!before.includes(attending.title)); assert.ok(!before.includes(notAttending.title)); assert.ok(before.includes(personal.title)); assert.ok(!before.includes('Your schedule is yours to build'));
    const after = render({ ...props, rsvpIds: [attending.id, attending.id] });
    assert.ok(after.includes(attending.title)); assert.ok(!after.includes(notAttending.title)); assert.ok(after.includes(personal.title)); assert.ok(after.includes('1 RSVP’d campus events'));
    assert.ok(!render({ ...props, rsvpIds: [] }).includes(attending.title));
  }
});
test('empty periods offer a discovery link; personal-only and RSVP-only schedules suppress the empty state', () => {
  for (const view of ['day', 'week', 'month', 'year']) {
    const html = render({ initialView: view, rsvpIds: [] }); assert.ok(html.includes('Your schedule is yours to build')); assert.ok(html.includes('href="/discover"')); assert.ok(html.includes('Explore events'));
    assert.ok(!render({ initialView: view, rsvpIds: [attending.id] }).includes('Your schedule is yours to build'));
  }
  const noConnectionYet = render({ rsvpIds: [attending.id], calendarState: { ...empty, continued: false } });
  assert.ok(noConnectionYet.includes('Week hourly calendar')); assert.ok(noConnectionYet.includes(attending.title));
});
test('DiscoverPage passes live RSVP state to the calendar and Explore events selects the existing discovery list', () => {
  let mode;
  const props = { viewMode: 'calendar', activeEvents: campus, filteredEvents: campus, rsvpIds: [attending.id], calendarState: empty, setViewMode: (value) => { mode = value; } };
  const tree = DiscoverPage(props);
  const calendar = nodes(tree).find((node) => node.type === CalendarView);
  assert.equal(calendar.props.rsvpIds, props.rsvpIds); assert.equal(calendar.props.events, campus);
  calendar.props.onExploreEvents(); assert.equal(mode, 'list');
  const changed = nodes(DiscoverPage({ ...props, rsvpIds: [] })).find((node) => node.type === CalendarView);
  assert.deepEqual(changed.props.rsvpIds, []);
});
