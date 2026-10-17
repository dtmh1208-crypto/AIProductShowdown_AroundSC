import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { isEventLive } from '../utils/calendar';
import { MapPin, Navigation, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { EventCard } from './EventCard';

// USC University Park Campus (UPC) Center
const USC_CENTER = [-118.2851, 34.0224];
const DEFAULT_ZOOM = 15.4;

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

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const CARTO_API_KEY = 'cb1_4nhd_1_37985019de45fbf289d05de7';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      // Premium vector basemap with zero watermark using CARTO Basemaps API key
      style: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=${CARTO_API_KEY}`,
      center: USC_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 35, // slight dynamic angle
      bearing: -10, // aligned with USC campus grid
      attributionControl: false
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update Markers whenever filtered events change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Group events that share the exact same building coordinates to offset slightly
    const coordUsage = {};

    events.forEach((event) => {
      const coords = event.location.coordinates;
      const key = `${coords[0]},${coords[1]}`;
      const count = coordUsage[key] || 0;
      coordUsage[key] = count + 1;

      // Slight geographic offset if multiple events in same building
      const offsetLng = coords[0] + (count % 3 - 1) * 0.00035;
      const offsetLat = coords[1] + Math.floor(count / 3) * 0.00035;

      const isLive = isEventLive(event.startTime, event.endTime);
      const conflict = checkConflict(event, schedule);
      const isRsvpd = rsvpIds.includes(event.id);

      // Create Custom DOM Marker
      const el = document.createElement('div');
      el.className = 'cursor-pointer transition-transform duration-200 hover:scale-125 select-none';

      if (isLive) {
        // Pulsing Live Marker
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-usc-gold/40 animate-ping"></span>
            <span class="relative flex items-center justify-center w-7 h-7 rounded-full bg-usc-cardinal border-2 border-usc-gold text-zinc-100 shadow-lg text-xs font-bold">
              ⚡
            </span>
          </div>
        `;
      } else if (conflict.hasConflict) {
        // Conflict Marker
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 border border-zinc-100 text-zinc-100 shadow-md text-[10px] font-bold">
              !
            </span>
          </div>
        `;
      } else if (isRsvpd) {
        // RSVP'd Marker
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 border border-emerald-300 text-zinc-100 shadow-md text-xs font-bold">
              ✓
            </span>
          </div>
        `;
      } else {
        // Standard Campus Pin
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

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([offsetLng, offsetLat])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [events, schedule, rsvpIds, mapLoaded]);

  const resetCampusView = () => {
    mapRef.current?.flyTo({
      center: USC_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 35,
      bearing: -10,
      speed: 1.2
    });
    setSelectedPinEvent(null);
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={resetCampusView}
          className="p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 shadow-md backdrop-blur-md transition-colors"
          title="Reset to Campus Center"
        >
          <RotateCcw className="w-4 h-4 text-usc-gold" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 shadow-md backdrop-blur-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
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
