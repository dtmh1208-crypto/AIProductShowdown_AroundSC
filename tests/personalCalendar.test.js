import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { parseIcs, wallTimeToIso, readCalendarFile, mergePersonalEvents, monthCells, shiftMonth, occursOn, loadPersonalCalendar, savePersonalCalendar, PERSONAL_CALENDAR_KEY, formatPersonalTime, persistCalendarChange } from '../src/utils/personalCalendar.js';
import { checkCalendarConflict, getIcsContent } from '../src/utils/calendar.js';
import { filterEvents, getRsvpAction } from '../src/utils/eventDiscovery.js';
const wrap = (...events) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
const timed = (extra = '', uid = 'personal-1') => `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTART;TZID=America/Los_Angeles:20261020T150000\r\nDTEND;TZID=America/Los_Angeles:20261020T160000\r\nSUMMARY:Study\\, then coffee\r\nLOCATION:Library\\; Room 1\r\nURL:https://example.test/calendar\r\n${extra}\r\nEND:VEVENT`;
const allDay = `BEGIN:VEVENT\r\nUID:all-day\r\nDTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261023\r\nSUMMARY:Personal trip\r\nEND:VEVENT`;
const parsed = () => parseIcs(wrap(timed(), allDay), 'my-calendar.ics');
const campus = { id: 'campus-1', title: 'Campus talk', startTime: '2026-10-20T22:30:00Z', endTime: '2026-10-20T23:30:00Z', location: { name: 'Existing venue', code: 'DML' }, tags: [], category: 'Academic', organizer: 'Organizer', description: 'Description', room: '' };

test('multiple events preserve UID, title escapes, location, source and timezone instants', () => {
  const { events, warnings } = parsed(); assert.equal(events.length, 2); assert.equal(warnings.length, 0);
  assert.equal(events[0].startTime, '2026-10-20T22:00:00.000Z');
  assert.equal(events[0].title, 'Study, then coffee'); assert.equal(events[0].location, 'Library; Room 1');
  assert.equal(events[0].sourceUrl, 'https://example.test/calendar'); assert.equal(events[0].sourceName, 'my-calendar.ics'); assert.equal(events[0].uid, 'personal-1');
  assert.ok(formatPersonalTime(events[0]).includes('PDT'));
});
test('UTC, floating times, quoted TZID and folded Unicode text parse without device timezone dependence', () => {
  const utc = timed().replace('DTSTART;TZID=America/Los_Angeles:20261020T150000', 'DTSTART:20261020T220000Z').replace('DTEND;TZID=America/Los_Angeles:20261020T160000','DTEND:20261020T230000Z').replace('Study\\, then coffee', 'Résumé and\r\n  community');
  const result = parseIcs(wrap(utc)); assert.equal(result.events[0].title, 'Résumé and community'); assert.equal(result.events[0].startTime, parsed().events[0].startTime);
  const floating = parseIcs(wrap(timed().replaceAll(';TZID=America/Los_Angeles', ''))); assert.equal(floating.events[0].startTime, result.events[0].startTime); assert.match(floating.warnings[0], /Floating/);
  assert.equal(parseIcs(wrap(timed().replaceAll('TZID=America/Los_Angeles','TZID="America/New_York"'))).events[0].startTime, '2026-10-20T19:00:00.000Z');
});
test('invalid, empty, malformed, oversized and unreadable files give useful errors', async () => {
  for (const text of ['', 'not a calendar', 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VCALENDAR', wrap()]) assert.throws(() => parseIcs(text));
  await assert.rejects(readCalendarFile({ name: 'bad.txt', size: 1 }), /\.ics/);
  await assert.rejects(readCalendarFile({ name: 'bad.ics', size: 0 }), /empty/);
  await assert.rejects(readCalendarFile({ name: 'big.ics', size: 600000 }), /512 KB/);
  await assert.rejects(readCalendarFile({ name: 'bad.ics', size: 20, text: async () => { throw Error('read'); } }), /could not be read/);
  assert.equal((await readCalendarFile({ name: 'good.ics', size: 500, text: async () => wrap(timed(), allDay) })).events.length, 2);
});
test('invalid dates, missing ends, inconsistent types and unknown zones are skipped visibly', () => {
  for (const text of [timed().replace('20261020T150000', '20260230T150000'), timed().replace('20261020T150000', '20261020T250000'), timed().replace(/DTEND[^\r]+\r\n/, ''), timed().replaceAll('America/Los_Angeles', 'Custom/Unsupported'), timed().replace('DTEND;TZID=America/Los_Angeles:20261020T160000', 'DTEND;VALUE=DATE:20261021')]) {
    const result = parseIcs(wrap(text)); assert.equal(result.events.length, 0); assert.ok(result.warnings.length);
  }
});
test('recurrence, overrides and cancelled events are never imported as reliable single commitments', () => {
  for (const extra of ['RRULE:FREQ=WEEKLY;COUNT=5', 'RECURRENCE-ID:20261020T220000Z', 'RDATE:20261021T220000Z', 'EXDATE:20261021T220000Z', 'STATUS:CANCELLED']) {
    const result = parseIcs(wrap(timed(extra))); assert.equal(result.events.length, 0); assert.ok(result.warnings.length);
  }
});
test('DST gaps and repeated times are rejected; actual summer and winter offsets resolve', () => {
  assert.throws(() => wallTimeToIso('2026-03-08', '02:30:00'), /daylight/);
  assert.throws(() => wallTimeToIso('2026-11-01', '01:30:00'), /daylight/);
  assert.equal(wallTimeToIso('2026-07-01', '15:00:00'), '2026-07-01T22:00:00.000Z');
  assert.equal(wallTimeToIso('2026-12-01', '15:00:00'), '2026-12-01T23:00:00.000Z');
});
test('one-day all-day defaults, exclusive end and duration semantics are explicit', () => {
  const one = parseIcs(wrap(allDay.replace('DTEND;VALUE=DATE:20261023\r\n', ''))).events[0];
  assert.equal(one.endTime, '2026-10-22'); assert.equal(occursOn(one, '2026-10-21'), true); assert.equal(occursOn(one, '2026-10-22'), false);
  const duration = parseIcs(wrap(timed().replace('DTEND;TZID=America/Los_Angeles:20261020T160000', 'DURATION:PT1H'))).events[0]; assert.equal(duration.endTime, parsed().events[0].endTime);
});
test('duplicate imports deduplicate; additive imports preserve existing; explicit replacement replaces only personal records', () => {
  const original = parsed().events, incoming = parseIcs(wrap(timed('', 'another'))).events;
  const unchanged = JSON.stringify(original);
  const merged = mergePersonalEvents(original, [...original, ...incoming]); assert.equal(merged.duplicates, 2); assert.equal(merged.events.length, 3);
  assert.equal(JSON.stringify(original), unchanged);
  assert.equal(mergePersonalEvents(original, incoming, true).events.length, 1);
  const noUid = timed().replace('UID:personal-1\r\n', ''); assert.equal(parseIcs(wrap(noUid, noUid)).events.length, 1);
});
test('preview and cancellation have no side effects; storage only changes on explicit save', () => {
  const data = new Map([['aroundsc_showcase_rsvps', '["campus-1"]']]);
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  assert.equal(loadPersonalCalendar(storage).continued, false);
  parsed(); assert.equal(data.has(PERSONAL_CALENDAR_KEY), false);
  const state = { events: parsed().events, continued: true, remember: true, useMock: false };
  savePersonalCalendar(storage, state); assert.deepEqual(loadPersonalCalendar(storage), state);
  savePersonalCalendar(storage, { ...state, remember: false }); assert.equal(data.has(PERSONAL_CALENDAR_KEY), false); assert.equal(data.get('aroundsc_showcase_rsvps'), '["campus-1"]');
  data.set(PERSONAL_CALENDAR_KEY, '{broken'); assert.throws(() => loadPersonalCalendar(storage)); assert.equal(data.get(PERSONAL_CALENDAR_KEY), '{broken');
  assert.throws(() => savePersonalCalendar({ setItem: () => { throw Error('quota'); } }, state), /quota/);
});
test('partial, contained and containing overlaps are detected; adjacent and same-day non-overlaps are not', () => {
  const personal = parsed().events[0];
  for (const [start, end, expected] of [['21:30','22:30',true], ['22:15','22:45',true], ['21:00','23:30',true], ['23:00','23:30',false], ['21:00','22:00',false], ['18:00','19:00',false]]) {
    const event = { ...campus, startTime: `2026-10-20T${start}:00Z`, endTime: `2026-10-20T${end}:00Z` };
    assert.equal(checkCalendarConflict(event, [personal]).hasConflict, expected, `${start}-${end}`);
  }
  assert.match(checkCalendarConflict(campus, [personal]).details, /Study, then coffee/);
});
test('all-day commitments cover campus days with exclusive end; transparent or invalid events never block', () => {
  const personal = parsed().events[1];
  assert.equal(checkCalendarConflict({ ...campus, startTime: '2026-10-22T19:00:00Z', endTime: '2026-10-22T20:00:00Z' }, [personal]).hasConflict, true);
  assert.equal(checkCalendarConflict({ ...campus, startTime: '2026-10-23T07:00:00Z', endTime: '2026-10-23T08:00:00Z' }, [personal]).hasConflict, false);
  assert.equal(checkCalendarConflict(campus, [{ ...parsed().events[0], busy: false }]).hasConflict, false);
  assert.equal(checkCalendarConflict(campus, [{ ...parsed().events[0], endTime: 'bad' }]).hasConflict, false);
});
test('shared discovery filters and RSVP decisions use personal conflicts without exposing personal results', () => {
  const personal = parsed().events;
  assert.equal(filterEvents([campus], { hideConflicts: true, schedule: personal }).length, 0);
  assert.deepEqual(filterEvents([campus], { schedule: personal }), [campus]);
  assert.equal(getRsvpAction(campus, [], personal), 'conflict'); assert.equal(getRsvpAction(campus, [campus.id], personal), 'remove');
  assert.ok(getIcsContent(campus).includes('UID:campus-1@aroundsc.local'));
  const mock = { code: 'CSCI', title: 'Demo class', days: ['Tuesday'], startTime: '15:00', endTime: '16:00' };
  const conflict = checkCalendarConflict(campus, [...personal, mock]); assert.equal(conflict.conflicts.length, 2); assert.match(conflict.details, /Mock schedule/);
});
test('month grid includes leap days and correct Sunday offsets across year and month boundaries', () => {
  assert.equal(monthCells('2026-11')[0], '2026-11-01'); assert.equal(monthCells('2026-10')[0], '2026-09-27');
  assert.ok(monthCells('2028-02').includes('2028-02-29')); assert.equal(monthCells('2028-02').length, 42);
  assert.equal(shiftMonth('2026-12', 1), '2027-01'); assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(occursOn({ startTime: '2026-10-21T06:00:00Z', endTime: '2026-10-21T07:00:00Z' }, '2026-10-21'), false);
});
let server, CalendarView, CalendarMonth, CalendarOnboarding, DiscoverPage, EventDetailModal, ConflictModal;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ CalendarView, CalendarMonth, CalendarOnboarding } = await server.ssrLoadModule('/src/components/CalendarView.jsx'));
  ({ DiscoverPage } = await server.ssrLoadModule('/src/components/DiscoverPage.jsx'));
  ({ EventDetailModal } = await server.ssrLoadModule('/src/components/EventDetailModal.jsx'));
  ({ ConflictModal } = await server.ssrLoadModule('/src/components/ConflictModal.jsx'));
});
after(async () => server?.close());
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test('onboarding clearly offers honest connections, import and continue; file picker accepts ICS', () => {
  const html = render(CalendarView, { events: [campus] });
  for (const text of ['Plan your', 'campus life.', 'Connect Google Calendar', 'Setup required', 'Connect Apple Calendar', 'No direct sync', 'Continue without connecting', 'accept=".ics,text/calendar"', 'unencrypted']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('class="calendar-grid"'));
  const calls = [];
  const tree = CalendarOnboarding({ onGoogle: () => calls.push('google'), onApple: () => calls.push('apple'), onImport: () => calls.push('import'), onContinue: () => calls.push('continue') });
  function buttons(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(buttons); return [...(node.type === 'button' ? [node] : []), ...buttons(node.props?.children)]; }
  buttons(tree).forEach((button) => button.props.onClick()); assert.deepEqual(calls, ['google', 'apple', 'import', 'continue']);
});
test('continued/imported states render a true 42-cell month grid, distinguish sources and expose all overflow events', () => {
  const html = render(CalendarMonth, { month: '2026-10', selectedDate: '2026-10-20', today: '2026-10-20', items: [campus, ...parsed().events, { ...campus, id: 'campus-2', title: 'Very long title '.repeat(40) }], schedule: parsed().events });
  assert.equal((html.match(/class="calendar-date"/g) || []).length, 42);
  assert.ok(html.includes('aria-current="date"')); assert.ok(html.includes('aria-pressed="true"')); assert.ok(html.includes('Show all 3 events on 2026-10-20'));
  assert.ok(html.includes('Personal:')); assert.ok(html.includes('AroundSC:')); assert.ok(html.includes('schedule conflict'));
  const props = { initialView: 'month', events: [campus], calendarState: { events: [], continued: true, remember: false, useMock: false } };
  assert.ok(render(CalendarView, props).includes('class="calendar-grid"'));
  assert.ok(!render(CalendarView, props).includes('Connect Google Calendar'));
  const page = render(DiscoverPage, { ...props, activeEvents: [campus], filteredEvents: [campus], rsvpIds: [], viewMode: 'calendar' });
  assert.ok(page.includes('aria-label="Week hourly calendar"')); assert.ok(!page.includes('id="ask-request"'));
});
test('imported conflict details render in shared campus details and RSVP warning without treating personal data as classes', () => {
  const conflictInfo = checkCalendarConflict(campus, parsed().events);
  const details = render(EventDetailModal, { event: campus, isOpen: true, conflictInfo }); assert.ok(details.includes('Study, then coffee')); assert.ok(details.includes('RSVP locally'));
  const warning = render(ConflictModal, { event: campus, isOpen: true, conflictingClass: conflictInfo.conflictingClass });
  assert.ok(warning.includes('Personal commitment')); assert.ok(warning.includes('RSVP Anyway')); assert.ok(!warning.includes('your enrolled class'));
});

test('month navigation, Today, date selection, event selection and overflow execute real calendar callbacks', () => {
  const dates = [], opened = [], months = []; let today = false;
  const props = { month: '2026-10', selectedDate: '2026-10-20', today: '2026-10-20', items: [campus, ...parsed().events, { ...campus, id: 'another' }], schedule: [], onMonth: (value) => months.push(value), onToday: () => { today = true; }, onDate: (value) => dates.push(value), onEvent: (event) => opened.push(event) };
  const tree = CalendarMonth(props);
  function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  const controls = nodes(tree).filter((node) => node.type === 'button');
  controls.find((node) => node.props['aria-label'] === 'Previous month').props.onClick();
  controls.find((node) => node.props['aria-label'] === 'Next month').props.onClick();
  controls.find((node) => node.props.children === 'Today').props.onClick();
  assert.deepEqual(months, ['2026-09', '2026-11']); assert.equal(today, true);
  controls.find((node) => node.props['aria-label']?.startsWith('2026-10-20,')).props.onClick();
  controls.find((node) => node.props['aria-label'] === 'Show all 3 events on 2026-10-20').props.onClick();
  controls.find((node) => node.props['aria-label'] === 'AroundSC: Campus talk').props.onClick();
  assert.equal(dates.at(-1), '2026-10-20'); assert.equal(opened[0], campus);
});
test('cancellation envelopes, unsupported calendar versions and malformed nested events are rejected', () => {
  assert.throws(() => parseIcs(wrap(timed()).replace('VERSION:2.0', 'VERSION:2.0\r\nMETHOD:CANCEL')), /cancellation/);
  assert.throws(() => parseIcs(wrap(timed()).replace('VERSION:2.0', 'VERSION:1.0')), /VERSION/);
  assert.throws(() => parseIcs(wrap(`BEGIN:VEVENT\n${timed()}\nEND:VEVENT`)), /nested/);
});


test('failed saved-data reads survive Continue/preferences; only explicit replace/remove mutate storage', () => {
  const data = new Map([[PERSONAL_CALENDAR_KEY, '{unreadable'], ['aroundsc_showcase_rsvps', '["campus-1"]']]);
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  const current = { events: [], continued: false, remember: false, useMock: false, loadFailed: true };
  const continued = persistCalendarChange(storage, current, { ...current, continued: true });
  assert.equal(continued.state.continued, true); assert.equal(continued.state.loadFailed, true); assert.equal(data.get(PERSONAL_CALENDAR_KEY), '{unreadable');
  const replaced = persistCalendarChange(storage, current, { events: parsed().events, continued: true, remember: true, useMock: false }, { replaceSaved: true });
  assert.equal(replaced.applied, true); assert.equal(loadPersonalCalendar(storage).events.length, 2);
  persistCalendarChange(storage, replaced.state, { events: [], continued: false, remember: false, useMock: false }, { removeSaved: true });
  assert.equal(data.has(PERSONAL_CALENDAR_KEY), false); assert.equal(data.get('aroundsc_showcase_rsvps'), '["campus-1"]');
});
test('storage failures leave persistent edits unapplied but allow honestly labeled session use', () => {
  const current = { events: [], continued: false, remember: true, useMock: false };
  const next = { ...current, events: parsed().events, continued: true };
  const fail = persistCalendarChange(undefined, current, next); assert.equal(fail.applied, false); assert.equal(fail.state, current);
  const session = persistCalendarChange(undefined, current, { ...next, remember: false }); assert.equal(session.applied, true); assert.equal(session.state.events.length, 2); assert.match(session.error, /may return after refresh/);
});


test('calendar overflow and mobile summaries reveal the full day, while chips keep original event identities', () => {
  const personal = Object.freeze(parsed().events[0]);
  const longEvent = Object.freeze({ ...campus, id: 'long-title-event', title: 'A very long campus event title '.repeat(30) });
  const items = Object.freeze([personal, campus, longEvent]);
  const calls = [], selections = [];
  const tree = CalendarMonth({ month: '2026-10', selectedDate: '2026-10-21', today: '2026-10-20', items, schedule: [personal], onMore: (date) => calls.push(date), onDate: (date) => selections.push(date), onEvent: (event) => calls.push(event) });
  function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  const controls = nodes(tree).filter((node) => node.type === 'button');
  controls.find((node) => node.props['aria-label'] === 'Show all 3 events on 2026-10-20').props.onClick();
  controls.find((node) => node.props['aria-label']?.startsWith('View 3 events on 2026-10-20')).props.onClick();
  assert.deepEqual(calls, ['2026-10-20', '2026-10-20']);
  controls.find((node) => node.props['aria-label'] === `Personal: ${personal.title}`).props.onClick();
  assert.equal(calls.at(-1), personal); assert.equal(selections.at(-1), '2026-10-20');
  const html = renderToStaticMarkup(tree);
  assert.ok(html.includes('October <span class="calendar-year">2026</span>'));
  assert.ok(html.includes('today"><button class="calendar-date"'));
  assert.ok(html.includes('selected"><button class="calendar-date"'));
  assert.ok(html.includes('calendar-chip-title')); assert.ok(html.includes('calendar-chip-time'));
  assert.ok(html.includes('aria-controls="selected-calendar-agenda"'));
  assert.ok(html.includes('View 3 events on 2026-10-20, schedule conflict'));
});
test('calendar date columns cover every month start and correct month lengths without data mutation', () => {
  const starts = new Set();
  for (let month = 1; month <= 12; month++) {
    const key = `2026-${String(month).padStart(2, '0')}`;
    const cells = monthCells(key);
    const first = `${key}-01`;
    const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
    starts.add(weekday); assert.equal(cells.indexOf(first), weekday);
    const expectedLength = new Date(Date.UTC(2026, month, 0)).getUTCDate();
    assert.equal(cells.filter((date) => date.startsWith(key)).length, expectedLength);
    for (const [index, date] of cells.entries()) assert.equal(new Date(`${date}T12:00:00Z`).getUTCDay(), index % 7);
  }
  assert.equal(starts.size, 7);
});
