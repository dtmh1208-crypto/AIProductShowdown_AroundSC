import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { HOUR_HEIGHT, weekDates, navigateCalendar, calendarHeading, daySlots, timeGridModel, positionTimedEvents, currentTimePosition, initialTimeScroll } from '../src/utils/calendarLayout.js';
const event = (id, startTime, endTime) => Object.freeze({ id, title: id, startTime, endTime, location: { name: 'Original campus venue' }, tags: [], category: 'Academic' });
const sample = event('Campus lecture', '2026-10-20T17:00:00Z', '2026-10-20T18:30:00Z');
const personal = Object.freeze({ ...event('Personal meeting', '2026-10-20T17:30:00Z', '2026-10-20T18:00:00Z'), uid: 'uid-1', kind: 'personal', allDay: false, location: 'Personal venue', sourceName: 'schedule.ics', sourceUrl: '', busy: true });
const allDay = Object.freeze({ ...personal, id: 'all-day', title: 'Day away', allDay: true, startTime: '2026-10-20', endTime: '2026-10-21' });

test('day model has one column, week has seven Sunday-aligned columns across month/year boundaries', () => {
  assert.equal(timeGridModel('2026-10-20', 'day').days.length, 1);
  const week = weekDates('2027-01-01'); assert.deepEqual([week[0], week.at(-1)], ['2026-12-27', '2027-01-02']);
  const model = timeGridModel('2026-10-20'); assert.equal(model.days.length, 7); assert.equal(model.rows.length, 24); assert.equal(model.height, HOUR_HEIGHT * 24);
});
test('a 10 AM–11:30 AM event occupies its real 90-minute vertical interval in USC time', () => {
  const piece = positionTimedEvents([sample], timeGridModel('2026-10-20', 'day').days[0])[0];
  assert.equal(piece.top, HOUR_HEIGHT * 10); assert.equal(piece.height, HOUR_HEIGHT * 1.5); assert.equal(piece.event, sample);
  assert.equal(piece.lane, 0); assert.equal(piece.lanes, 1);
  const timezone = event('Equivalent instant with offset', '2026-10-20T13:00:00-04:00', '2026-10-20T14:30:00-04:00');
  assert.equal(positionTimedEvents([timezone], timeGridModel('2026-10-20', 'day').days[0])[0].top, piece.top);
});
test('overlaps and equal starts use separate lanes; adjacent intervals do not count as overlaps', () => {
  const day = timeGridModel('2026-10-20', 'day').days[0];
  const items = [event('long', '2026-10-20T17:00:00Z', '2026-10-20T19:00:00Z'), event('same-start', '2026-10-20T17:00:00Z', '2026-10-20T17:30:00Z'), event('adjacent', '2026-10-20T17:30:00Z', '2026-10-20T18:00:00Z')];
  const pieces = positionTimedEvents(items, day);
  assert.equal(new Set(pieces.filter((piece) => piece.start === Date.parse(items[0].startTime)).map((piece) => piece.lane)).size, 2);
  assert.equal(pieces.find((piece) => piece.event.id === 'same-start').lane, pieces.find((piece) => piece.event.id === 'adjacent').lane);
  assert.ok(pieces.every((piece) => piece.lanes === 2));
  assert.ok(positionTimedEvents(items.slice(1), day).every((piece) => piece.lanes === 1));
});
test('midnight-crossing events split across real dates and preserve the same event object', () => {
  const overnight = event('Overnight', '2026-10-21T06:30:00Z', '2026-10-21T08:15:00Z');
  const first = positionTimedEvents([overnight], timeGridModel('2026-10-20', 'day').days[0])[0];
  const next = positionTimedEvents([overnight], timeGridModel('2026-10-21', 'day').days[0])[0];
  assert.equal(first.top, 23.5 * HOUR_HEIGHT); assert.equal(first.height, .5 * HOUR_HEIGHT); assert.equal(first.continuesAfter, true);
  assert.equal(next.top, 0); assert.equal(next.height, 1.25 * HOUR_HEIGHT); assert.equal(next.continuesBefore, true);
  assert.equal(first.event, next.event); assert.equal(next.event, overnight);
  const midnightEnd = { ...overnight, endTime: '2026-10-21T07:00:00Z' };
  assert.equal(positionTimedEvents([midnightEnd], timeGridModel('2026-10-21', 'day').days[0]).length, 0);
});
test('spring-forward layouts preserve elapsed duration, omitting nonexistent hours or marking week gaps', () => {
  const spring = event('Spring transition', '2026-03-08T09:30:00Z', '2026-03-08T10:30:00Z');
  const day = timeGridModel('2026-03-08', 'day'); assert.equal(day.rows.length, 23); assert.ok(!day.rows.some((row) => row.label === '2 AM'));
  const pieces = positionTimedEvents([spring], day.days[0]); assert.equal(pieces.length, 1); assert.equal(pieces[0].height, HOUR_HEIGHT);
  const week = timeGridModel('2026-03-08', 'week'); assert.equal(week.rows.length, 24); assert.equal(week.clockChange, true);
  const split = positionTimedEvents([spring], week.days[0]); assert.equal(split.length, 2); assert.equal(split.reduce((sum, part) => sum + part.height, 0), HOUR_HEIGHT);
});
test('fall-back layouts show the repeated hour and split normal-day events around the extra week slot', () => {
  assert.equal(daySlots('2026-11-01').length, 25);
  const day = timeGridModel('2026-11-01', 'day'); assert.ok(day.rows.some((row) => row.label === '1 AM (again)'));
  const fall = event('Fall transition', '2026-11-01T08:15:00Z', '2026-11-01T09:45:00Z');
  assert.equal(positionTimedEvents([fall], day.days[0])[0].height, 1.5 * HOUR_HEIGHT);
  const week = timeGridModel('2026-11-02'); const monday = week.days.find((day) => day.date === '2026-11-02');
  const normal = event('Normal Monday', '2026-11-02T09:30:00Z', '2026-11-02T10:30:00Z');
  const pieces = positionTimedEvents([normal], monday); assert.equal(pieces.length, 2); assert.equal(pieces.reduce((sum, piece) => sum + piece.height, 0), HOUR_HEIGHT);
});
test('all-day, invalid, reversed and out-of-range events get no invented timed position', () => {
  const day = timeGridModel('2026-10-20', 'day').days[0];
  assert.deepEqual(positionTimedEvents([allDay, { ...sample, startTime: '' }, { ...sample, endTime: sample.startTime }, { ...sample, startTime: '2025-10-20T17:00:00Z', endTime: '2025-10-20T18:00:00Z' }], day), []);
});
test('current-time line is restricted to the visible day/week; default scroll targets work hours or now', () => {
  const now = new Date('2026-10-20T17:30:00Z'), day = timeGridModel('2026-10-20', 'day');
  assert.equal(currentTimePosition(day, now), 10.5 * HOUR_HEIGHT);
  assert.equal(initialTimeScroll(day, now), 9.5 * HOUR_HEIGHT);
  assert.equal(currentTimePosition(timeGridModel('2026-10-21', 'day'), now), null);
  assert.equal(currentTimePosition(timeGridModel('2026-11-20'), now), null);
  assert.equal(initialTimeScroll(timeGridModel('2026-11-20'), now), 7 * HOUR_HEIGHT);
});
test('navigation uses the selected unit and clamps month/year dates rather than losing the selected day', () => {
  assert.equal(navigateCalendar('2026-10-20', 'day', 1), '2026-10-21');
  assert.equal(navigateCalendar('2026-10-20', 'week', -1), '2026-10-13');
  assert.equal(navigateCalendar('2026-01-31', 'month', 1), '2026-02-28');
  assert.equal(navigateCalendar('2028-02-29', 'year', 1), '2029-02-28');
  assert.equal(navigateCalendar('2026-12-20', 'year', -1), '2025-12-20');
  assert.match(calendarHeading('2026-10-20', 'day'), /October 20, 2026/); assert.match(calendarHeading('2026-10-20', 'week'), /Oct 18, 2026.*Oct 24, 2026/); assert.equal(calendarHeading('2026-10-20', 'year'), '2026');
});
let server, CalendarTimeGrid, CalendarView, CalendarHeader, CalendarViewSelector, CalendarYear;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ CalendarTimeGrid } = await server.ssrLoadModule('/src/components/CalendarTimeView.jsx'));
  ({ CalendarView, CalendarHeader, CalendarViewSelector } = await server.ssrLoadModule('/src/components/CalendarView.jsx'));
  ({ CalendarYear } = await server.ssrLoadModule('/src/components/CalendarYear.jsx'));
});
after(async () => server?.close());
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }

test('Day, Week, Month and Year render genuinely different layouts with working view-selection callbacks', () => {
  const calendarState = { events: [personal, allDay], continued: true, remember: false, useMock: false };
  for (const view of ['day', 'week', 'month', 'year']) {
    const html = render(CalendarView, { events: [sample], calendarState, initialView: view });
    if (view === 'day' || view === 'week') { assert.ok(html.includes(`aria-label="${view === 'day' ? 'Day' : 'Week'} hourly calendar"`)); assert.equal((html.match(/class="calendar-time-date/g) || []).length, view === 'day' ? 1 : 7); assert.ok(html.includes('9 AM')); assert.ok(!html.includes('class="calendar-grid"')); }
    if (view === 'month') assert.ok(html.includes('class="calendar-grid"'));
    if (view === 'year') assert.equal((html.match(/class="calendar-mini-month"/g) || []).length, 12);
  }
  const changes = [];
  const selector = CalendarViewSelector({ view: 'week', onView: (value) => changes.push(value) });
  nodes(selector).filter((node) => node.type === 'button').forEach((node) => node.props.onClick());
  assert.deepEqual(changes, ['day', 'week', 'month', 'year']);
});
test('timed event buttons preserve source objects, show conflicts and exact positioning; all-day row is separate', () => {
  const selected = [], opened = [], model = timeGridModel('2026-10-20', 'day');
  const tree = CalendarTimeGrid({ model, items: [sample, personal, allDay], schedule: [personal], selectedDate: '2026-10-20', now: new Date('2026-10-20T17:15:00Z'), onDate: (date) => selected.push(date), onEvent: (event) => opened.push(event) });
  const buttons = nodes(tree).filter((node) => node.type === 'button');
  const timed = buttons.find((node) => node.props.className.includes('calendar-time-event') && node.props['aria-label'].startsWith('AroundSC:'));
  assert.equal(timed.props.style.top, 10 * HOUR_HEIGHT); assert.equal(timed.props.style.height, 1.5 * HOUR_HEIGHT); assert.match(timed.props['aria-label'], /schedule conflict/); timed.props.onClick();
  assert.equal(opened[0], sample); assert.equal(selected[0], '2026-10-20');
  buttons.find((node) => node.props.className.includes('calendar-all-day-event')).props.onClick(); assert.equal(opened[1], allDay);
  const html = renderToStaticMarkup(tree); assert.ok(html.includes('calendar-now-line')); assert.ok(html.includes('Personal venue')); assert.ok(html.includes('personal')); assert.ok(html.includes('campus'));
  const off = render(CalendarTimeGrid, { model, items: [], now: new Date('2026-11-01T17:00:00Z') }); assert.ok(!off.includes('calendar-now-line')); assert.ok(off.includes('No personal commitments or AroundSC events on this day'));
});
test('navigation header callbacks work in each view; Year dates and month headings are actionable', () => {
  for (const view of ['day', 'week', 'month', 'year']) {
    const calls = [];
    const header = CalendarHeader({ date: '2026-10-20', view, onPrevious: () => calls.push(navigateCalendar('2026-10-20', view, -1)), onNext: () => calls.push(navigateCalendar('2026-10-20', view, 1)), onToday: () => calls.push('today') });
    const buttons = nodes(header).filter((node) => node.type === 'button');
    buttons.find((node) => node.props['aria-label'] === `Previous ${view}`).props.onClick(); buttons.find((node) => node.props['aria-label'] === `Next ${view}`).props.onClick(); buttons.find((node) => node.props.children === 'Today').props.onClick(); assert.equal(calls.length, 3); assert.equal(calls[2], 'today');
  }
  const calls = []; const tree = CalendarYear({ date: '2028-02-29', today: '2028-02-29', items: [], onDate: (date) => calls.push(date), onMonth: (date) => calls.push(date) });
  const buttons = nodes(tree).filter((node) => node.type === 'button');
  buttons.find((node) => node.props['aria-label'] === '2028-02-29, 0 events, open day').props.onClick(); buttons.find((node) => node.props.className === 'calendar-mini-month-title').props.onClick(); assert.deepEqual(calls, ['2028-02-29', '2028-01-01']);
});
