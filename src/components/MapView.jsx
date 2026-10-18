import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { isEventLive } from '../utils/calendar';
import { CAMPUS_LOCATIONS } from '../data/campusLocations';
import { MapPin, Navigation, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Compass, Map as MapIcon } from 'lucide-react';
import { EventCard } from './EventCard';
import { USC_CENTER, DEFAULT_ZOOM, CANVAS_W, CANVAS_H, projectCoords, layoutMapEvents, nextZoom, isActivationKey, startVectorMap } from '../utils/map';

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
  const mapReadyRef = useRef(false);
  const markers = useMemo(() => layoutMapEvents(events), [events]);
  const [mapError, setMapError] = useState(null);
  const [selectedPinEvent, setSelectedPinEvent] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useFallback2D, setUseFallback2D] = useState(true);
  const [zoomLevel2D, setZoomLevel2D] = useState(1);
  const [pan2D, setPan2D] = useState({ x: 0, y: 0 });
  const isDragging2D = useRef(false);
  const dragStart2D = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setSelectedPinEvent((selected) => selected && events.some((event) => event.id === selected.id) ? selected : null);
  }, [events]);

  // Create the renderer only after its visible container exists. Default radar needs no tiles.
  useEffect(() => {
    if (useFallback2D || !mapContainerRef.current) return;
    setMapError(null);
    setMapLoaded(false);
    mapReadyRef.current = false;
    const session = startVectorMap({ engine: maplibregl, container: mapContainerRef.current,
      onReady: () => { mapReadyRef.current = true; setMapLoaded(true); },
      onUnavailable: (message) => { setMapError(message); setUseFallback2D(true); },
    });
    mapRef.current = session.map;
    return () => {
      mapReadyRef.current = false;
      session.dispose();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [useFallback2D]);

  // Update MapLibre Markers when not in 2D fallback mode
  useEffect(() => {
    if (useFallback2D || !mapRef.current || !mapLoaded || !mapReadyRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {
        // Safe remove
      }
    });
    markersRef.current = [];

    markers.forEach(({ event, coordinates: [offsetLng, offsetLat], offset }) => {
      const isLive = isEventLive(event.startTime, event.endTime);
      const conflict = checkConflict(event, schedule);
      const isRsvpd = rsvpIds.includes(event.id);

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `View event: ${event.title}`);
      el.className = 'map-event-marker cursor-pointer select-none';

      if (isLive) {
        el.innerHTML = `
          <div class="map-pin-visual relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-usc-gold/40 animate-ping"></span>
            <span class="relative flex items-center justify-center w-7 h-7 rounded-full bg-usc-cardinal border-2 border-usc-gold text-zinc-100 shadow-lg text-xs font-bold">
              ⚡
            </span>
          </div>
        `;
      } else if (conflict.hasConflict) {
        el.innerHTML = `
          <div class="map-pin-visual relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-usc-cardinal border border-zinc-100 text-zinc-100 shadow-md text-[10px] font-bold">
              !
            </span>
          </div>
        `;
      } else if (isRsvpd) {
        el.innerHTML = `
          <div class="map-pin-visual relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-usc-cardinal border border-usc-gold text-zinc-100 shadow-md text-xs font-bold">
              ✓
            </span>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="map-pin-visual relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 border-2 border-usc-gold text-usc-gold shadow-md text-[11px] font-semibold">
              ${event.location.code.slice(0, 3) || '•'}
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
        const marker = new maplibregl.Marker({ element: el, offset })
          .setLngLat([offsetLng, offsetLat])
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      } catch (markerErr) {
        console.warn('Marker addition error:', markerErr);
      }
    });
  }, [markers, schedule, rsvpIds, mapLoaded, useFallback2D, checkConflict]);

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
      setZoomLevel2D((prev) => nextZoom(prev, delta));
    } else {
      if (delta > 0) mapRef.current?.zoomIn();
      else mapRef.current?.zoomOut();
    }
  };

  // Pointer input supports both mouse and touch without changing the event engine.
  const handleMouseDown2D = (e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
          onPointerDown={handleMouseDown2D}
          onPointerMove={handleMouseMove2D}
          onPointerUp={handleMouseUp2D}
          onPointerCancel={handleMouseUp2D}
          style={{ touchAction: 'none' }}
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
            {markers.map(({ event, coordinates, offset }) => {
              const [rawX, rawY] = projectCoords(...coordinates);
              const isLive = isEventLive(event.startTime, event.endTime);
              const conflict = checkConflict(event, schedule);
              const isRsvpd = rsvpIds.includes(event.id);

              return (
                <g
                  key={event.id}
                  transform={`translate(${rawX + offset[0]}, ${rawY + offset[1]})`}
                  className="map-event-marker cursor-pointer"
                  role="button" tabIndex={0} aria-label={`View event: ${event.title}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (isActivationKey(e.key)) { e.preventDefault(); e.stopPropagation(); setSelectedPinEvent(event); }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinEvent(event);
                  }}
                >
                  <g className="map-pin-visual">
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
                      <circle r="12" fill="#990000" stroke="#f4f4f5" strokeWidth="1.5" />
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
                      <circle r="12" fill="#990000" stroke="#FFCC00" strokeWidth="1.5" />
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
                        {event.location.code.slice(0, 3) || '•'}
                      </text>
                    </g>
                  )}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {mapError && <p role="status" className="absolute bottom-3 left-3 right-3 sm:right-auto rounded-lg bg-zinc-950/95 border border-usc-gold/40 px-3 py-2 text-xs text-usc-gold pointer-events-none">{mapError}</p>}
      {!useFallback2D && !mapLoaded && <p role="status" className="absolute bottom-3 left-3 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">Loading vector map…</p>}
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
          <span className="w-2.5 h-2.5 rounded-full bg-usc-cardinal"></span>
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
              aria-label="Close selected event"
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
