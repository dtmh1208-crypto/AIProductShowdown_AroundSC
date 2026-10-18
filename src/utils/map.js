export const USC_CENTER = [-118.2851, 34.0224];
export const DEFAULT_ZOOM = 15.4;
export const CANVAS_W = 1000;
export const CANVAS_H = 620;

export function projectCoords(lng, lat) {
  return [((lng + 118.2930) / .0160) * CANVAS_W, ((34.0270 - lat) / .0110) * CANVAS_H];
}
export const nextZoom = (zoom, delta) => Math.min(2.5, Math.max(.7, zoom + delta));
export const isActivationKey = (key) => key === 'Enter' || key === ' ';

// Separate collocated pins in screen space without changing any venue coordinates.
export function layoutMapEvents(events) {
  const groups = new Map();
  for (const event of events) {
    const key = event.location.coordinates.join(',');
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  const usage = new Map();
  return events.map((event) => {
    const coordinates = [...event.location.coordinates];
    const key = coordinates.join(',');
    const index = usage.get(key) || 0;
    usage.set(key, index + 1);
    const count = groups.get(key);
    const angle = 2 * Math.PI * index / count;
    const radius = count > 1 ? Math.max(30, count * 5) : 0;
    const offset = [Math.cos(angle) * radius, Math.sin(angle) * radius];
    return { event, coordinates, offset };
  });
}

// Testable lifecycle boundary; tests inject an engine double, not a real WebGL renderer.
export function startVectorMap({ engine, container, onReady, onUnavailable, timers = globalThis }) {
  let map = null, disposed = false, failed = false, timeout;
  const fail = (reason) => {
    if (disposed || failed) return;
    failed = true;
    if (timeout !== undefined) timers.clearTimeout(timeout);
    onUnavailable(reason);
  };
  try {
    if (typeof engine.supported === 'function' && !engine.supported({ failIfMajorPerformanceCaveat: false })) {
      fail('Your browser cannot render the vector map. Showing the 2D campus radar.');
    } else {
      map = new engine.Map({ container,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=cb1_4nhd_1_37985019de45fbf289d05de7',
        center: USC_CENTER, zoom: DEFAULT_ZOOM, pitch: 35, bearing: -10, attributionControl: false });
      map.addControl(new engine.AttributionControl({ compact: true }), 'bottom-right');
      timeout = timers.setTimeout(() => fail('The vector map did not load. Showing the 2D campus radar.'), 10000);
      map.on('load', () => {
        if (disposed || failed) return;
        timers.clearTimeout(timeout);
        map.resize();
        onReady();
      });
      map.on('error', () => fail('The vector map is unavailable. Showing the 2D campus radar.'));
    }
  } catch {
    fail('The vector map could not start. Showing the 2D campus radar.');
  }
  return { map, dispose() {
    if (disposed) return;
    disposed = true;
    if (timeout !== undefined) timers.clearTimeout(timeout);
    try { map?.remove(); } catch { /* Best-effort renderer cleanup. */ }
  } };
}
