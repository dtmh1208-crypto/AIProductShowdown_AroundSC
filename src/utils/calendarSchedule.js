import { getCalendarCampusEvents } from './eventDiscovery.js';
import { addDays, isImportedCampusOccurrence, personalIdentity } from './personalCalendar.js';
import { calendarPeriodRange } from './calendarLayout.js';
import { campusTimeToIso } from './calendar.js';

// Source composition is display-only. Never write, migrate, or delete stored inputs.
export function composeCalendarSchedule(campusRecords, rsvpIds = [], personalRecords = []) {
  const seenPersonal = new Set();
  const personal = personalRecords.filter((record) => {
    const identity = personalIdentity(record);
    if (seenPersonal.has(identity)) return false;
    seenPersonal.add(identity); return true;
  });
  const rsvpEvents = getCalendarCampusEvents(campusRecords, rsvpIds);
  const selectedIds = new Set(rsvpEvents.map((event) => event.id));
  const savedImports = new Set(), savedIds = new Set(), seenCampus = new Set();
  const campusEvents = campusRecords.filter((event) => {
    if (seenCampus.has(event.id)) return false;
    const matches = personal.filter((record) => isImportedCampusOccurrence(record, event));
    for (const record of matches) savedImports.add(record);
    if (matches.length) savedIds.add(event.id);
    if (!selectedIds.has(event.id) && !matches.length) return false;
    seenCampus.add(event.id); return true;
  });
  const personalEvents = personal.filter((record) => !savedImports.has(record));
  return {
    items: [...personalEvents, ...campusEvents].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    campusEvents, personalEvents, rsvpCount: rsvpEvents.length, savedIds,
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Expand only the existing opt-in demo rules for the visible period. These are explicitly
// mock occurrences, not imported classes or newly invented real commitments.
export function mockCalendarOccurrences(blocks, date, view) {
  const { first, last } = calendarPeriodRange(date, view);
  const events = [];
  for (let day = first; day <= last; day = addDays(day, 1)) {
    const weekday = DAY_NAMES[new Date(`${day}T12:00:00Z`).getUTCDay()];
    for (const block of blocks) {
      if (!block.days.includes(weekday)) continue;
      const [fromHour, fromMinute] = block.startTime.split(':').map(Number);
      const [toHour, toMinute] = block.endTime.split(':').map(Number);
      events.push({ ...block, id: `mock:${block.id}:${day}`, mockRuleId: block.id, mockDate: day, kind: 'mock',
        title: `${block.code}: ${block.title}`, startTime: campusTimeToIso(day, fromHour, fromMinute), endTime: campusTimeToIso(day, toHour, toMinute) });
    }
  }
  return events;
}
