import { CAMPUS_LOCATIONS } from '../data/campusLocations.js';

export const CAMPUS_TIMEZONE = 'America/Los_Angeles';
export const NEARBY_RADIUS_METERS = 300;

// This plain-data contract is independent of React and can also be produced by an AI parser.
export const INTERESTS = {
  technology: { label: 'Technology', query: /\b(?:tech(?:nology)?|ai|artificial intelligence|coding|software(?: engineering)?|computer science|blockchain|robotics)\b/gi, event: /\b(?:tech(?:nology)?|ai|artificial intelligence|coding|software|computer science|blockchain|robotics|leetcode)\b/i },
  painting: { label: 'Painting', query: /\b(?:painting|paint)\b/gi, event: /\b(?:painting|paint)\b/i },
  coffeeChats: { label: 'Coffee chats', query: /\bcoffee chats?\b/gi, event: /\bcoffee\b/i, also: /\b(?:chat|chats|networking|conversation|conversations)\b/i },
  academic: { label: 'Academic', query: /\bacademic\b/gi, category: 'Academic' },
  social: { label: 'Social', query: /\bsocial\b/gi, category: 'Social' },
  career: { label: 'Career', query: /\b(?:career|careers)\b/gi, category: 'Career' },
  athletics: { label: 'Athletics', query: /\b(?:athletics|sports)\b/gi, category: 'Athletics' },
  arts: { label: 'Arts', query: /\barts?\b/gi, category: 'Arts' },
  workshop: { label: 'Workshops', query: /\bworkshops?\b/gi, category: 'Workshop' },
};

export function campusDateParts(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const clockPattern = '(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function resolveBuilding(text) {
  const clean = text.trim().replace(/[.,]+$/, '').trim();
  const entries = Object.values(CAMPUS_LOCATIONS);
  const aliasesFor = (loc) => [loc.name, loc.code,
    ...(loc.code === 'HAHN' ? ['Tommy Trojan', 'Hahn Plaza'] : []),
    ...(loc.code === 'JFF' ? ['Fertitta Hall'] : []),
    ...(loc.code === 'RTH' ? ['Ronald Tutor Hall'] : []),
  ];
  const found = entries.filter((loc) => aliasesFor(loc).some((alias) =>
    new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i').test(clean)));
  if (found.length !== 1) return { text: clean, code: null };
  // Never swallow additional qualifiers or a conflicting code as part of a known name.
  let remainder = clean;
  for (const alias of aliasesFor(found[0]).sort((a, b) => b.length - a.length)) {
    remainder = remainder.replace(new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi'), ' ');
  }
  if (remainder.replace(/[\s(),.]/g, '')) return { text: clean, code: null };
  return { text: clean, code: found[0].code };
}

function readClock(text, inheritedPeriod) {
  const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = (match[3] || inheritedPeriod || '').toLowerCase();
  if (minute > 59 || hour > 23) return null;
  if (period) return hour >= 1 && hour <= 12 ? (hour % 12 + (period === 'pm' ? 12 : 0)) * 60 + minute : null;
  // Explicit 24-hour notation is accepted; 1–12 without AM/PM is ambiguous.
  return hour === 0 || hour > 12 ? hour * 60 + minute : null;
}

export function parseDiscoveryRequest(input, { now = new Date(), requireVerifiedLocations = false } = {}) {
  const criteria = {
    interests: [], date: null, startMinutes: null, endMinutes: null, deadlineMinutes: null,
    origin: null, destination: null, radiusMeters: NEARBY_RADIUS_METERS, freeFoodOnly: false,
  };
  const errors = [];
  const warnings = [];
  let text = input.toLowerCase().replace(/[–—]/g, '-').replace(/[’‘]/g, "'").trim();
  if (!text) return { criteria, errors: ['Describe the events you want to find.'], warnings, unresolvedLocations: [] };

  const explicitDates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const tomorrow = /\btomorrow\b/.test(text);
  const today = /\btoday\b/.test(text);
  if (Number(today) + Number(tomorrow) + explicitDates.length > 1) errors.push('Choose one date: today, tomorrow, or YYYY-MM-DD.');
  for (const explicitDate of explicitDates) {
    const value = new Date(`${explicitDate}T12:00:00Z`);
    if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== explicitDate) errors.push('Use a valid calendar date in YYYY-MM-DD form.');
  }
  // Add a calendar day using UTC solely for date arithmetic (not event timezone conversion).
  const date = campusDateParts(now).date;
  const nextDay = new Date(`${date}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + (tomorrow ? 1 : 0));
  criteria.date = explicitDates[0] || nextDay.toISOString().slice(0, 10);
  if (!today && !tomorrow && !explicitDates.length) warnings.push('No date specified: assuming today at USC.');
  text = text.replace(/\b(?:today|tomorrow)\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');

  // Extract a deadline before removing its destination building.
  const deadlineRegex = new RegExp(`\\bbefore\\s+(?:my\\s+)?(?:next\\s+)?class\\s*(?:in\\s+(.+?)\\s+)?at\\s+${clockPattern}\\b`, 'g');
  text = text.replace(deadlineRegex, (_, building, clock) => {
    if (criteria.deadlineMinutes !== null) errors.push('Use one next-class deadline.');
    criteria.deadlineMinutes = readClock(clock);
    if (criteria.deadlineMinutes === null) errors.push('Give the next-class time with AM/PM, for example 4:00 PM.');
    if (building) criteria.destination = resolveBuilding(building);
    return ' ';
  });
  text = text.replace(new RegExp(`\\bbefore\\s+${clockPattern}\\b`, 'g'), (_, clock) => {
    if (criteria.deadlineMinutes !== null) errors.push('Use one deadline.');
    criteria.deadlineMinutes = readClock(clock);
    if (criteria.deadlineMinutes === null) errors.push('Give the deadline with AM/PM.');
    return ' ';
  });

  const rangeRegex = new RegExp(`\\b(?:from|between)\\s+${clockPattern}\\s*(?:-|to|and)\\s*${clockPattern}\\b`, 'g');
  text = text.replace(rangeRegex, (_, start, end) => {
    if (criteria.startMinutes !== null) errors.push('Use one availability window.');
    const period = end.match(/(am|pm)\s*$/i)?.[1];
    criteria.startMinutes = readClock(start, period);
    criteria.endMinutes = readClock(end);
    if (criteria.startMinutes === null || criteria.endMinutes === null) errors.push('Give a clear availability range, for example from 3:00-4:00 PM.');
    else if (criteria.startMinutes >= criteria.endMinutes) errors.push('The end must be after the start on the same day. Specify AM/PM on both times if needed.');
    return ' ';
  });

  // Keep unknown building phrases as constraints requiring explicit user resolution.
  text = text.replace(/\bnear\s+(.+?)(?=[.!?;,]|\s+(?:find|show|for|with|before|from|between)\b|$)/g, (_, building) => {
    if (criteria.origin) errors.push('Choose one starting building.');
    criteria.origin = resolveBuilding(building);
    return ' ';
  });
  text = text.replace(/\bfree food\b/g, () => { criteria.freeFoodOnly = true; return ' '; });
  for (const [id, definition] of Object.entries(INTERESTS)) {
    text = text.replace(new RegExp(definition.query.source, 'gi'), () => {
      if (!criteria.interests.includes(id)) criteria.interests.push(id);
      return ' ';
    });
  }

  // Availability wording is understood only alongside an extracted time window.
  if (criteria.startMinutes !== null) text = text.replace(/\b(?:i'm|i am)\s+(?:free|available)\b/g, ' ');

  // A deliberately bounded grammar: do not silently discard unsupported constraints.
  const remainder = text.replace(/\b(?:i'm|i am|i|am|find|show|me|please|events?|activities|a|an|the|some|any|or|and|my|can|could|would|like|want|to|attend|that|are|is|happening|for|with|on)\b/g, ' ')
    .replace(/[\s.,!?;:'"()-]+/g, ' ').trim();
  if (remainder) errors.push(`Wording not understood: “${remainder}”. Try the supported examples or rephrase; these conditions have not been applied.`);
  if (!criteria.interests.length && criteria.startMinutes === null && criteria.deadlineMinutes === null && !criteria.origin && !criteria.freeFoodOnly && !today && !tomorrow && !explicitDates.length) {
    errors.push('Include a supported interest, date, time window, or campus building.');
  }
  if (criteria.startMinutes !== null && criteria.deadlineMinutes !== null && criteria.startMinutes >= criteria.deadlineMinutes) {
    errors.push('Your next-class deadline must be after the availability start.');
  }
  if (requireVerifiedLocations && criteria.origin?.code && !CAMPUS_LOCATIONS[criteria.origin.code]?.coordinateSourceUrl) {
    warnings.push(`Starting building ${criteria.origin.text} is recognized, but its coordinates have not been verified for this collection.`);
    criteria.origin = { ...criteria.origin, code: null };
  }
  const unresolvedLocations = [criteria.origin, criteria.destination].filter((loc) => loc && !loc.code).map((loc) => loc.text);
  if (criteria.origin) warnings.push('“Near” means within 300 metres in a straight line, not walking distance.');
  if (criteria.deadlineMinutes !== null || criteria.destination) warnings.push('Travel feasibility is unverified. No walking time or class-arrival guarantee is included.');
  return { criteria, errors: [...new Set(errors)], warnings, unresolvedLocations };
}
