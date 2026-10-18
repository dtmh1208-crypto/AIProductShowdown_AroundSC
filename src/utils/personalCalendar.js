import { campusDateParts, CAMPUS_TIMEZONE } from './discoveryParser.js';

export const PERSONAL_CALENDAR_KEY = 'aroundsc_personal_calendar_v1';
export const MAX_ICS_BYTES = 512 * 1024;
export const MAX_PERSONAL_EVENTS = 1000;
export const addDays = (date, count) => new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export const todayAtCampus = (now = new Date()) => campusDateParts(now).date;
const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
const unescapeText = (text = '') => text.replace(/\\([nN,;\\])/g, (_, char) => /n/i.test(char) ? '\n' : char);

// Resolve wall time against IANA rules, rejecting ambiguous/nonexistent DST times.
export function wallTimeToIso(date, time, zone = CAMPUS_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const target = Date.parse(`${date}T${time}Z`);
  const represent = (instant) => {
    const p = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
    return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  };
  const candidates = new Set();
  for (const delta of [-86400000, 0, 86400000]) {
    const nearby = target + delta;
    const candidate = target - (represent(nearby) - nearby);
    if (represent(candidate) === target) candidates.add(candidate);
  }
  if (candidates.size !== 1) throw new Error('Ambiguous or nonexistent daylight-saving time; export this occurrence with a UTC time.');
  return new Date([...candidates][0]).toISOString();
}
function parseDate(property, warnings) {
  if (!property) throw new Error('Missing start or end time.');
  const { value, params } = property;
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!match) throw new Error('Unsupported date/time format.');
  const [, year, month, day, hour, minute, second, utc] = match;
  const date = `${year}-${month}-${day}`;
  if (!validDate(date)) throw new Error('Invalid calendar date.');
  if (!hour) {
    if (params.TZID || (params.VALUE && params.VALUE !== 'DATE')) throw new Error('Invalid all-day date.');
    return { allDay: true, value: date };
  }
  if (params.VALUE && params.VALUE !== 'DATE-TIME') throw new Error('Unsupported date value type.');
  if (+hour > 23 || +minute > 59 || +second > 59 || (utc && params.TZID)) throw new Error('Invalid calendar time.');
  const time = `${hour}:${minute}:${second}`;
  if (utc) return { allDay: false, value: `${date}T${time}.000Z` };
  if (!params.TZID) warnings.add('Floating times are interpreted in America/Los_Angeles, not the device timezone.');
  return { allDay: false, value: wallTimeToIso(date, time, params.TZID || CAMPUS_TIMEZONE) };
}
export function personalIdentity(event) {
  return JSON.stringify(event.uid ? [event.uid, event.startTime] : [event.title, event.startTime, event.endTime, event.location]);
}
// Only the UID format actually emitted by AroundSC plus the exact occurrence interval
// can identify a saved campus export. Titles alone never establish identity.
export function isImportedCampusOccurrence(personal, campus) {
  return personal?.kind === 'personal' && personal.allDay === false
    && typeof campus?.id === 'string' && personal.uid === `${campus.id}@aroundsc.local`
    && Number.isFinite(Date.parse(personal.startTime)) && Date.parse(personal.endTime) > Date.parse(personal.startTime)
    // Existing ICS exports store whole seconds; retain that known serialization precision.
    && Math.floor(Date.parse(personal.startTime) / 1000) === Math.floor(Date.parse(campus.startTime) / 1000)
    && Math.floor(Date.parse(personal.endTime) / 1000) === Math.floor(Date.parse(campus.endTime) / 1000);
}
export function mergePersonalEvents(existing, incoming, replace = false) {
  const records = new Map((replace ? [] : existing).map((event) => [personalIdentity(event), event]));
  let duplicates = 0;
  for (const event of incoming) {
    const key = personalIdentity(event);
    if (records.has(key)) duplicates += 1;
    else records.set(key, event);
  }
  if (records.size > MAX_PERSONAL_EVENTS) throw new Error(`Keep at most ${MAX_PERSONAL_EVENTS} personal events. Replace or remove an older import first.`);
  return { events: [...records.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)), duplicates };
}
export function parseIcs(text, sourceName = 'Calendar file') {
  if (typeof text !== 'string' || !text.trim()) throw new Error('This calendar file is empty.');
  if (new TextEncoder().encode(text).length > MAX_ICS_BYTES) throw new Error('Choose a calendar export smaller than 512 KB.');
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').trim().split('\n').map((line) => line.replace(/\r$/, ''));
  if (lines[0].toUpperCase() !== 'BEGIN:VCALENDAR' || lines.at(-1).toUpperCase() !== 'END:VCALENDAR') throw new Error('Not a complete iCalendar (.ics) file.');
  if (!lines.some((line) => /^VERSION:2\.0$/i.test(line))) throw new Error('Only iCalendar VERSION:2.0 files are supported.');
  if (lines.some((line) => /^METHOD:CANCEL$/i.test(line))) throw new Error('This is a cancellation notice, not a calendar export. No commitments were imported.');
  const stack = [], blocks = []; let block;
  for (const line of lines) {
    const boundary = /^(BEGIN|END):([A-Z0-9-]+)$/i.exec(line);
    if (boundary) {
      const type = boundary[2].toUpperCase();
      if (boundary[1].toUpperCase() === 'BEGIN') {
        if (type === 'VEVENT') { if (stack.at(-1) !== 'VCALENDAR') throw new Error('Malformed nested event.'); block = []; }
        stack.push(type);
      } else {
        if (stack.pop() !== type) throw new Error('Malformed calendar component boundaries.');
        if (type === 'VEVENT') { blocks.push(block); block = null; }
      }
    } else if (block && stack.at(-1) === 'VEVENT' && line) block.push(line);
  }
  if (stack.length) throw new Error('Incomplete calendar component.');
  if (!blocks.length) throw new Error('No calendar events were found.');
  if (blocks.length > MAX_PERSONAL_EVENTS) throw new Error('This file has too many events. Export a smaller date range (up to 1000 events).');
  const warnings = new Set(), events = [];
  for (const [index, lines] of blocks.entries()) {
    let title = `Event ${index + 1}`;
    try {
      const fields = new Map();
      for (const line of lines) {
        // A colon inside a quoted parameter must not terminate the property name.
        const parts = line.match(/^(?:[^:"]|"[^"]*")+/);
        const split = parts?.[0].length;
        if (!split || line[split] !== ':') throw new Error('Malformed event property.');
        const [rawName, ...parameters] = line.slice(0, split).split(';');
        const name = rawName.toUpperCase(), params = {};
        for (const parameter of parameters) { const eq = parameter.indexOf('='); if (eq < 1) throw new Error('Malformed property parameter.'); params[parameter.slice(0, eq).toUpperCase()] = parameter.slice(eq + 1).replace(/^"|"$/g, ''); }
        if (fields.has(name) && ['UID', 'DTSTART', 'DTEND', 'SUMMARY', 'DURATION'].includes(name)) throw new Error(`Repeated ${name} property.`);
        fields.set(name, { value: line.slice(split + 1), params });
      }
      const value = (name) => fields.get(name)?.value || '';
      title = unescapeText(value('SUMMARY')) || 'Untitled personal commitment';
      if (value('STATUS').toUpperCase() === 'CANCELLED') { warnings.add(`${title}: cancelled event omitted.`); continue; }
      if (['RRULE', 'RDATE', 'EXDATE', 'RECURRENCE-ID'].some((name) => fields.has(name))) throw new Error('Recurring series/overrides are not supported; export individual occurrences. This entire record was skipped.');
      const start = parseDate(fields.get('DTSTART'), warnings);
      let end;
      if (fields.has('DTEND') && fields.has('DURATION')) throw new Error('Both DTEND and DURATION were supplied.');
      if (fields.has('DTEND')) end = parseDate(fields.get('DTEND'), warnings);
      else if (fields.has('DURATION')) {
        const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value('DURATION'));
        if (!match) throw new Error('Unsupported duration.');
        const [, weeks, days, hours, minutes, seconds] = match.map((v, i) => i ? +(v || 0) : v);
        if (start.allDay && (hours || minutes || seconds)) throw new Error('All-day duration must use whole days.');
        end = { allDay: start.allDay, value: start.allDay ? addDays(start.value, weeks * 7 + days) : new Date(Date.parse(start.value) + ((weeks * 7 + days) * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000).toISOString() };
        if (!start.allDay && (weeks || days)) throw new Error('Timed day/week durations are not supported across timezone changes; export DTEND.');
      } else if (start.allDay) end = { allDay: true, value: addDays(start.value, 1) };
      else throw new Error('Timed event needs an explicit end or duration for reliable conflict checks.');
      if (end.allDay !== start.allDay || end.value <= start.value) throw new Error('End must be after start and use the same date type.');
      const event = { kind: 'personal', uid: unescapeText(value('UID')), title, startTime: start.value, endTime: end.value, allDay: start.allDay,
        location: unescapeText(value('LOCATION')), sourceUrl: value('URL'), sourceName: sourceName.slice(0, 200), busy: value('TRANSP').toUpperCase() !== 'TRANSPARENT' };
      event.id = `personal:${personalIdentity(event)}`;
      events.push(event);
    } catch (error) { warnings.add(`${title}: ${error.message}`); }
  }
  const merged = mergePersonalEvents([], events);
  if (merged.duplicates) warnings.add(`${merged.duplicates} duplicate record(s) omitted.`);
  return { events: merged.events, warnings: [...warnings], total: blocks.length };
}
export async function readCalendarFile(file) {
  if (!file || !/\.ics$/i.test(file.name)) throw new Error('Choose an .ics calendar file.');
  if (!file.size) throw new Error('This calendar file is empty.');
  if (file.size > MAX_ICS_BYTES) throw new Error('Choose a calendar export smaller than 512 KB.');
  let text;
  try { text = await file.text(); } catch { throw new Error('This file could not be read. Please export it again.'); }
  return parseIcs(text, file.name);
}
export function isPersonalEvent(event) {
  return event?.kind === 'personal' && typeof event.uid === 'string' && typeof event.title === 'string' && typeof event.id === 'string'
    && typeof event.location === 'string' && typeof event.sourceName === 'string' && typeof event.sourceUrl === 'string' && typeof event.busy === 'boolean'
    && (event.allDay === true ? validDate(event.startTime) && validDate(event.endTime) && event.endTime > event.startTime
      : event.allDay === false && Number.isFinite(Date.parse(event.startTime)) && Date.parse(event.endTime) > Date.parse(event.startTime));
}
export function loadPersonalCalendar(storage) {
  const raw = storage.getItem(PERSONAL_CALENDAR_KEY);
  if (!raw) return { events: [], continued: false, remember: true, useMock: false };
  if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('Saved personal calendar is too large to load safely. Remove it explicitly.');
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.events) || data.events.length > MAX_PERSONAL_EVENTS || !data.events.every(isPersonalEvent)) throw new Error('Saved personal calendar is unreadable. It has not been replaced. Import again or explicitly remove it.');
  return { events: mergePersonalEvents([], data.events).events, continued: Boolean(data.continued), remember: true, useMock: Boolean(data.useMock) };
}
export function savePersonalCalendar(storage, state) {
  if (state.remember) {
    const raw = JSON.stringify({ version: 1, events: state.events, continued: state.continued, useMock: state.useMock });
    if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('Personal calendar is too large to save locally. Use session-only storage or a smaller export.');
    storage.setItem(PERSONAL_CALENDAR_KEY, raw);
  } else storage.removeItem(PERSONAL_CALENDAR_KEY);
}
// Keep failed reads intact until replacement/removal is explicitly acknowledged.
export function persistCalendarChange(storage, current, next, { replaceSaved = false, removeSaved = false } = {}) {
  if (current.loadFailed && !replaceSaved && !removeSaved) return {
    applied: true, state: { ...next, remember: false, loadFailed: true },
    error: 'The saved calendar is unreadable and has been kept unchanged. You can continue in this session; explicitly replace or remove the saved calendar to change data on this device.',
  };
  try {
    savePersonalCalendar(storage, next);
    return { applied: true, state: { ...next, loadFailed: false }, error: '' };
  } catch {
    if (!next.remember) return {
      applied: true, state: { ...next, loadFailed: false },
      error: 'Session-only mode: browser storage could not be accessed. Any previously saved calendar could not be removed; it may return after refresh. Clear this site’s browser storage to remove it from this device. Current changes exist only in memory.',
    };
    return { applied: false, state: current, error: 'Calendar could not be saved. This change was not applied. Check browser storage permissions, use a smaller export, or turn off “Remember on this browser” for session-only use.' };
  }
}
export function monthCells(month) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const start = addDays(`${month}-01`, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function shiftMonth(month, delta) {
  const value = new Date(`${month}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + delta);
  return value.toISOString().slice(0, 7);
}
export function occursOn(event, date) {
  if (event.kind === 'mock' && event.mockDate) return event.mockDate === date;
  if (event.allDay) return event.startTime <= date && event.endTime > date;
  const start = todayAtCampus(new Date(event.startTime));
  // End is exclusive: an event ending at midnight does not occupy the next day.
  const end = todayAtCampus(new Date(Date.parse(event.endTime) - 1));
  return start <= date && end >= date;
}
export function formatPersonalTime(event) {
  if (event.allDay) return `All day · ${event.startTime}${addDays(event.endTime, -1) !== event.startTime ? ` through ${addDays(event.endTime, -1)}` : ''}`;
  const format = (value) => new Date(value).toLocaleString('en-US', { timeZone: CAMPUS_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `${format(event.startTime)} – ${format(event.endTime)}`;
}
