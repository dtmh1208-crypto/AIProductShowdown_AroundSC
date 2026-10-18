import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { parseIcs, readCalendarFile, mergePersonalEvents, loadPersonalCalendar, persistCalendarChange, PERSONAL_CALENDAR_KEY, occursOn } from '../src/utils/personalCalendar.js';
import { composeCalendarSchedule } from '../src/utils/calendarSchedule.js';
import { HOUR_HEIGHT, timeGridModel, positionTimedEvents } from '../src/utils/calendarLayout.js';

// Synthetic regression fixtures only; these never enter the application dataset or browser storage.
const record = (uid, title, start, end, extra = '') => `BEGIN:VEVENT\r\nUID:${uid}\r\nSUMMARY:${title}\r\nDTSTART${start}\r\nDTEND${end}\r\nLOCATION:Test room\r\n${extra}\r\nEND:VEVENT`;
const wrap = (...records) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${records.join('\r\n')}\r\nEND:VCALENDAR`;
const classes = [
  ['2026-10-19', 'Monday occurrence', '20261019'],
  ['2026-10-21', 'Wednesday occurrence', '20261021'],
  ['2026-10-23', 'Friday occurrence', '20261023'],
  ['2026-10-26', 'Next Monday occurrence', '20261026'],
];
const multiDateFile = wrap(...classes.map(([, title, date]) => record('same-class-uid', title, `;TZID=America/Los_Angeles:${date}T100000`, `;TZID=America/Los_Angeles:${date}T110000`)));
const memoryStorage = () => {
  const data = new Map([['aroundsc_showcase_rsvps', '["existing-rsvp"]']]);
  let writes = 0;
  return { data, get writes() { return writes; }, getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { writes++; data.set(key, value); }, removeItem: (key) => { writes++; data.delete(key); } };
};
const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const personalButtons = (tree) => nodes(tree).filter((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Personal:'));

let server, CalendarMonth, CalendarTimeGrid;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ CalendarMonth } = await server.ssrLoadModule('/src/components/CalendarView.jsx'));
  ({ CalendarTimeGrid } = await server.ssrLoadModule('/src/components/CalendarTimeView.jsx'));
});
after(async () => server?.close());

test('multi-date file preview retains every explicit occurrence, including repeated UIDs on different days', async () => {
  const storage = memoryStorage();
  const preview = await readCalendarFile({ name: 'synthetic-multi-date.ics', size: new TextEncoder().encode(multiDateFile).length, text: async () => multiDateFile });
  assert.equal(preview.total, 4); assert.equal(preview.events.length, 4); assert.deepEqual(preview.warnings, []);
  assert.equal(new Set(preview.events.map((event) => event.id)).size, 4);
  for (const [date, title] of classes) {
    const event = preview.events.find((item) => item.title === title);
    assert.equal(event.startTime, `${date}T17:00:00.000Z`);
    assert.equal(event.endTime, `${date}T18:00:00.000Z`);
    assert.equal(event.location, 'Test room'); assert.equal(event.sourceName, 'synthetic-multi-date.ics');
    assert.deepEqual(classes.filter(([day]) => occursOn(event, day)).map(([day]) => day), [date]);
  }
  assert.equal(storage.writes, 0); assert.equal(storage.getItem(PERSONAL_CALENDAR_KEY), null);
});

test('the confirmation merge/save/load pipeline preserves all dates and existing commitments after simulated refresh', () => {
  const storage = memoryStorage(), preview = parseIcs(multiDateFile);
  const existing = parseIcs(wrap(record('earlier-import', 'Earlier saved commitment', ':20261018T190000Z', ':20261018T200000Z'))).events;
  const initial = { events: existing, remember: true, continued: true, useMock: false };
  // Same helpers as CalendarView.confirmImport -> App.updateCalendar -> App initialization.
  const merged = mergePersonalEvents(initial.events, preview.events);
  assert.equal(merged.events.length, 5);
  const result = persistCalendarChange(storage, initial, { ...initial, events: merged.events });
  assert.equal(result.applied, true); assert.equal(result.error, ''); assert.equal(storage.writes, 1);
  const saved = storage.getItem(PERSONAL_CALENDAR_KEY);
  assert.equal(JSON.parse(saved).events.length, 5);
  const restored = loadPersonalCalendar(storage);
  assert.deepEqual(restored.events, merged.events); assert.equal(restored.useMock, false);
  const allItems = composeCalendarSchedule([], [], restored.events).items;
  for (const [date, title] of classes) assert.deepEqual(allItems.filter((event) => occursOn(event, date)).map((event) => event.title), [title]);
  const repeated = mergePersonalEvents(restored.events, preview.events);
  assert.equal(repeated.duplicates, 4); assert.deepEqual(repeated.events, restored.events);
  assert.equal(storage.getItem(PERSONAL_CALENDAR_KEY), saved); assert.equal(storage.writes, 1);
  assert.equal(storage.getItem('aroundsc_showcase_rsvps'), '["existing-rsvp"]');
});

test('mixed exports explicitly skip weekly rules and exceptions instead of silently importing only a series start', () => {
  const standalone = record('one-off', 'One-off event', ':20261020T170000Z', ':20261020T180000Z');
  const extras = ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12', 'RRULE:FREQ=WEEKLY;UNTIL=20261201T235959Z', 'RDATE:20261021T170000Z', 'EXDATE:20261021T170000Z', 'RECURRENCE-ID:20261021T170000Z'];
  const recurring = extras.map((extra, index) => record(`series-${index}`, `Unsupported series ${index}`, ':20261019T170000Z', ':20261019T180000Z', extra));
  const preview = parseIcs(wrap(standalone, ...recurring));
  assert.equal(preview.total, 6); assert.deepEqual(preview.events.map((event) => event.title), ['One-off event']);
  assert.equal(preview.warnings.length, 5);
  for (let index = 0; index < extras.length; index++) {
    assert.ok(preview.warnings.some((warning) => warning.includes(`Unsupported series ${index}`) && warning.includes('entire record was skipped')));
  }
  const onlySeries = parseIcs(wrap(...recurring)); assert.equal(onlySeries.events.length, 0);
});

test('UTC midnight, IANA timezone and floating dates map to actual USC dates without collapsing dates', () => {
  const { events, warnings } = parseIcs(wrap(
    record('utc-before-midnight', 'Ends at USC midnight', ':20261020T063000Z', ':20261020T070000Z'),
    record('utc-overnight', 'Crosses USC midnight', ':20261021T063000Z', ':20261021T073000Z'),
    record('tokyo', 'Tokyo date differs', ';TZID=Asia/Tokyo:20261022T003000', ';TZID=Asia/Tokyo:20261022T013000'),
    record('floating', 'Floating USC time', ':20261023T001500', ':20261023T011500'),
    record('all-day', 'All-day weekend', ';VALUE=DATE:20261024', ';VALUE=DATE:20261026'),
  ));
  assert.equal(events.length, 5); assert.ok(warnings.some((warning) => warning.includes('Floating')));
  const dates = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'];
  const expected = {
    'utc-before-midnight': ['2026-10-19'], 'utc-overnight': ['2026-10-20', '2026-10-21'],
    tokyo: ['2026-10-21'], floating: ['2026-10-23'], 'all-day': ['2026-10-24', '2026-10-25'],
  };
  for (const event of events) {
    assert.deepEqual(dates.filter((date) => occursOn(event, date)), expected[event.uid]);
    if (!event.allDay) for (const date of dates) {
      const positioned = positionTimedEvents([event], timeGridModel(date, 'day').days[0]);
      assert.equal(positioned.length > 0, expected[event.uid].includes(date), `${event.uid} on ${date}`);
    }
  }
});

test('same local class hour across DST, month and year boundaries keeps distinct saved dates and exact instants', () => {
  const dates = [
    ['2026-10-31', '20261031', '17:00:00.000Z'], ['2026-11-01', '20261101', '18:00:00.000Z'],
    ['2026-12-31', '20261231', '18:00:00.000Z'], ['2027-01-01', '20270101', '18:00:00.000Z'],
  ];
  const preview = parseIcs(wrap(...dates.map(([date, raw]) => record('same-uid-boundaries', date, `;TZID=America/Los_Angeles:${raw}T100000`, `;TZID=America/Los_Angeles:${raw}T110000`))));
  const storage = memoryStorage(), initial = { events: [], remember: true, continued: false, useMock: false };
  persistCalendarChange(storage, initial, { ...initial, events: preview.events, continued: true });
  const restored = loadPersonalCalendar(storage).events;
  assert.equal(restored.length, 4);
  for (const [date, , instant] of dates) {
    const event = restored.find((item) => item.title === date);
    assert.equal(event.startTime, `${date}T${instant}`);
    assert.equal(occursOn(event, date), true);
    const model = timeGridModel(date, 'day');
    const positioned = positionTimedEvents(restored, model.days[0]);
    assert.equal(positioned.length, 1); assert.equal(positioned[0].event, event);
    // Fall-back day has an additional elapsed-hour row before 10 AM.
    assert.equal(positioned[0].top, (date === '2026-11-01' ? 11 : 10) * HOUR_HEIGHT);
  }
});

test('Day, Week and Month place the same restored personal records on their own dates and preserve event selection', () => {
  const storage = memoryStorage(), initial = { events: [], remember: true, continued: false, useMock: false };
  persistCalendarChange(storage, initial, { ...initial, events: parseIcs(multiDateFile).events, continued: true });
  const restored = loadPersonalCalendar(storage).events;
  const items = composeCalendarSchedule([], [], restored).items;
  const before = storage.getItem(PERSONAL_CALENDAR_KEY), selected = [], opened = [];
  const props = { items, schedule: restored, now: new Date('2026-10-19T19:00:00Z'), selectedDate: '2026-10-19', onDate: (date) => selected.push(date), onEvent: (event) => opened.push(event) };
  for (const [date, title] of classes) {
    const model = timeGridModel(date, 'day'), tree = CalendarTimeGrid({ ...props, model });
    const buttons = personalButtons(tree);
    assert.equal(buttons.length, 1); assert.ok(buttons[0].props['aria-label'].includes(title));
    buttons[0].props.onClick(); assert.equal(selected.at(-1), date); assert.equal(opened.at(-1), restored.find((event) => event.title === title));
  }
  for (const date of ['2026-10-19', '2026-10-26']) {
    const model = timeGridModel(date, 'week'), tree = CalendarTimeGrid({ ...props, model });
    const expected = classes.filter(([day]) => model.days.some((column) => column.date === day));
    assert.equal(personalButtons(tree).length, expected.length);
    for (const column of model.days) {
      const node = nodes(tree).find((node) => node.props?.['data-date'] === column.date);
      assert.deepEqual(personalButtons(node).map((button) => button.props.title.split(' · ')[0]), classes.filter(([day]) => day === column.date).map(([, title]) => title));
    }
    assert.ok(renderToStaticMarkup(tree).includes('calendar-time-column'));
  }
  const month = CalendarMonth({ ...props, month: '2026-10', today: '2026-10-19', showHeader: false });
  assert.equal(personalButtons(month).length, 4);
  for (const [date, title] of classes) {
    const cell = nodes(month).find((node) => node.type === 'div' && node.props.className?.split(' ').includes('calendar-cell') && nodes(node).some((child) => child.type === 'button' && child.props['aria-label']?.startsWith(`${date}, 1 events`)));
    assert.ok(cell, date);
    assert.equal(personalButtons(cell).length, 1); assert.equal(personalButtons(cell)[0].props['aria-label'], `Personal: ${title}`);
  }
  assert.equal(storage.getItem(PERSONAL_CALENDAR_KEY), before); assert.equal(storage.writes, 1);
});
