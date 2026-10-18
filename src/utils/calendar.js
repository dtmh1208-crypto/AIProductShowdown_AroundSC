import { formatPersonalTime, isPersonalEvent, isImportedCampusOccurrence } from './personalCalendar.js';
import { CAMPUS_TIMEZONE, campusDateParts } from './discoveryParser.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert a campus wall-clock time into an instant without depending on the device timezone.
export function campusTimeToIso(date, hour, minute = 0) {
  const target = Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  let instant = target;
  for (let i = 0; i < 4; i += 1) {
    const local = campusDateParts(new Date(instant));
    const represented = Date.parse(`${local.date}T00:00:00Z`) + local.minutes * 60000;
    if (represented === target) return new Date(instant).toISOString();
    instant += target - represented;
  }
  throw new Error('This campus wall time does not exist or cannot be resolved.');
}

const checkMockCalendarConflict = (event, schedule) => {
  if (!event?.startTime || !event?.endTime || !schedule?.length) return { hasConflict: false, conflictingClass: null };
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return { hasConflict: false, conflictingClass: null };
  const startDay = campusDateParts(start).date;
  const endDay = campusDateParts(end).date;
  for (const cursor = new Date(`${startDay}T12:00:00Z`); cursor.toISOString().slice(0, 10) <= endDay; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    for (const block of schedule) {
      if (!block.days.includes(DAY_NAMES[cursor.getUTCDay()])) continue;
      const [startHour, startMinute] = block.startTime.split(':').map(Number);
      const [endHour, endMinute] = block.endTime.split(':').map(Number);
      if (start.getTime() < Date.parse(campusTimeToIso(date, endHour, endMinute)) && end.getTime() > Date.parse(campusTimeToIso(date, startHour, startMinute))) {
        return { hasConflict: true, conflictingClass: block, details: `${block.code}: ${block.title} (${block.startTime} - ${block.endTime}) at ${block.location}` };
      }
    }
  }
  return { hasConflict: false, conflictingClass: null };
};

// Imported commitments use absolute instants (all-day dates use campus midnight).
export const checkCalendarConflict = (event, schedule = []) => {
  const start = Date.parse(event?.startTime), end = Date.parse(event?.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { hasConflict: false, conflictingClass: null, conflicts: [] };
  const blocks = Array.isArray(schedule) ? schedule : [];
  const conflicts = blocks.filter((item) => isPersonalEvent(item) && item.busy && !isImportedCampusOccurrence(item, event)).filter((item) => {
    const from = item.allDay ? Date.parse(campusTimeToIso(item.startTime, 0)) : Date.parse(item.startTime);
    const to = item.allDay ? Date.parse(campusTimeToIso(item.endTime, 0)) : Date.parse(item.endTime);
    return start < to && end > from;
  }).map((item) => ({ ...item, code: 'Personal commitment', details: `Personal: ${item.title} · ${formatPersonalTime(item)}${item.location ? ` · ${item.location}` : ''}` }));
  const mock = checkMockCalendarConflict(event, blocks.filter((item) => item.kind !== 'personal'));
  if (mock.hasConflict) conflicts.push({ ...mock.conflictingClass, code: `Mock ${mock.conflictingClass.code}`, details: `Mock schedule: ${mock.details}` });
  return { hasConflict: conflicts.length > 0, conflictingClass: conflicts[0] || null, conflicts, details: conflicts.map((item) => item.details).join('\n') };
};

export const isEventLive = (startTime, endTime, now = new Date()) => now >= new Date(startTime) && now < new Date(endTime);
export const isEventToday = (startTime, now = new Date()) => campusDateParts(new Date(startTime)).date === campusDateParts(now).date;

export const formatEventDateTime = (startTime, endTime, now = new Date()) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const today = campusDateParts(now).date;
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const date = campusDateParts(start).date;
  const prefix = date === today ? 'Today' : date === tomorrow.toISOString().slice(0, 10) ? 'Tomorrow'
    : start.toLocaleDateString('en-US', { timeZone: CAMPUS_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (value) => value.toLocaleTimeString('en-US', { timeZone: CAMPUS_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' });
  return `${prefix} • ${formatTime(start)} – ${formatTime(end)}`;
};

const calendarDate = (value) => new Date(value).toISOString().replace(/-|:|\.\d{3}/g, '');
const eventLocation = (event) => [event.room, event.location.name, event.location.area].filter(Boolean).join(', ');
const eventDetails = (event) => [event.description, `Organizer: ${event.organizer}`, event.admission && `Admission: ${event.admission}`,
  event.eligibility && `Eligibility: ${event.eligibility}`, `Source: ${event.sourceUrl || event.externalUrl}`,
  event.registrationUrl && `External registration: ${event.registrationUrl}`, 'AroundSC RSVP is local only; it does not register you with the organizer.'].filter(Boolean).join('\n\n');

export const getGoogleCalendarUrl = (event) => {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title,
    dates: `${calendarDate(event.startTime)}/${calendarDate(event.endTime)}`, details: eventDetails(event), location: eventLocation(event), ctz: CAMPUS_TIMEZONE });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const escapeIcs = (value) => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r/g, '');
// RFC 5545 line folding is measured in UTF-8 octets, including the continuation space.
const foldLine = (line) => {
  let output = '', bytes = 0;
  const encoder = new TextEncoder();
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { output += '\r\n '; bytes = 1; }
    output += char; bytes += size;
  }
  return output;
};
export const getIcsContent = (event, now = new Date()) => [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//aroundSC//USC Campus Events//EN',
  'BEGIN:VEVENT', `UID:${escapeIcs(event.id)}@aroundsc.local`, `DTSTAMP:${calendarDate(now)}`,
  `DTSTART:${calendarDate(event.startTime)}`, `DTEND:${calendarDate(event.endTime)}`,
  `SUMMARY:${escapeIcs(event.title)}`, `DESCRIPTION:${escapeIcs(eventDetails(event))}`,
  `LOCATION:${escapeIcs(eventLocation(event))}`, `URL:${event.sourceUrl || event.externalUrl}`,
  'END:VEVENT', 'END:VCALENDAR',
].map(foldLine).join('\r\n') + '\r\n';

export const downloadIcsFile = (event) => {
  const blob = new Blob([getIcsContent(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.id}-aroundSC.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
