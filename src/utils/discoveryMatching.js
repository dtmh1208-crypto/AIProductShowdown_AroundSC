import { hasCoordinates } from './eventAdapter.js';
import { CAMPUS_LOCATIONS } from '../data/campusLocations.js';
import { campusDateParts, INTERESTS } from './discoveryParser.js';

export function distanceMeters([lngA, latA], [lngB, latB]) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const a = Math.sin(radians(latB - latA) / 2) ** 2
    + Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(radians(lngB - lngA) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - Math.min(1, a)));
}

export function matchesDiscovery(event, parsed, { ignoreLocations = false } = {}) {
  if (!parsed) return true;
  if (parsed.errors.length || (!ignoreLocations && parsed.unresolvedLocations.length)) return false;
  const c = parsed.criteria;
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) return false;
  const start = campusDateParts(startDate);
  const end = campusDateParts(endDate);
  // Only full, same-day attendance is supported. Never suggest an event crossing the deadline.
  if (start.date !== c.date || end.date !== c.date) return false;
  if (c.startMinutes !== null && start.minutes < c.startMinutes) return false;
  // Compare fractional minutes to keep a 16:00:01 finish outside a 16:00 deadline.
  const endMinutes = end.minutes + endDate.getUTCSeconds() / 60 + endDate.getUTCMilliseconds() / 60000;
  if (c.endMinutes !== null && endMinutes > c.endMinutes) return false;
  if (c.deadlineMinutes !== null && endMinutes > c.deadlineMinutes) return false;
  if (c.freeFoodOnly && !event.freeFood) return false;
  if (c.interests.length) {
    const content = [event.title, event.description, ...(event.tags || [])].join(' ');
    if (!c.interests.some((id) => {
      const interest = INTERESTS[id];
      return interest.category ? event.category === interest.category
        : interest.event.test(content) && (!interest.also || interest.also.test(content));
    })) return false;
  }
  if (c.origin && (c.origin.code || !ignoreLocations)) {
    const origin = CAMPUS_LOCATIONS[c.origin.code];
    const coords = event.location?.coordinates;
    if (!hasCoordinates(origin) || !hasCoordinates(event.location) || distanceMeters(origin.coordinates, coords) > c.radiusMeters) return false;
  }
  // A destination is retained for review; without routing data it supplies no proximity rule.
  return true;
}
