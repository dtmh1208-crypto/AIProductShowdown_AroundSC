export const SHOWCASE_RSVP_KEY = 'aroundsc_showcase_rsvps';

const readIds = (storage, key) => {
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? 'null');
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : null;
  } catch { return null; }
};

// Prefer the unified list once saved: repeatedly importing legacy lists would resurrect removals.
export function loadShowcaseRsvps(storage, aliases) {
  const saved = readIds(storage, SHOWCASE_RSVP_KEY);
  if (saved !== null) return [...new Set(saved)];
  const sample = readIds(storage, 'aroundsc_rsvps') ?? [];
  const verified = readIds(storage, 'aroundsc_verified_rsvps') ?? [];
  return [...new Set([
    ...sample.map((id) => aliases.sample[id] ?? id),
    ...verified.map((id) => aliases.verified[id] ?? id),
  ])];
}
