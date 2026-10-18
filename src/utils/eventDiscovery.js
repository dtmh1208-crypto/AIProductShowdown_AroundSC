import { checkCalendarConflict, isEventLive, isEventToday } from './calendar.js';
import { matchesDiscovery } from './discoveryMatching.js';

// Shared by App and tests; this is the original filter pipeline, not a second engine.
export function filterEvents(events, {
  searchQuery = '', categoryFilter = 'All', freeFoodOnly = false, hideConflicts = false,
  timeFilter = 'all', rsvpIds = [], discovery = null, ignoreUnknownLocations = false, schedule = [],
} = {}, now = new Date()) {
  const query = searchQuery.trim().toLowerCase();
  return events.filter((event) => {
    if (!matchesDiscovery(event, discovery, { ignoreLocations: ignoreUnknownLocations })) return false;
    if (query && ![event.title, event.description, event.organizer, event.foodDescription,
      event.location.name, event.location.code, event.room, ...event.tags]
      .some((value) => String(value ?? '').toLowerCase().includes(query))) return false;
    if (categoryFilter !== 'All' && event.category !== categoryFilter) return false;
    if (freeFoodOnly && event.freeFood !== true) return false;
    if (hideConflicts && checkCalendarConflict(event, schedule).hasConflict) return false;
    if (timeFilter === 'live') return isEventLive(event.startTime, event.endTime, now);
    if (timeFilter === 'today') return isEventToday(event.startTime, now);
    if (timeFilter === 'upcoming') return new Date(event.startTime) > now;
    if (timeFilter === 'rsvp') return rsvpIds.includes(event.id);
    return true;
  });
}

export function getRsvpAction(event, rsvpIds, schedule) {
  if (rsvpIds.includes(event.id)) return 'remove';
  return checkCalendarConflict(event, schedule).hasConflict ? 'conflict' : 'add';
}

export function updateRsvps(ids, eventId, attending) {
  return attending ? [...new Set([...ids, eventId])] : ids.filter((id) => id !== eventId);
}
