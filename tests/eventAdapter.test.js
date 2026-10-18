import test from 'node:test';
import assert from 'node:assert/strict';
import { VERIFIED_EVENT_RECORDS, VERIFIED_CHECKED_AT } from '../src/data/verifiedEvents.js';
import { adaptVerifiedEvents, hasCoordinates } from '../src/utils/eventAdapter.js';
import { parseDiscoveryRequest } from '../src/utils/discoveryParser.js';
import { matchesDiscovery } from '../src/utils/discoveryMatching.js';
import { campusTimeToIso, formatEventDateTime, isEventToday, checkCalendarConflict, getGoogleCalendarUrl, getIcsContent } from '../src/utils/calendar.js';

// Tests use the real curated records; mutations below exercise validation, never enter demo data.
const now = new Date(VERIFIED_CHECKED_AT);
const base = VERIFIED_EVENT_RECORDS[0];
const clone = () => structuredClone(base);
const adapt = (records, options = {}) => adaptVerifiedEvents(records, { now, ...options });

test('every curated record passes the upcoming map admission gate at review time', () => {
  const catalog = adapt(VERIFIED_EVENT_RECORDS);
  assert.deepEqual(catalog.excluded, []);
  assert.equal(catalog.events.length, VERIFIED_EVENT_RECORDS.length);
  for (const event of catalog.events) {
    assert.equal(event.dataset, 'verified');
    assert.equal(event.externalUrl, event.sourceUrl);
    assert.ok(event.sourceUrl.startsWith('https://calendar.usc.edu/event/'));
    assert.ok(hasCoordinates(event.location));
    assert.ok(event.location.coordinateEvidence.includes('center='));
    assert.equal(event.freeFood, null);
    assert.equal(event.attendeesCount, null);
    const original = VERIFIED_EVENT_RECORDS.find((record) => record.id === event.id);
    assert.equal(event.registrationUrl, original.registrationUrl);
    assert.equal(event.startTime, original.startTime);
  }
});

test('no malformed dataset, cancelled record, expired record or missing provenance triggers a fallback', () => {
  assert.equal(adapt(null).events.length, 0);
  for (const change of [
    { status: 'cancelled' }, { status: 'postponed' }, { endTime: null },
    { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://example.com/event' },
    { verifiedAt: '2027-01-01T00:00:00Z' }, { admission: null },
    { eligibility: null }, { registrationUrl: 'javascript:alert(1)' },
  ]) {
    const result = adapt([{ ...clone(), ...change }]);
    assert.equal(result.events.length, 0);
    assert.equal(result.excluded.length, 1);
  }
  assert.equal(adapt([base], { now: new Date(base.endTime) }).events.length, 0);
  assert.equal(adapt([base], { now: new Date(base.startTime) }).events.length, 0);
  const record = clone(); delete record.location.coordinateSourceUrl;
  assert.equal(adapt([record]).events.length, 0);
});

test('future list-only mode preserves missing coordinates without admitting them into the map collection', () => {
  const record = clone(); delete record.location.coordinates;
  assert.equal(adapt([record]).events.length, 0);
  const list = adapt([record], { mapOnly: false });
  assert.equal(list.events.length, 1);
  assert.equal(list.events[0].location.coordinates, null);
  record.location.coordinates = [NaN, 34];
  assert.equal(adapt([record]).events.length, 0);
});

test('duplicate occurrences are rejected and output is chronological without modifying source records', () => {
  const input = [VERIFIED_EVENT_RECORDS[0], VERIFIED_EVENT_RECORDS[1], clone()];
  const before = JSON.stringify(input);
  const result = adapt(input);
  assert.equal(result.events.length, 2);
  assert.equal(result.excluded[0].reason, 'Duplicate occurrence.');
  assert.ok(Date.parse(result.events[0].startTime) < Date.parse(result.events[1].startTime));
  assert.equal(JSON.stringify(input), before);
});

test('real curated events flow through explicit-date discovery with deadlines and OR interests', () => {
  const events = adapt(VERIFIED_EVENT_RECORDS).events;
  const parsed = parseDiscoveryRequest('Find arts or workshop events on 2026-10-20 from 5-7 PM before my next class at 7 PM', { now });
  assert.deepEqual(parsed.errors, []);
  assert.equal(events.filter((event) => matchesDiscovery(event, parsed)).length, 2);
  const earlier = parseDiscoveryRequest('Find arts or workshop events on 2026-10-20 before 6 PM', { now });
  assert.equal(events.filter((event) => matchesDiscovery(event, earlier)).length, 0);
  const food = parseDiscoveryRequest('Find arts or workshop events on 2026-10-20 with free food', { now });
  assert.equal(events.filter((event) => matchesDiscovery(event, food)).length, 0);
});

test('calendar display, today and class conflicts use USC time independently of host timezone', () => {
  assert.equal(campusTimeToIso('2026-10-20', 17, 30), '2026-10-21T00:30:00.000Z');
  assert.equal(campusTimeToIso('2026-12-20', 17, 30), '2026-12-21T01:30:00.000Z');
  assert.ok(formatEventDateTime(base.startTime, base.endTime, now).includes('5:30 PM PDT'));
  assert.equal(isEventToday(base.startTime, new Date('2026-10-21T02:00:00Z')), true);
  const schedule = [{ code: 'TEST', title: 'Test schedule block', days: ['Tuesday'], startTime: '18:00', endTime: '19:00', location: 'DML' }];
  assert.equal(checkCalendarConflict(base, schedule).hasConflict, true);
  assert.equal(checkCalendarConflict(base, [{ ...schedule[0], days: ['Wednesday'] }]).hasConflict, false);
});

test('exports preserve actual instants, source, registration, eligibility and local-only RSVP wording', () => {
  const params = new URL(getGoogleCalendarUrl(base)).searchParams;
  assert.equal(params.get('ctz'), 'America/Los_Angeles');
  assert.equal(params.get('dates'), '20261021T003000Z/20261021T020000Z');
  assert.ok(params.get('details').includes(base.sourceUrl));
  assert.ok(params.get('details').includes(base.registrationUrl));
  assert.ok(params.get('details').includes(base.eligibility));
  assert.ok(params.get('details').includes('local only'));
  const ics = getIcsContent(base, now);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('DTSTART:20261021T003000Z'));
  assert.ok(unfolded.includes(`URL:${base.sourceUrl}`));
  assert.ok(unfolded.includes(base.registrationUrl));
  assert.ok(unfolded.includes('local only'));
  assert.equal(unfolded.match(/UID:.*/)[0], getIcsContent(base, new Date('2026-10-19T00:00:00Z')).replace(/\r\n /g, '').match(/UID:.*/)[0]);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
});
