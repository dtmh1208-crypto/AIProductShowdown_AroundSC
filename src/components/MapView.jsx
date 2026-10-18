import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { isEventLive } from '../utils/calendar';
import { CAMPUS_LOCATIONS } from '../data/campusLocations';
import { MapPin, Navigation, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Compass, Map as MapIcon } from 'lucide-react';
import { EventCard } from './EventCard';

// USC University Park Campus (UPC) Center
const USC_CENTER = [-118.2851, 34.0224];
const DEFAULT_ZOOM = 15.4;

// Bounding box for 2D Campus Radar Projection
const MIN_LNG = -118.2930;
const MAX_LNG = -118.2770;
const MIN_LAT = 34.0160;
const MAX_LAT = 34.0270;
const CANVAS_W = 1000;
const CANVAS_H = 620;

function projectCoords(lng, lat) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * CANVAS_W;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * CANVAS_H;
  return [x, y];
}

export const MapView = ({
  events,
  schedule,
  rsvpIds,
  onRsvpClick,
  onSelectEvent,
  checkConflict
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedPinEvent, setSelectedPinEvent] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useFallback2D, setUseFallback2D] = useState(true);
  const [zoomLevel2D, setZoomLevel2D] = useState(1);
  const [pan2D, setPan2D] = useState({ x: 0, y: 0 });
  const isDragging2D = useRef(false);
  const dragStart2D = useRef({ x: 0, y: 0 });

  // Initialize MapLibre with safe WebGL detection
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if MapLibre GL is supported in current environment
    const isSupported = (function () {
      try {
        return typeof maplibregl.supported === 'function'
          ? maplibregl.supported({ failIfMajorPerformanceCaveat: false })
          : true;
      } catch (e) {
        return false;
      }
    })();

    if (!isSupported) {
      console.warn('MapLibre GL / WebGL not supported. Activating 2D Campus Radar fallback.');
      setUseFallback2D(true);
      return;
    }

    const CARTO_API_KEY = 'cb1_4nhd_1_37985019de45fbf289d05de7';

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=${CARTO_API_KEY}`,
        center: USC_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 35,
        bearing: -10,
        attributionControl: false
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        setMapLoaded(true);
      });

      map.on('error', (e) => {
        console.warn('MapLibre encountered an error, falling back to 2D Radar:', e);
        if (!mapLoaded) {
          setUseFallback2D(true);
        }
      });

      mapRef.current = map;

      return () => {
        try {
          map.remove();
        } catch {
          // Ignore teardown errors
        }
      };
    } catch (err) {
      console.warn('Failed to initialize WebGL MapLibre instance. Falling back to 2D Campus Radar.', err);
      setUseFallback2D(true);
    }
  }, []);

  // Update MapLibre Markers when not in 2D fallback mode
  useEffect(() => {
    if (useFallback2D || !mapRef.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {
        // Safe remove
      }
    });
    markersRef.current = [];

    const coordUsage = {};

    events.forEach((event) => {
      const coords = event.location.coordinates;
      const key = `${coords[0]},${coords[1]}`;
      const count = coordUsage[key] || 0;
      coordUsage[key] = count + 1;

      const offsetLng = coords[0] + (count % 3 - 1) * 0.00035;
      const offsetLat = coords[1] + Math.floor(count / 3) * 0.00035;

      const isLive = isEventLive(event.startTime, event.endTime);
      const conflict = checkConflict(event, schedule);
      const isRsvpd = rsvpIds.includes(event.id);

      const el = document.createElement('div');
      el.className = 'cursor-pointer transition-transform duration-200 hover:scale-125 select-none';

      if (isLive) {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-usc-gold/40 animate-ping"></span>
            <span class="relative flex items-center justify-center w-7 h-7 rounded-full bg-usc-cardinal border-2 border-usc-gold text-zinc-100 shadow-lg text-xs font-bold">
              ⚡
            </span>
          </div>
        `;
      } else if (conflict.hasConflict) {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 border border-zinc-100 text-zinc-100 shadow-md text-[10px] font-bold">
              !
            </span>
          </div>
        `;
      } else if (isRsvpd) {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 border border-emerald-300 text-zinc-100 shadow-md text-xs font-bold">
              ✓
            </span>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 border-2 border-usc-gold text-usc-gold shadow-md text-[11px] font-semibold">
              ${event.location.code.slice(0, 3)}
            </span>
          </div>
        `;
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPinEvent(event);
        mapRef.current?.flyTo({
          center: [offsetLng, offsetLat],
          zoom: 16.5,
          speed: 1.2
        });
      });

      try {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([offsetLng, offsetLat])
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      } catch (markerErr) {
        console.warn('Marker addition error:', markerErr);
      }
    });
  }, [events, schedule, rsvpIds, mapLoaded, useFallback2D]);

  const resetCampusView = () => {
    if (useFallback2D) {
      setZoomLevel2D(1);
      setPan2D({ x: 0, y: 0 });
      setSelectedPinEvent(null);
    } else {
      mapRef.current?.flyTo({
        center: USC_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 35,
        bearing: -10,
        speed: 1.2
      });
      setSelectedPinEvent(null);
    }
  };

  const handleZoom = (delta) => {
    if (useFallback2D) {
      setZoomLevel2D((prev) => Math.min(2.5, Math.max(0.7, prev + delta)));
    } else {
      if (delta > 0) mapRef.current?.zoomIn();
      else mapRef.current?.zoomOut();
    }
  };

  // 2D Mouse Drag Handlers
  const handleMouseDown2D = (e) => {
    isDragging2D.current = true;
    dragStart2D.current = { x: e.clientX - pan2D.x, y: e.clientY - pan2D.y };
  };

  const handleMouseMove2D = (e) => {
    if (!isDragging2D.current) return;
    setPan2D({
      x: e.clientX - dragStart2D.current.x,
      y: e.clientY - dragStart2D.current.y
    });
  };

  const handleMouseUp2D = () => {
    isDragging2D.current = false;
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl select-none">
      {/* 3D Map Container (MapLibre + CARTO) */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${useFallback2D ? 'hidden' : 'block'}`}
      />

      {/* 2D Interactive USC Campus Radar Canvas */}
      {useFallback2D && (
        <div
          className="w-full h-full relative bg-[#09090b] cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDown2D}
          onMouseMove={handleMouseMove2D}
          onMouseUp={handleMouseUp2D}
          onMouseLeave={handleMouseUp2D}
        >
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            style={{
              transform: `translate(${pan2D.x}px, ${pan2D.y}px) scale(${zoomLevel2D})`,
              transformOrigin: 'center center',
              transition: isDragging2D.current ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.6" opacity="0.4" />
              </pattern>
              <radialGradient id="campus-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#990000" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={CANVAS_W} height={CANVAS_H} fill="#0c0d10" />
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#campus-grid)" />
            <circle cx="500" cy="340" r="320" fill="url(#campus-glow)" />

            {/* Perimeter Streets */}
            {/* Jefferson Blvd (North) */}
            <line x1="80" y1="180" x2="920" y2="180" stroke="#3f3f46" strokeWidth="2.5" opacity="0.6" />
            <text x="120" y="172" fill="#71717a" fontSize="10" fontFamily="sans-serif" letterSpacing="1">
              W JEFFERSON BLVD
            </text>

            {/* Exposition Blvd (South) */}
            <line x1="80" y1="520" x2="920" y2="520" stroke="#3f3f46" strokeWidth="2.5" opacity="0.6" />
            <text x="120" y="535" fill="#71717a" fontSize="10" fontFamily="sans-serif" letterSpacing="1">
              EXPOSITION BLVD
            </text>

            {/* Figueroa St (East) */}
            <line x1="860" y1="140" x2="860" y2="560" stroke="#3f3f46" strokeWidth="2.5" opacity="0.6" />
            <text x="868" y="240" fill="#71717a" fontSize="10" fontFamily="sans-serif" letterSpacing="1" transform="rotate(90, 868, 240)">
              S FIGUEROA ST
            </text>

            {/* Vermont Ave (West) */}
            <line x1="120" y1="140" x2="120" y2="560" stroke="#3f3f46" strokeWidth="2.5" opacity="0.6" />
            <text x="110" y="240" fill="#71717a" fontSize="10" fontFamily="sans-serif" letterSpacing="1" transform="rotate(-90, 110, 240)">
              S VERMONT AVE
            </text>

            {/* Campus Internal Arteries */}
            {/* Trousdale Parkway (North-South spine) */}
            <line x1="515" y1="180" x2="515" y2="520" stroke="#52525b" strokeWidth="3" strokeDasharray="4 2" opacity="0.7" />
            <text x="522" y="260" fill="#a1a1aa" fontSize="11" fontWeight="bold" letterSpacing="1" transform="rotate(90, 522, 260)">
              TROUSDALE PKWY
            </text>

            {/* Child's Way (East-West cross) */}
            <line x1="160" y1="365" x2="840" y2="365" stroke="#52525b" strokeWidth="3" strokeDasharray="4 2" opacity="0.7" />
            <text x="260" y="358" fill="#a1a1aa" fontSize="10" fontWeight="bold" letterSpacing="1">
              CHILD'S WAY
            </text>

            {/* Watt Way (West Spine) */}
            <line x1="280" y1="180" x2="280" y2="520" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
            <text x="272" y="250" fill="#71717a" fontSize="9" letterSpacing="1" transform="rotate(-90, 272, 250)">
              WATT WAY
            </text>

            {/* Bloom Walk */}
            <line x1="180" y1="410" x2="520" y2="410" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
            <text x="200" y="405" fill="#71717a" fontSize="9" letterSpacing="1">
              BLOOM WALK
            </text>

            {/* USC Campus Boundary Zone */}
            <polygon
              points="140,180 840,180 840,520 140,520"
              fill="none"
              stroke="#990000"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.3"
            />

            {/* USC Landmark Footprints */}
            {Object.entries(CAMPUS_LOCATIONS).map(([key, loc]) => {
              const [px, py] = projectCoords(loc.coordinates[0], loc.coordinates[1]);
              return (
                <g key={key} className="transition-opacity hover:opacity-100 opacity-80">
                  <rect
                    x={px - 28}
                    y={py - 16}
                    width="56"
                    height="32"
                    rx="6"
                    fill="#18181b"
                    stroke="#27272a"
                    strokeWidth="1.2"
                  />
                  <text
                    x={px}
                    y={py + 4}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    {loc.code}
                  </text>
                </g>
              );
            })}

            {/* Dynamic Event Markers Projected onto 2D Campus Radar */}
            {events.map((event) => {
              const [rawX, rawY] = projectCoords(
                event.location.coordinates[0],
                event.location.coordinates[1]
              );
              const isLive = isEventLive(event.startTime, event.endTime);
              const conflict = checkConflict(event, schedule);
              const isRsvpd = rsvpIds.includes(event.id);

              return (
                <g
                  key={event.id}
                  transform={`translate(${rawX}, ${rawY})`}
                  className="cursor-pointer transition-transform duration-200 hover:scale-125"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinEvent(event);
                  }}
                >
                  {isLive ? (
                    /* Live pulsating pin */
                    <g>
                      <circle r="18" fill="#FFCC00" opacity="0.25">
                        <animate
                          attributeName="r"
                          values="12;24;12"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.35;0;0.35"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle r="13" fill="#990000" stroke="#FFCC00" strokeWidth="2.5" />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#f4f4f5"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        ⚡
                      </text>
                    </g>
                  ) : conflict.hasConflict ? (
                    /* Conflict pin */
                    <g>
                      <circle r="12" fill="#e11d48" stroke="#f4f4f5" strokeWidth="1.5" />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        !
                      </text>
                    </g>
                  ) : isRsvpd ? (
                    /* RSVP'd pin */
                    <g>
                      <circle r="12" fill="#059669" stroke="#6ee7b7" strokeWidth="1.5" />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        ✓
                      </text>
                    </g>
                  ) : (
                    /* Standard event pin */
                    <g>
                      <circle r="11" fill="#18181b" stroke="#FFCC00" strokeWidth="1.5" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFCC00"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {event.location.code.slice(0, 3)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setUseFallback2D(!useFallback2D)}
          className="p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 shadow-md backdrop-blur-md transition-colors flex items-center justify-center"
          title={useFallback2D ? 'Switch to 3D Vector Map' : 'Switch to 2D Campus Radar'}
        >
          {useFallback2D ? (
            <MapIcon className="w-4 h-4 text-usc-gold" />
          ) : (
            <Compass className="w-4 h-4 text-usc-gold" />
          )}
        </button>
        <button
          onClick={resetCampusView}
          className="p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 shadow-md backdrop-blur-md transition-colors"
          title="Reset to Campus Center"
        >
          <RotateCcw className="w-4 h-4 text-usc-gold" />
        </button>
        <button
          onClick={() => handleZoom(0.25)}
          className="p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 shadow-md backdrop-blur-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.25)}
          className="p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 shadow-md backdrop-blur-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Campus Map Legend Pill */}
      <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-950/90 border border-zinc-800 shadow-md backdrop-blur-md text-xs">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <span className="w-2.5 h-2.5 rounded-full bg-usc-cardinal border border-usc-gold"></span>
          Live Now
        </span>
        <span className="flex items-center gap-1.5 text-zinc-300">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          Conflict
        </span>
        <span className="flex items-center gap-1.5 text-zinc-300">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-usc-gold"></span>
          Upcoming
        </span>
        <button
          onClick={() => setUseFallback2D(!useFallback2D)}
          className="pl-2 border-l border-zinc-800 text-[11px] text-usc-gold hover:text-usc-gold-light flex items-center gap-1 font-medium transition-colors cursor-pointer"
          title="Click to toggle between 2D Radar and 3D Vector Map"
        >
          {useFallback2D ? (
            <>
              <Compass className="w-3.5 h-3.5 text-usc-gold" />
              <span>2D Radar Mode</span>
            </>
          ) : (
            <>
              <MapIcon className="w-3.5 h-3.5 text-usc-gold" />
              <span>3D Vector Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Selected Event Card Drawer on Bottom of Map */}
      {selectedPinEvent && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-20 transition-all duration-300">
          <div className="relative">
            <button
              onClick={() => setSelectedPinEvent(null)}
              className="absolute -top-3 -right-2 z-30 w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 flex items-center justify-center text-xs font-bold shadow-lg"
            >
              ✕
            </button>
            <EventCard
              event={selectedPinEvent}
              conflictInfo={checkConflict(selectedPinEvent, schedule)}
              isRsvpd={rsvpIds.includes(selectedPinEvent.id)}
              onRsvpClick={onRsvpClick}
              onSelectEvent={onSelectEvent}
            />
          </div>
        </div>
      )}
    </div>
  );
};
