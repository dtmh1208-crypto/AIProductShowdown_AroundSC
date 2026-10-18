import { addDays, todayAtCampus, monthCells } from './personalCalendar.js';
import { campusTimeToIso } from './calendar.js';

export const HOUR_HEIGHT = 64;
export const dateLabel = (date, options) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
export const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
export function weekDates(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return Array.from({ length: 7 }, (_, i) => addDays(date, i - weekday));
}
export function navigateCalendar(date, view, delta) {
  if (view === 'day' || view === 'week') return addDays(date, delta * (view === 'week' ? 7 : 1));
  const target = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
  if (view === 'year') target.setUTCFullYear(target.getUTCFullYear() + delta);
  else target.setUTCMonth(target.getUTCMonth() + delta);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.toISOString().slice(0, 7)}-${String(Math.min(Number(date.slice(-2)), lastDay)).padStart(2, '0')}`;
}
export function calendarHeading(date, view) {
  if (view === 'year') return date.slice(0, 4);
  if (view === 'month') return dateLabel(date, { month: 'long', year: 'numeric' });
  if (view === 'day') return dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const days = weekDates(date);
  return `${dateLabel(days[0], { month: 'short', day: 'numeric', year: 'numeric' })} – ${dateLabel(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
const localTimeParts = (instant) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
}).formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));

// Each slot represents an actual elapsed hour. A fall-back day has two 1 AM slots;
// a spring-forward day has no 2 AM slot. Week columns share the union of slots.
export function daySlots(date) {
  const start = Date.parse(campusTimeToIso(date, 0));
  const end = Date.parse(campusTimeToIso(addDays(date, 1), 0));
  const counts = new Map(), slots = [];
  for (let instant = start; instant < end; instant += 3600000) {
    const parts = localTimeParts(instant), hour = Number(parts.hour);
    const fold = counts.get(hour) || 0;
    counts.set(hour, fold + 1);
    slots.push({ key: hour * 2 + fold, hour, fold, zone: parts.timeZoneName, start: instant, end: Math.min(end, instant + 3600000) });
  }
  return slots;
}
export function timeGridModel(date, view = 'week') {
  const dates = view === 'day' ? [date] : weekDates(date);
  const days = dates.map((date) => ({ date, slots: daySlots(date) }));
  const keys = [...new Set(days.flatMap((day) => day.slots.map((slot) => slot.key)))].sort((a, b) => a - b);
  const rows = keys.map((key, index) => ({ key, index, label: `${hourLabel(Math.floor(key / 2))}${key % 2 ? ' (again)' : ''}` }));
  for (const day of days) day.slots = day.slots.map((slot) => ({ ...slot, row: keys.indexOf(slot.key) }));
  return { days, rows, height: rows.length * HOUR_HEIGHT, clockChange: days.some((day) => day.slots.length !== 24) };
}
const validTimed = (event) => !event.allDay && Number.isFinite(Date.parse(event.startTime)) && Date.parse(event.endTime) > Date.parse(event.startTime);

// Greedy interval coloring, with a shared width for each connected overlap group.
// Derived segments retain the original event object and never alter source records.
export function positionTimedEvents(events, day) {
  const dayStart = day.slots[0].start, dayEnd = day.slots.at(-1).end;
  const intervals = events.filter(validTimed).map((event) => ({ event, start: Math.max(dayStart, Date.parse(event.startTime)), end: Math.min(dayEnd, Date.parse(event.endTime)) }))
    .filter((item) => item.end > item.start).sort((a, b) => a.start - b.start || b.end - a.end || a.event.id.localeCompare(b.event.id));
  const groups = []; let group, groupEnd = -Infinity;
  for (const item of intervals) {
    if (!group || item.start >= groupEnd) { group = []; groups.push(group); groupEnd = item.end; }
    else groupEnd = Math.max(groupEnd, item.end);
    group.push(item);
  }
  const positioned = [];
  for (const group of groups) {
    const laneEnds = [];
    for (const item of group) {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = item.end; item.lane = lane;
    }
    for (const item of group) {
      const pieces = [];
      for (const slot of day.slots) {
        const start = Math.max(item.start, slot.start), end = Math.min(item.end, slot.end);
        if (end <= start) continue;
        const top = slot.row * HOUR_HEIGHT + (start - slot.start) / 3600000 * HOUR_HEIGHT;
        const height = (end - start) / 3600000 * HOUR_HEIGHT;
        const previous = pieces.at(-1);
        if (previous && previous.end === start && Math.abs(previous.top + previous.height - top) < .001) {
          previous.end = end; previous.height += height;
        } else pieces.push({ start, end, top, height });
      }
      for (const piece of pieces) positioned.push({ ...piece, event: item.event, lane: item.lane, lanes: laneEnds.length,
        continuesBefore: piece.start > Date.parse(item.event.startTime), continuesAfter: piece.end < Date.parse(item.event.endTime) });
    }
  }
  return positioned;
}
export function currentTimePosition(model, now) {
  const date = todayAtCampus(now), instant = now.getTime();
  const day = model.days.find((day) => day.date === date);
  const slot = day?.slots.find((slot) => instant >= slot.start && instant < slot.end);
  return slot ? slot.row * HOUR_HEIGHT + (instant - slot.start) / 3600000 * HOUR_HEIGHT : null;
}
export function initialTimeScroll(model, now) {
  const current = currentTimePosition(model, now);
  return Math.max(0, (current ?? (model.rows.find((row) => row.key === 16)?.index ?? 0) * HOUR_HEIGHT) - HOUR_HEIGHT);
}
export const timeLabel = (value) => new Date(value).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

// Match the visible period, including the adjacent dates displayed by Month view.
export function calendarPeriodRange(date, view) {
  let first = date, last = date;
  if (view === 'week') { const dates = weekDates(date); first = dates[0]; last = dates.at(-1); }
  else if (view === 'month') { const dates = monthCells(date.slice(0, 7)); first = dates[0]; last = dates.at(-1); }
  else if (view === 'year') { first = `${date.slice(0, 4)}-01-01`; last = `${date.slice(0, 4)}-12-31`; }
  return { first, last };
}
export function hasCalendarEventsInPeriod(items, date, view) {
  const { first, last } = calendarPeriodRange(date, view);
  return items.some((event) => {
    if (event.allDay) return event.startTime <= last && event.endTime > first;
    if (!Number.isFinite(Date.parse(event.startTime)) || !(Date.parse(event.endTime) > Date.parse(event.startTime))) return false;
    return todayAtCampus(new Date(event.startTime)) <= last && todayAtCampus(new Date(Date.parse(event.endTime) - 1)) >= first;
  });
}
