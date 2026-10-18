import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiscoveryRequest, campusDateParts } from '../src/utils/discoveryParser.js';
import { matchesDiscovery, distanceMeters } from '../src/utils/discoveryMatching.js';
import { CAMPUS_LOCATIONS } from '../src/data/campusLocations.js';

const now = new Date('2026-10-17T19:00:00Z');
const parse = (text) => parseDiscoveryRequest(text, { now });
const fixture = (overrides = {}) => ({
  id: 'test', title: 'AI coding workshop', description: 'Build software together',
  tags: ['Tech'], category: 'Workshop', location: CAMPUS_LOCATIONS.TCC,
  startTime: '2026-10-17T22:00:00Z', endTime: '2026-10-17T23:00:00Z', freeFood: false,
  ...overrides,
});

test('example extracts OR interests, time window, unknown buildings and hard deadline', () => {
  const result = parse("I'm free from 3:00–4:00 PM near Popovich Hall (JKP). Find painting events, tech events or coffee chats I can attend before my next class in Hoffman Hall (HOH) at 4:00 PM.");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.criteria.interests, ['technology', 'painting', 'coffeeChats']);
  assert.equal(result.criteria.startMinutes, 900);
  assert.equal(result.criteria.endMinutes, 960);
  assert.equal(result.criteria.deadlineMinutes, 960);
  assert.equal(result.criteria.date, '2026-10-17');
  assert.equal(result.unresolvedLocations.length, 2);
  assert.equal(matchesDiscovery(fixture(), result), false);
  assert.equal(matchesDiscovery(fixture(), result, { ignoreLocations: true }), true);
});

test('supported named and coded buildings resolve without confusion between origin and destination', () => {
  const result = parse('Find tech events near Ronald Tutor Campus Center (TCC) before my next class in Fertitta Hall at 4 PM');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.unresolvedLocations, []);
  assert.equal(result.criteria.origin.code, 'TCC');
  assert.equal(result.criteria.destination.code, 'JFF');
});

test('ambiguous times, contradictory ranges, multiple windows and unsupported constraints block search', () => {
  for (const request of ['tech from 3 to 4', 'tech from 4 PM to 3 PM', 'tech from 3-4 PM from 5-6 PM', 'tech before my next class at 4', 'tech today tomorrow', 'tech not sports', 'tech after 4 PM', 'quiet tech events', 'tech next Monday', 'tech within a 10 minute walk', 'tech from 3-4 PM before 2 PM']) {
    const result = parse(request);
    assert.ok(result.errors.length, request);
    assert.equal(matchesDiscovery(fixture(), result, { ignoreLocations: true }), false, request);
  }
});

test('empty and wholly unsupported requests do not silently return events', () => {
  for (const request of ['', 'surprise me', 'pottery events']) {
    const result = parse(request);
    assert.ok(result.errors.length);
    assert.equal(matchesDiscovery(fixture(), result), false);
  }
});

test('campus date and tomorrow use Los Angeles, including UTC date boundary and month rollover', () => {
  assert.equal(campusDateParts(new Date('2026-11-01T01:00:00Z')).date, '2026-10-31');
  assert.equal(parseDiscoveryRequest('tech tomorrow', { now: new Date('2026-11-01T01:00:00Z') }).criteria.date, '2026-11-01');
  assert.equal(parseDiscoveryRequest('tech tomorrow', { now: new Date('2026-12-31T20:00:00Z') }).criteria.date, '2027-01-01');
});

test('full event must fit window and earlier next-class deadline', () => {
  const result = parse('tech from 3-5 PM before my next class at 4 PM');
  assert.deepEqual(result.errors, []);
  assert.equal(matchesDiscovery(fixture(), result), true); // exactly 4 PM
  assert.equal(matchesDiscovery(fixture({ endTime: '2026-10-17T23:00:01Z' }), result), false);
  assert.equal(matchesDiscovery(fixture({ endTime: '2026-10-17T23:01:00Z' }), result), false);
  assert.equal(matchesDiscovery(fixture({ startTime: '2026-10-17T21:59:00Z' }), result), false);
  assert.equal(matchesDiscovery(fixture({ endTime: '2026-10-18T07:00:00Z' }), result), false);
  assert.equal(matchesDiscovery(fixture({ endTime: 'invalid' }), result), false);
});

test('interests are OR; other criteria and existing filters combine as AND', () => {
  const result = parse('painting or tech from 3-4 PM near TCC with free food');
  assert.deepEqual(result.errors, []);
  const events = [fixture({ id: 'a', freeFood: true }), fixture({ id: 'b', title: 'Painting', description: '', tags: [], freeFood: true }), fixture({ id: 'c' }), fixture({ id: 'd', freeFood: true, location: CAMPUS_LOCATIONS.GALEN })];
  const matched = events.filter((event) => matchesDiscovery(event, result));
  assert.deepEqual(matched.map((event) => event.id), ['a', 'b']);
  assert.deepEqual(matched.filter((event) => event.category === 'Arts'), []);
});

test('specific painting does not expand to arts; free coffee does not mean coffee chat', () => {
  const arts = fixture({ title: 'Orchestra concert', description: 'Music', tags: [], category: 'Arts' });
  assert.equal(matchesDiscovery(arts, parse('painting today')), false);
  assert.equal(matchesDiscovery(arts, parse('arts today')), true);
  const coffee = fixture({ title: 'Study jam', description: 'Free coffee', tags: [] });
  assert.equal(matchesDiscovery(coffee, parse('coffee chats today')), false);
  assert.equal(matchesDiscovery({ ...coffee, title: 'Coffee networking chat' }, parse('coffee chats today')), true);
});

test('explicit bypass of unknown destination preserves recognized origin and deadline', () => {
  const result = parse('tech near TCC before my next class in HOH at 4 PM');
  assert.equal(matchesDiscovery(fixture(), result), false);
  assert.equal(matchesDiscovery(fixture(), result, { ignoreLocations: true }), true);
  assert.equal(matchesDiscovery(fixture({ location: CAMPUS_LOCATIONS.GALEN }), result, { ignoreLocations: true }), false);
  assert.equal(matchesDiscovery(fixture({ endTime: '2026-10-17T23:30:00Z' }), result, { ignoreLocations: true }), false);
});

test('distance boundaries use coordinates, without estimating walking times', () => {
  const result = parse('tech near TCC');
  assert.equal(distanceMeters(CAMPUS_LOCATIONS.TCC.coordinates, CAMPUS_LOCATIONS.TCC.coordinates), 0);
  const location = { coordinates: [-118.2863, 34.0203 + 299 / 111194.9266] };
  assert.equal(matchesDiscovery(fixture({ location }), result), true);
  location.coordinates[1] = 34.0203 + 301 / 111194.9266;
  assert.equal(matchesDiscovery(fixture({ location }), result), false);
});

test('no active Ask search preserves existing input, and requests can genuinely have zero matches', () => {
  assert.equal(matchesDiscovery(fixture(), null), true);
  assert.equal([fixture()].filter((event) => matchesDiscovery(event, parse('painting today'))).length, 0);
});

test('location modifiers and conflicting building codes are not silently discarded', () => {
  for (const request of ['tech near TCC within 10 minutes', 'tech near TCC (HOH)', 'tech near TCC or SAL']) {
    const result = parse(request);
    assert.ok(result.errors.length || result.unresolvedLocations.length, request);
    assert.equal(matchesDiscovery(fixture(), result), false, request);
  }
});

test('free admission and unspecified availability are not confused with free food or a time window', () => {
  for (const request of ['free tech events', "I'm free, find tech events"]) {
    assert.ok(parse(request).errors.length, request);
  }
  assert.deepEqual(parse("I'm available from 3-4 PM. Find tech events").errors, []);
  assert.deepEqual(parse('Find tech events with free food').errors, []);
});

test('24-hour times work and dates use campus daylight saving time', () => {
  const result = parse('tech from 15:00 to 16:00');
  assert.deepEqual(result.errors, []);
  assert.equal(matchesDiscovery(fixture(), result), true);
  const winter = parseDiscoveryRequest('tech from 3-4 PM', { now: new Date('2026-12-17T20:00:00Z') });
  assert.equal(matchesDiscovery(fixture({ startTime: '2026-12-17T23:00:00Z', endTime: '2026-12-18T00:00:00Z' }), winter), true);
});

test('explicit calendar dates support upcoming demo searches without shifting events', () => {
  const result = parse('Find workshop events on 2026-10-20');
  assert.deepEqual(result.errors, []);
  assert.equal(result.criteria.date, '2026-10-20');
  assert.equal(result.warnings.some((warning) => warning.includes('assuming today')), false);
  assert.deepEqual(parse('2026-10-20').errors, []);
  for (const request of ['tech on 2026-02-30', 'tech on 2026-13-01', 'tech today on 2026-10-20', 'tech on 2026-10-20 or 2026-10-21']) {
    assert.ok(parse(request).errors.length, request);
  }
});

test('verified collection requires reviewed starting coordinates; sample behavior remains unchanged', () => {
  const result = parseDiscoveryRequest('tech near TCC', { now, requireVerifiedLocations: true });
  assert.equal(result.unresolvedLocations.length, 1);
  assert.equal(matchesDiscovery(fixture(), result), false);
  assert.equal(parse('tech near TCC').unresolvedLocations.length, 0);
  assert.equal(parseDiscoveryRequest('workshop near DML', { now, requireVerifiedLocations: true }).unresolvedLocations.length, 0);
});
