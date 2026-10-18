import { CAMPUS_TIMEZONE } from './discoveryParser.js';

const categories = ['Academic', 'Social', 'Career', 'Athletics', 'Arts', 'Workshop'];
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const url = (value) => {
  try { return typeof value === 'string' && !/[\r\n]/.test(value) && ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
};
const officialUrl = (value) => url(value) && (new URL(value).hostname === 'usc.edu' || new URL(value).hostname.endsWith('.usc.edu'));
const timestamp = (value) => typeof value === 'string' && /T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export const hasCoordinates = (location) => Array.isArray(location?.coordinates) && location.coordinates.length === 2
  && location.coordinates.every(Number.isFinite) && Math.abs(location.coordinates[0]) <= 180 && Math.abs(location.coordinates[1]) <= 90;

// Pure adapter. mapOnly:false preserves future list-only records without making up a map point.
// Returns diagnostics rather than falling back to sample events on any error.
export function adaptVerifiedEvents(records, { now = new Date(), mapOnly = true, deduplicate = true } = {}) {
  const events = [];
  const excluded = [];
  const seenIds = new Set();
  const seenOccurrences = new Set();
  if (!Array.isArray(records)) return { events, excluded: [{ id: null, reason: 'Verified data is unavailable or malformed.' }] };
  for (const record of records) {
    const reject = (reason) => excluded.push({ id: record?.id || null, reason });
    if (!record || !text(record.id) || !text(record.title) || !text(record.organizer) || !text(record.description)
      || !categories.includes(record.category) || !Array.isArray(record.tags) || !record.tags.every(text)) {
      reject('Missing or invalid identity/content fields.'); continue;
    }
    if (!officialUrl(record.sourceUrl) || !text(record.sourcePublisher) || !timestamp(record.verifiedAt) || Date.parse(record.verifiedAt) > now.getTime()
      || !text(record.verificationNote) || !text(record.admission) || !text(record.eligibility)) {
      reject('Missing official source, review timestamp or admission/eligibility evidence.'); continue;
    }
    if (!timestamp(record.startTime) || !timestamp(record.endTime) || record.timeZone !== CAMPUS_TIMEZONE
      || Date.parse(record.endTime) <= Date.parse(record.startTime)) {
      reject('Missing valid, timezone-qualified event interval.'); continue;
    }
    if (record.status !== 'scheduled') { reject('Cancelled, postponed or unconfirmed status.'); continue; }
    if (Date.parse(record.startTime) <= now.getTime()) { reject('No longer upcoming.'); continue; }
    if (!text(record.location?.name) || (record.registrationUrl != null && !url(record.registrationUrl))) {
      reject('Missing named venue or invalid registration URL.'); continue;
    }
    const mapped = hasCoordinates(record.location) && officialUrl(record.location.coordinateSourceUrl)
      && text(record.location.coordinateEvidence) && timestamp(record.location.coordinatesVerifiedAt)
      && Date.parse(record.location.coordinatesVerifiedAt) <= now.getTime();
    if (mapOnly && !mapped) { reject('Missing verified coordinate provenance.'); continue; }
    if (record.freeFood != null && typeof record.freeFood !== 'boolean') { reject('Invalid food value.'); continue; }
    if (record.attendeesCount != null && (!Number.isInteger(record.attendeesCount) || record.attendeesCount < 0)) {
      reject('Invalid attendance value.'); continue;
    }
    const occurrence = `${record.sourceUrl}|${Date.parse(record.startTime)}`;
    if (deduplicate && (seenIds.has(record.id) || seenOccurrences.has(occurrence))) { reject('Duplicate occurrence.'); continue; }
    seenIds.add(record.id); seenOccurrences.add(occurrence);
    events.push({
      ...record, dataset: 'verified', externalUrl: record.sourceUrl,
      location: { ...record.location, code: record.location.code || '', area: record.location.area || '', coordinates: mapped ? [...record.location.coordinates] : null },
      room: record.room || '', freeFood: record.freeFood ?? null,
      foodDescription: record.foodDescription ?? null, attendeesCount: record.attendeesCount ?? null,
      tags: [...record.tags],
    });
  }
  events.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return { events, excluded };
}

const normalized = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const canonicalEventUrl = (event) => {
  const value = event.sourceUrl || event.externalUrl;
  if (!url(value)) return null;
  const parsed = new URL(value);
  // Sample organizer homepages are not event identities. Only explicit event-detail paths qualify.
  if (!/\/events?\/[^/]+|\/event_details\.php$/i.test(parsed.pathname)) return null;
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/i.test(key)) parsed.searchParams.delete(key);
  parsed.pathname = parsed.pathname.replace(/\/$/, '');
  parsed.searchParams.sort();
  return parsed.href;
};

// Conservative equality: exact interval and venue/room, then matching title+organizer or
// matching event-detail URL+title. No fuzzy titles, shared-homepage or proximity-only merging.
const identityKeys = (event) => {
  const interval = [Date.parse(event.startTime), Date.parse(event.endTime)];
  const venue = [normalized(event.location.code || event.location.name), normalized(event.room)];
  const title = normalized(event.title);
  const keys = [JSON.stringify(['details', title, normalized(event.organizer), ...interval, ...venue])];
  const source = canonicalEventUrl(event);
  if (source) keys.push(JSON.stringify(['source', source, title, ...interval, ...venue]));
  return keys;
};

export function buildShowcaseCollection(samples, curatedRecords, options = {}) {
  const curated = adaptVerifiedEvents(curatedRecords, { ...options, deduplicate: false });
  const events = [];
  const duplicates = [];
  const collisions = [];
  const excluded = [...curated.excluded];
  const aliases = { sample: {}, verified: {} };
  const seenKeys = new Map();
  const usedIds = new Set();
  const sampleEvents = Array.isArray(samples) ? samples : [];
  const reservedIds = new Set([...sampleEvents, ...curated.events].map((event) => event?.id));
  // Curated records win only when identity is established, so their provenance is never lost.
  for (const event of [...curated.events, ...sampleEvents.map((record) => ({ ...record, dataset: 'sample' }))]) {
    if (!text(event.id) || !text(event.title) || !text(event.organizer) || !text(event.description)
      || !categories.includes(event.category) || (!Array.isArray(event.tags) || !event.tags.every(text)) || !hasCoordinates(event.location)
      || !timestamp(event.startTime) || !timestamp(event.endTime) || Date.parse(event.endTime) <= Date.parse(event.startTime)) {
      excluded.push({ id: event.id, reason: 'Invalid showcase event shape or missing map coordinates.' }); continue;
    }
    const keys = identityKeys(event);
    const duplicate = keys.map((key) => seenKeys.get(key)).find(Boolean);
    if (duplicate) {
      aliases[event.dataset][event.id] = duplicate.id;
      duplicates.push({ id: event.id, keptId: duplicate.id, reason: 'Same event identity, interval and venue/room.' });
      continue;
    }
    let id = event.id;
    if (usedIds.has(id)) {
      const prefix = `${event.dataset}:${event.id}`;
      id = prefix;
      for (let suffix = 2; usedIds.has(id) || reservedIds.has(id); suffix += 1) id = `${prefix}:${suffix}`;
      collisions.push({ id: event.id, assignedId: id, reason: 'Shared ID represents distinct events; both retained.' });
    }
    const output = { ...event, id, room: event.room || '', location: { ...event.location, code: event.location.code || '' } };
    aliases[event.dataset][event.id] ??= id;
    usedIds.add(id);
    for (const key of keys) seenKeys.set(key, output);
    events.push(output);
  }
  events.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return { events, aliases, duplicates, collisions, excluded };
}
