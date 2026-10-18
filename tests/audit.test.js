import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { RAW_EVENTS } from '../src/data/eventsData.js';
import { VERIFIED_EVENT_RECORDS, VERIFIED_CHECKED_AT } from '../src/data/verifiedEvents.js';
import { MOCK_STUDENT_SCHEDULE } from '../src/data/mockSchedule.js';
import { buildShowcaseCollection } from '../src/utils/eventAdapter.js';
import { filterEvents, getRsvpAction, updateRsvps } from '../src/utils/eventDiscovery.js';
import { parseDiscoveryRequest } from '../src/utils/discoveryParser.js';
import { matchesDiscovery } from '../src/utils/discoveryMatching.js';
import { checkCalendarConflict, downloadIcsFile, getGoogleCalendarUrl } from '../src/utils/calendar.js';
import { loadShowcaseRsvps, SHOWCASE_RSVP_KEY } from '../src/utils/rsvpStorage.js';
import { projectCoords, layoutMapEvents, nextZoom, isActivationKey, startVectorMap } from '../src/utils/map.js';
import { activateDialog } from '../src/utils/dialog.js';

const now = new Date(VERIFIED_CHECKED_AT);
const events = buildShowcaseCollection(RAW_EVENTS, VERIFIED_EVENT_RECORDS, { now }).events;
const curated = events.find((event) => event.dataset === 'verified' && event.category === 'Workshop');
let server, components;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  components = {};
  for (const name of ['FiltersBar', 'Header', 'EventCard', 'FeaturedEventCard', 'AroundSCHero', 'PageLink', 'DiscoverPage', 'ConflictModal', 'ScheduleModal', 'EventDetailModal', 'MapView', 'AskAroundSC', 'LandingPage', 'ErrorBoundary']) {
    const module = await server.ssrLoadModule(`/src/components/${name}.jsx`);
    components[name] = module[name];
  }
});
after(async () => { await server?.close(); });
const nodes = (element) => {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(nodes);
  return [element, ...nodes(element.props?.children)];
};
const text = (element) => typeof element === 'string' || typeof element === 'number' ? String(element)
  : Array.isArray(element) ? element.map(text).join('') : element ? text(element.props?.children) : '';
const clickByText = (tree, label) => {
  const element = nodes(tree).find((node) => node.type === 'button' && text(node) === label);
  assert.ok(element, label); element.props.onClick();
};

// Application logic tests exercise the SAME functions used by App, not a copied pipeline.
test('keyword search handles title, building, organizer, tags, food descriptions, case and whitespace', () => {
  for (const [query, id] of [['  VITERBI AI  ', 'evt-01'], [' Boba ', 'evt-01'], ['DML', curated.id], ['Dornsife PhD Academy', curated.id], ['communicating research', curated.id]]) {
    assert.ok(filterEvents(events, { searchQuery: query }, now).some((event) => event.id === id), query);
  }
  assert.equal(filterEvents(events, { searchQuery: '   ' }, now).length, events.length);
  assert.equal(filterEvents(events, { searchQuery: 'no-event-should-match-this-phrase' }, now).length, 0);
});

test('all six categories and food/conflict controls combine with AND and preserve chronological order', () => {
  for (const category of ['Academic', 'Social', 'Career', 'Athletics', 'Arts', 'Workshop']) {
    const result = filterEvents(events, { categoryFilter: category, freeFoodOnly: true, hideConflicts: true, schedule: MOCK_STUDENT_SCHEDULE }, now);
    for (const event of result) {
      assert.equal(event.category, category);
      assert.equal(event.freeFood, true);
      assert.equal(checkCalendarConflict(event, MOCK_STUDENT_SCHEDULE).hasConflict, false);
    }
    assert.deepEqual(result.map((event) => Date.parse(event.startTime)), result.map((event) => Date.parse(event.startTime)).sort((a, b) => a - b));
  }
});

test('all time/RSVP tabs select the intended events and exact event boundaries', () => {
  const during = new Date(Date.parse(curated.startTime) + 1000);
  assert.ok(filterEvents(events, { timeFilter: 'live' }, during).some((event) => event.id === curated.id));
  assert.ok(!filterEvents(events, { timeFilter: 'live' }, new Date(curated.endTime)).some((event) => event.id === curated.id));
  assert.ok(filterEvents(events, { timeFilter: 'today' }, during).some((event) => event.id === curated.id));
  assert.ok(filterEvents(events, { timeFilter: 'upcoming' }, now).some((event) => event.id === curated.id));
  assert.deepEqual(filterEvents(events, { timeFilter: 'rsvp', rsvpIds: [curated.id] }, now).map((event) => event.id), [curated.id]);
  assert.equal(filterEvents(events, { timeFilter: 'rsvp', rsvpIds: [] }, now).length, 0);
});

test('RSVP action logic warns for overlaps, supports override, deduplicates, removes and persists', () => {
  const overlappingSchedule = [{ code: 'AUDIT', title: 'Audit class', days: ['Tuesday'], startTime: '18:00', endTime: '19:00', location: 'DML' }];
  assert.equal(getRsvpAction(curated, [], overlappingSchedule), 'conflict');
  assert.equal(getRsvpAction(curated, [], MOCK_STUDENT_SCHEDULE), 'add');
  let ids = updateRsvps([], curated.id, true);
  ids = updateRsvps(ids, curated.id, true);
  assert.deepEqual(ids, [curated.id]);
  assert.equal(getRsvpAction(curated, ids, overlappingSchedule), 'remove');
  const values = new Map([[SHOWCASE_RSVP_KEY, JSON.stringify(ids)]]);
  const reloaded = loadShowcaseRsvps({ getItem: (key) => values.get(key) ?? null }, { sample: {}, verified: {} });
  assert.deepEqual(reloaded, ids);
  ids = updateRsvps(reloaded, curated.id, false);
  values.set(SHOWCASE_RSVP_KEY, JSON.stringify(ids));
  assert.deepEqual(loadShowcaseRsvps({ getItem: (key) => values.get(key) ?? null }, { sample: {}, verified: {} }), []);
});

test('NLP normal, unmatched, empty, unknown-building and hard-deadline queries flow through actual filters', () => {
  const query = (value) => parseDiscoveryRequest(value, { now });
  assert.ok(filterEvents(events, { discovery: query('Find workshop events on 2026-10-20') }, now).some((event) => event.id === curated.id));
  assert.equal(filterEvents(events, { discovery: query('Find painting events on 2026-10-20') }, now).length, 0);
  assert.equal(filterEvents(events, { discovery: query('') }, now).length, 0);
  const unknown = query('Find workshop events on 2026-10-20 near JKP');
  assert.equal(filterEvents(events, { discovery: unknown }, now).length, 0);
  assert.ok(filterEvents(events, { discovery: unknown, ignoreUnknownLocations: true }, now).some((event) => event.id === curated.id));
  assert.ok(!filterEvents(events, { discovery: query('Find workshop events on 2026-10-20 before 6 PM') }, now).some((event) => event.id === curated.id));
  assert.ok(!matchesDiscovery({ ...curated, location: { coordinates: [NaN, 34] } }, query('Find workshop events on 2026-10-20 near DML')));
});

test('all filter controls execute their actual callbacks with correct state changes', () => {
  const state = { searchQuery: '', timeFilter: 'all', categoryFilter: 'All', freeFoodOnly: false, hideConflicts: false };
  const props = { ...state, totalMatching: events.length, liveCount: 3 };
  for (const key of Object.keys(state)) props[`set${key[0].toUpperCase()}${key.slice(1)}`] = (value) => { state[key] = value; };
  const tree = components.FiltersBar(props);
  nodes(tree).find((node) => node.type === 'input').props.onChange({ target: { value: 'Boba' } });
  assert.equal(state.searchQuery, 'Boba');
  clickByText(tree, '🍕Free Food'); assert.equal(state.freeFoodOnly, true);
  clickByText(tree, 'No Conflicts'); assert.equal(state.hideConflicts, true);
  for (const [label, value] of [['All Events', 'all'], ['Happening Now (3)', 'live'], ['Today', 'today'], ['Upcoming', 'upcoming'], ['My RSVPs', 'rsvp']]) {
    clickByText(tree, label); assert.equal(state.timeFilter, value);
  }
  for (const category of ['All', 'Academic', 'Social', 'Career', 'Athletics', 'Arts', 'Workshop']) {
    clickByText(tree, category); assert.equal(state.categoryFilter, category);
  }
  assert.ok(renderToStaticMarkup(tree).includes('aria-pressed="false"'));
});

test('discovery search/clear/location-bypass callbacks update applied request state and matching results', () => {
  const state = { discovery: null, discoveryRequest: '', ignored: true, detail: curated };
  const tree = components.DiscoverPage({ viewMode: 'list', activeEvents: events, rsvpIds: [], filteredEvents: events,
    setDiscovery: (value) => { state.discovery = value; }, setDiscoveryRequest: (value) => { state.discoveryRequest = value; },
    setIgnoreUnknownLocations: (value) => { state.ignored = value; }, setSelectedDetailEvent: (value) => { state.detail = value; },
  });
  const ask = nodes(tree).find((node) => node.type === components.AskAroundSC);
  ask.props.onSearch('Find workshop events on 2026-10-20');
  assert.equal(state.discoveryRequest, 'Find workshop events on 2026-10-20');
  assert.equal(state.ignored, false); assert.equal(state.detail, null);
  assert.ok(filterEvents(events, { discovery: state.discovery }, now).some((event) => event.id === curated.id));
  ask.props.onIgnoreLocations(); assert.equal(state.ignored, true);
  ask.props.onClear(); assert.equal(state.discovery, null); assert.equal(state.discoveryRequest, ''); assert.equal(state.ignored, false);
});

test('Ask rendered states cover suggested prompt, submitted draft, unsupported request and location bypass', () => {
  const render = (extra) => renderToStaticMarkup(React.createElement(components.AskAroundSC, extra));
  assert.ok(render({}).includes('Try “Find tech events today”'));
  const request = 'Find workshop events on 2026-10-20 near JKP';
  const html = render({ initialRequest: request, parsed: parseDiscoveryRequest(request, { now }), resultCount: 0 });
  assert.ok(html.includes(request)); assert.ok(html.includes('Search without location'));
  assert.ok(html.includes('Search needs clarification'));
  assert.ok(render({ parsed: parseDiscoveryRequest('', { now }), resultCount: 0 }).includes('Describe the events'));
});

test('header Map/List and schedule buttons invoke the intended callbacks', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  let view, opened = false, scrolled = 0;
  globalThis.document = { getElementById: () => ({ scrollIntoView: () => { scrolled += 1; } }) };
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  try {
    const tree = components.Header({ viewMode: 'map', setViewMode: (value) => { view = value; }, onOpenSchedule: () => { opened = true; }, rsvpCount: 0 });
    clickByText(tree, 'List View'); assert.equal(view, 'list');
    clickByText(tree, 'Map View'); assert.equal(view, 'map');
    clickByText(tree, 'My Schedule'); assert.equal(opened, true); assert.equal(scrolled, 2);
  } finally { globalThis.document = previousDocument; globalThis.window = previousWindow; }
});

test('homepage category links/CTAs have valid destinations and both preview cards select actual events', () => {
  const chosen = [];
  const tree = components.AroundSCHero({ events, onSelectEvent: (event) => chosen.push(event.id) });
  const links = nodes(tree).filter((node) => node.type === components.PageLink);
  assert.ok(links.some((node) => node.props.href === '/discover'));
  for (const category of ['Academic', 'Social', 'Career', 'Athletics', 'Arts', 'Workshop']) assert.ok(links.some((node) => node.props.href === `/discover?category=${category}`));
  const featured = nodes(tree).find((node) => node.type === components.FeaturedEventCard);
  components.FeaturedEventCard(featured.props).props.onClick();
  nodes(tree).find((node) => node.props?.className === 'pulse-next-card').props.onClick();
  assert.equal(chosen.length, 2);
  assert.ok(chosen.every((id) => events.some((event) => event.id === id)));
});

test('event card title, RSVP and cancellation callbacks target the right event', () => {
  const choices = [], rsvps = [];
  const props = { event: curated, conflictInfo: { hasConflict: false }, onSelectEvent: (event) => choices.push(event.id), onRsvpClick: (event) => rsvps.push(event.id) };
  const normal = components.EventCard({ ...props, isRsvpd: false });
  clickByText(normal, curated.title); clickByText(normal, 'RSVP locally');
  const saved = components.EventCard({ ...props, isRsvpd: true });
  nodes(saved).find((node) => node.props?.title === 'Remove local RSVP').props.onClick();
  assert.deepEqual(choices, [curated.id]); assert.deepEqual(rsvps, [curated.id, curated.id]);
  const links = nodes(saved).filter((node) => node.type === 'a').map((node) => node.props.href);
  assert.ok(links.includes(curated.sourceUrl)); assert.ok(links.includes(curated.registrationUrl));
  assert.ok(links.includes(getGoogleCalendarUrl(curated)));
});

test('all curated records preserve exact source/registration links in existing details; dialogs are named', () => {
  for (const event of events.filter((entry) => entry.dataset === 'verified')) {
    const html = renderToStaticMarkup(React.createElement(components.EventDetailModal, { event, isOpen: true, conflictInfo: { hasConflict: false } }));
    assert.ok(html.includes('role="dialog"')); assert.ok(html.includes('aria-modal="true"')); assert.ok(html.includes('aria-label="Close dialog"'));
    assert.ok(html.includes(event.sourceUrl)); assert.ok(html.includes(event.registrationUrl.replace(/&/g, '&amp;'))); assert.ok(html.includes(event.eligibility));
  }
  const conflict = renderToStaticMarkup(React.createElement(components.ConflictModal, { event: curated, isOpen: true, conflictingClass: MOCK_STUDENT_SCHEDULE[0] }));
  assert.ok(conflict.includes('z-index:60')); assert.ok(conflict.includes('RSVP Anyway')); assert.ok(conflict.includes('Cancel'));
  const schedule = renderToStaticMarkup(React.createElement(components.ScheduleModal, { isOpen: true, schedule: MOCK_STUDENT_SCHEDULE }));
  for (const block of MOCK_STUDENT_SCHEDULE) assert.ok(schedule.includes(block.code));
  assert.ok(schedule.includes('aria-labelledby="schedule-title"'));
});

test('ICS export executes browser download operations using an API double and cleans up its Blob URL', async () => {
  const originalDocument = globalThis.document, originalSetTimeout = globalThis.setTimeout;
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  let blob, clicked = false, removed = false, anchor, cleanup, revoked;
  globalThis.document = { createElement: () => (anchor = { click: () => { clicked = true; }, remove: () => { removed = true; } }), body: { appendChild: () => {} } };
  URL.createObjectURL = (value) => { blob = value; return 'blob:audit'; };
  URL.revokeObjectURL = (value) => { revoked = value; };
  globalThis.setTimeout = (fn) => { cleanup = fn; };
  try {
    downloadIcsFile(curated);
    assert.equal(clicked, true); assert.equal(removed, true);
    assert.equal(anchor.href, 'blob:audit'); assert.equal(anchor.download, `${curated.id}-aroundSC.ics`);
    assert.ok((await blob.text()).replace(/\r\n /g, '').includes(curated.sourceUrl));
    cleanup(); assert.equal(revoked, 'blob:audit');
  } finally {
    globalThis.document = originalDocument; globalThis.setTimeout = originalSetTimeout;
    URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  }
});

test('marker layout preserves identities, separates shared venues in screen space and keeps all coordinates exact', () => {
  const result = layoutMapEvents(events);
  assert.equal(result.length, events.length);
  assert.deepEqual(result.map((entry) => entry.event.id), events.map((event) => event.id));
  for (const entry of result) assert.deepEqual(entry.coordinates, entry.event.location.coordinates);
  const tcc = result.filter((entry) => entry.event.location.code === 'TCC');
  assert.equal(new Set(tcc.map((entry) => entry.offset.join(','))).size, tcc.length);
  const [x, y] = projectCoords(-118.285, 34.0215);
  assert.ok(Math.abs(x - 500) < .00001); assert.ok(Math.abs(y - 310) < .00001);
  assert.equal(nextZoom(2.5, .25), 2.5); assert.equal(nextZoom(.7, -.25), .7);
  assert.equal(isActivationKey('Enter'), true); assert.equal(isActivationKey(' '), true); assert.equal(isActivationKey('Tab'), false);
});

test('2D map renders one named keyboard marker per filtered event without hover/position transform collision', () => {
  const filtered = filterEvents(events, { categoryFilter: 'Arts' }, now);
  const html = renderToStaticMarkup(React.createElement(components.MapView, { events: filtered, schedule: [], rsvpIds: [], checkConflict: checkCalendarConflict }));
  assert.equal((html.match(/class="map-event-marker cursor-pointer"/g) || []).length, filtered.length);
  assert.equal((html.match(/role="button" tabindex="0"/g) || []).length, filtered.length);
  assert.ok(!html.includes('hover:scale-125'));
  for (const event of filtered) assert.ok(html.includes(`aria-label="View event: ${event.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`));
});

function engineDouble({ supported = true, throws = false } = {}) {
  const handlers = {}, calls = [], timers = new Map(); let sequence = 0;
  const engine = { supported: () => supported, AttributionControl: class {}, Map: class {
    constructor(options) { if (throws) throw new Error('WebGL failed'); calls.push(['construct', options]); }
    on(name, fn) { handlers[name] = fn; }
    addControl() {} resize() { calls.push(['resize']); } remove() { calls.push(['remove']); }
  } };
  return { engine, calls, handlers, timers: { setTimeout: (fn) => { timers.set(++sequence, fn); return sequence; }, clearTimeout: (id) => timers.delete(id) }, pending: timers };
}

test('vector lifecycle resizes on load, cancels its timeout and disposes once (engine double, not WebGL)', () => {
  const fake = engineDouble(); let ready = 0;
  const session = startVectorMap({ ...fake, container: {}, onReady: () => { ready += 1; }, onUnavailable: () => assert.fail('unexpected fallback') });
  fake.handlers.load(); assert.equal(ready, 1); assert.ok(fake.calls.some(([name]) => name === 'resize')); assert.equal(fake.pending.size, 0);
  session.dispose(); session.dispose(); fake.handlers.load();
  assert.equal(ready, 1); assert.equal(fake.calls.filter(([name]) => name === 'remove').length, 1);
});

test('vector unsupported, constructor error, tile error and timeout paths request visible fallback', () => {
  for (const kind of ['unsupported', 'constructor', 'error', 'timeout']) {
    const fake = engineDouble({ supported: kind !== 'unsupported', throws: kind === 'constructor' });
    const messages = [];
    const session = startVectorMap({ ...fake, container: {}, onReady: () => assert.fail('failed renderer must not become ready'), onUnavailable: (value) => messages.push(value) });
    if (kind === 'error') fake.handlers.error();
    if (kind === 'timeout') [...fake.pending.values()][0]();
    assert.equal(messages.length, 1, kind); assert.ok(messages[0].includes('2D campus radar'));
    session.dispose();
  }
});

function dialogDouble() {
  const listeners = new Set();
  const doc = { body: { style: { overflow: 'auto' } }, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const trigger = { isConnected: true, focus() { doc.activeElement = this; } }; doc.activeElement = trigger;
  const make = () => {
    const elements = [0, 1].map(() => ({ isConnected: true, focus() { doc.activeElement = this; } }));
    return { ownerDocument: doc, elements, querySelectorAll: () => elements, contains: (element) => elements.includes(element), focus() { doc.activeElement = this; } };
  };
  const key = (value, shiftKey = false) => {
    const event = { key: value, shiftKey, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() {} };
    for (const fn of listeners) fn(event);
    return event;
  };
  return { doc, trigger, make, key, listeners };
}

test('dialog adapter executes focus wrapping, Escape close, restoration and scroll unlock with a DOM double', () => {
  const env = dialogDouble(); const dialog = env.make(); let closed = 0;
  const cleanup = activateDialog(dialog, () => { closed += 1; });
  assert.equal(env.doc.activeElement, dialog.elements[0]); assert.equal(env.doc.body.style.overflow, 'hidden');
  assert.equal(env.key('Tab', true).prevented, true); assert.equal(env.doc.activeElement, dialog.elements[1]);
  env.key('Tab'); assert.equal(env.doc.activeElement, dialog.elements[0]);
  env.key('Escape'); assert.equal(closed, 1);
  cleanup(); assert.equal(env.doc.activeElement, env.trigger); assert.equal(env.doc.body.style.overflow, 'auto'); assert.equal(env.listeners.size, 0);
});

test('nested conflict dialog handles Escape independently and keeps underlying details locked', () => {
  const env = dialogDouble(); const details = env.make(), warning = env.make(); let detailClose = 0, warningClose = 0;
  const closeDetails = activateDialog(details, () => { detailClose += 1; });
  const closeWarning = activateDialog(warning, () => { warningClose += 1; });
  env.key('Escape'); assert.equal(warningClose, 1); assert.equal(detailClose, 0);
  closeWarning(); assert.equal(env.doc.body.style.overflow, 'hidden'); assert.equal(env.doc.activeElement, details.elements[0]);
  env.key('Escape'); assert.equal(detailClose, 1); closeDetails(); assert.equal(env.doc.body.style.overflow, 'auto');
});

test('error boundary retry and switch-to-list callbacks execute (class-level test, not browser error recovery)', () => {
  let switched = false;
  const boundary = new components.ErrorBoundary({ children: 'MAP', onSwitchToList: () => { switched = true; } });
  boundary.state = { hasError: true, error: new Error('test') };
  boundary.setState = (update) => { boundary.state = { ...boundary.state, ...update }; };
  const tree = boundary.render();
  const buttons = nodes(tree).filter((node) => node.type === 'button');
  assert.equal(buttons.length, 2);
  buttons[1].props.onClick(); assert.equal(switched, true);
  buttons[0].props.onClick(); assert.equal(boundary.state.hasError, false);
  assert.equal(boundary.render(), 'MAP');
});

// No network requests: source links are checked for structural validity and exact preservation.
test('all source/registration URLs have valid protocols; homepage hash links target existing sections', () => {
  for (const event of events) {
    for (const value of [event.sourceUrl || event.externalUrl, event.registrationUrl].filter(Boolean)) assert.ok(['http:', 'https:'].includes(new URL(value).protocol));
  }
  const html = renderToStaticMarkup(React.createElement(components.LandingPage, { events }));
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), id);
});
