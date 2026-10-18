import test from 'node:test';
import assert from 'node:assert/strict';
import { RAW_EVENTS } from '../src/data/eventsData.js';
import { VERIFIED_EVENT_RECORDS, VERIFIED_CHECKED_AT } from '../src/data/verifiedEvents.js';
import { buildShowcaseCollection } from '../src/utils/eventAdapter.js';
import { loadShowcaseRsvps, SHOWCASE_RSVP_KEY } from '../src/utils/rsvpStorage.js';
import { parseDiscoveryRequest } from '../src/utils/discoveryParser.js';
import { matchesDiscovery } from '../src/utils/discoveryMatching.js';

const now = new Date(VERIFIED_CHECKED_AT);
const build = (samples, records = []) => buildShowcaseCollection(samples, records, { now });
const sample = RAW_EVENTS[0];
const curated = VERIFIED_EVENT_RECORDS[0];
const storage = (values) => ({ getItem: (key) => key in values ? JSON.stringify(values[key]) : null });

test('actual collection has 32 samples and two curated events with no duplicate IDs or identities', () => {
  const result = build(RAW_EVENTS, VERIFIED_EVENT_RECORDS);
  assert.equal(result.events.length, 34);
  assert.equal(result.events.filter((event) => event.dataset === 'sample').length, 32);
  assert.equal(result.events.filter((event) => event.dataset === 'verified').length, 2);
  assert.equal(new Set(result.events.map((event) => event.id)).size, 34);
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.collisions, []);
  assert.deepEqual(result.excluded, []);
  for (const record of VERIFIED_EVENT_RECORDS) {
    const event = result.events.find((entry) => entry.id === record.id);
    for (const field of ['sourceUrl', 'registrationUrl', 'eligibility', 'verifiedAt', 'verificationNote']) assert.equal(event[field], record[field]);
    assert.deepEqual(event.location, record.location);
  }
  assert.ok(result.events.filter((event) => event.dataset === 'sample').every((event) => !event.verifiedAt));
});

test('duplicate representations collapse with curated provenance preferred and legacy IDs aliased', () => {
  const representation = { ...curated, id: 'sample-copy', sourceUrl: undefined, verifiedAt: undefined };
  const result = build([representation], [curated]);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].dataset, 'verified');
  assert.equal(result.events[0].sourceUrl, curated.sourceUrl);
  assert.equal(result.aliases.sample['sample-copy'], curated.id);
  assert.equal(result.duplicates.length, 1);
});

test('shared IDs do not merge unrelated events and replacement IDs do not collide with reserved IDs', () => {
  const sampleCollision = { ...sample, id: curated.id };
  const reserved = { ...RAW_EVENTS[1], id: `sample:${curated.id}` };
  const result = build([sampleCollision, reserved], [curated]);
  assert.equal(result.events.length, 3);
  assert.equal(new Set(result.events.map((event) => event.id)).size, 3);
  assert.equal(result.aliases.verified[curated.id], curated.id);
  assert.equal(result.aliases.sample[curated.id], `sample:${curated.id}:2`);
  assert.equal(result.collisions.length, 1);
  // Even curated records sharing an ID must reach the collection's identity check.
  const other = { ...VERIFIED_EVENT_RECORDS[1], id: curated.id };
  const both = build([], [curated, other]);
  assert.equal(both.events.length, 2);
  assert.equal(both.collisions.length, 1);
});

test('same titles, organizer homepages or venues alone never establish event identity', () => {
  const variants = [
    sample,
    { ...sample, id: 'other-organizer', organizer: 'Different organizer' },
    { ...sample, id: 'other-room', room: 'Different room' },
    { ...sample, id: 'other-time', startTime: new Date(Date.parse(sample.startTime) + 60000).toISOString() },
    { ...sample, id: 'other-title', title: 'Different event' },
  ];
  assert.equal(build(variants).events.length, variants.length);
  assert.equal(build([sample, { ...sample, id: 'copy', title: `  ${sample.title.toUpperCase()}  ` }]).events.length, 1);
});

test('event-specific URLs can establish identity but general source URLs cannot merge unrelated titles', () => {
  const copy = { ...curated, id: 'copy', organizer: 'Alternate publisher', sourceUrl: `${curated.sourceUrl}/?utm_source=demo` };
  assert.equal(build([copy], [curated]).events.length, 1);
  assert.equal(build([{ ...copy, title: 'A distinct session' }], [curated]).events.length, 2);
});

test('unified discovery sees both record types and can match the curated date without a mode switch', () => {
  const result = build(RAW_EVENTS, VERIFIED_EVENT_RECORDS);
  const criteria = parseDiscoveryRequest('Find arts or workshop events on 2026-10-20', { now });
  assert.deepEqual(criteria.errors, []);
  const matches = result.events.filter((event) => matchesDiscovery(event, criteria));
  for (const record of VERIFIED_EVENT_RECORDS) assert.ok(matches.some((event) => event.id === record.id));
  assert.equal(result.events.filter((event) => matchesDiscovery(event, null)).length, 34);
});

test('RSVP migration keeps both old lists, maps duplicate IDs, and never resurrects removed RSVPs', () => {
  const result = build([{ ...curated, id: 'sample-copy' }], [curated]);
  assert.deepEqual(loadShowcaseRsvps(storage({ aroundsc_rsvps: ['sample-copy'], aroundsc_verified_rsvps: [curated.id] }), result.aliases), [curated.id]);
  assert.deepEqual(loadShowcaseRsvps(storage({ [SHOWCASE_RSVP_KEY]: [], aroundsc_rsvps: ['sample-copy'], aroundsc_verified_rsvps: [curated.id] }), result.aliases), []);
  assert.deepEqual(loadShowcaseRsvps(storage({ [SHOWCASE_RSVP_KEY]: ['evt-01', 'evt-01', 2] }), result.aliases), ['evt-01']);
  assert.deepEqual(loadShowcaseRsvps(null, result.aliases), []);
  const collision = build([{ ...sample, id: curated.id }], [curated]);
  assert.deepEqual(loadShowcaseRsvps(storage({ aroundsc_rsvps: [curated.id], aroundsc_verified_rsvps: [curated.id] }), collision.aliases), [`sample:${curated.id}`, curated.id]);
});
