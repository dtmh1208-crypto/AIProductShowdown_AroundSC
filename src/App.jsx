import React, { useState, useMemo, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { DiscoverPage } from './components/DiscoverPage';
import { PageLink } from './components/PageLink';
import { CATEGORIES } from './components/FiltersBar';
import { resolvePage } from './utils/navigation';
import { ConflictModal } from './components/ConflictModal';
import { ScheduleModal } from './components/ScheduleModal';
import { EventDetailModal } from './components/EventDetailModal';
import { RAW_EVENTS } from './data/eventsData';
import { VERIFIED_EVENT_RECORDS } from './data/verifiedEvents';
import { buildShowcaseCollection } from './utils/eventAdapter';
import { loadShowcaseRsvps, SHOWCASE_RSVP_KEY } from './utils/rsvpStorage';
import { MOCK_STUDENT_SCHEDULE } from './data/mockSchedule';
import { checkCalendarConflict, isEventLive } from './utils/calendar';
import { filterEvents, getRsvpAction, updateRsvps } from './utils/eventDiscovery';

export default function App({ initialPath } = {}) {
  const [path, setPath] = useState(() => initialPath ?? globalThis.window?.location.pathname ?? '/');
  const page = resolvePage(path);
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'live' | 'today' | 'upcoming' | 'rsvp'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [freeFoodOnly, setFreeFoodOnly] = useState(false);
  const [hideConflicts, setHideConflicts] = useState(false);

  const [discovery, setDiscovery] = useState(null);
  const [discoveryRequest, setDiscoveryRequest] = useState('');
  const [ignoreUnknownLocations, setIgnoreUnknownLocations] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const collection = useMemo(() => buildShowcaseCollection(RAW_EVENTS, VERIFIED_EVENT_RECORDS, { now }), [now]);
  const activeEvents = collection.events;

  const [rsvpIds, setRsvpIds] = useState(() => {
    try { return loadShowcaseRsvps(localStorage, collection.aliases); }
    catch { return loadShowcaseRsvps(null, collection.aliases); }
  });
  useEffect(() => {
    try { localStorage.setItem(SHOWCASE_RSVP_KEY, JSON.stringify(rsvpIds)); }
    catch (error) { console.error(error); }
  }, [rsvpIds]);

  // Modal States
  const [selectedDetailEvent, setSelectedDetailEvent] = useState(null);
  const [pendingConflictEvent, setPendingConflictEvent] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Toast trigger
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Compute live events count
  const liveCount = useMemo(() => {
    return activeEvents.filter((e) => isEventLive(e.startTime, e.endTime, now)).length;
  }, [activeEvents, now]);

  const filteredEvents = useMemo(() => filterEvents(activeEvents, {
    searchQuery, categoryFilter, freeFoodOnly, hideConflicts, timeFilter, rsvpIds,
    discovery, ignoreUnknownLocations, schedule: MOCK_STUDENT_SCHEDULE,
  }, now), [searchQuery, categoryFilter, freeFoodOnly, hideConflicts, timeFilter, rsvpIds,
    discovery, ignoreUnknownLocations, activeEvents, now]);

  // Handle RSVP Click
  const handleRsvpClick = (event) => {
    // If already RSVP'd, allow toggling off or skip
    const action = getRsvpAction(event, rsvpIds, MOCK_STUDENT_SCHEDULE);
    if (action === 'remove') {
      setRsvpIds((prev) => updateRsvps(prev, event.id, false));
      showToast(`Removed "${event.title}" from your schedule`);
      return;
    }

    // Check for conflict
    if (action === 'conflict') {
      // Open the Calendar Conflict Modal
      setPendingConflictEvent(event);
    } else {
      // No conflict -> Confirm directly
      confirmRsvp(event);
    }
  };

  const confirmRsvp = (event) => {
    setRsvpIds((prev) => updateRsvps(prev, event.id, true));
    showToast(`✓ Local RSVP saved for "${event.title}". Register with the organizer separately if required.`);
  };

  // Page navigation does not create another discovery engine or discard its filter state.
  useEffect(() => {
    const syncRoute = () => {
      setPath(window.location.pathname);
      const category = new URLSearchParams(window.location.search).get('category');
      if (CATEGORIES.includes(category)) { setCategoryFilter(category); setViewMode('list'); }
      setSelectedDetailEvent(null); setPendingConflictEvent(null); setIsScheduleModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    const category = new URLSearchParams(window.location.search).get('category');
    if (CATEGORIES.includes(category)) { setCategoryFilter(category); setViewMode('list'); }
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    document.title = page === 'discover' ? 'Discover Events — AroundSC' : page === 'home' ? 'AroundSC — Discover Campus Events' : 'Page Not Found — AroundSC';
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [page]);

  return (
    <div id="top" className="aroundsc-app min-h-screen flex flex-col font-sans">
      <a href="#main-content" className="pulse-skip-link">Skip to content</a>
      {page === 'home' ? <LandingPage events={activeEvents} onSelectEvent={setSelectedDetailEvent} />
        : page === 'discover' ? <DiscoverPage
          viewMode={viewMode} setViewMode={setViewMode} liveCount={liveCount}
          activeEvents={activeEvents} rsvpIds={rsvpIds} onOpenSchedule={() => setIsScheduleModalOpen(true)}
          discovery={discovery} setDiscovery={setDiscovery}
          discoveryRequest={discoveryRequest} setDiscoveryRequest={setDiscoveryRequest}
          ignoreUnknownLocations={ignoreUnknownLocations} setIgnoreUnknownLocations={setIgnoreUnknownLocations}
          filteredEvents={filteredEvents} setSelectedDetailEvent={setSelectedDetailEvent}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} timeFilter={timeFilter} setTimeFilter={setTimeFilter}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
          freeFoodOnly={freeFoodOnly} setFreeFoodOnly={setFreeFoodOnly}
          hideConflicts={hideConflicts} setHideConflicts={setHideConflicts} handleRsvpClick={handleRsvpClick}
        /> : <main id="main-content" tabIndex={-1} className="home-section home-not-found"><h1>That page isn’t around here.</h1><PageLink href="/">Back to AroundSC</PageLink></main>}

      <footer className="pulse-footer">
        <div><PageLink href="/" className="pulse-wordmark" aria-label="AroundSC home">around<span>SC</span>.</PageLink><p>Good things happen when you show up.</p></div>
        <div className="pulse-footer-note"><span>AROUNDSC</span><p>Independent student showcase prototype.<br />Sample events + curated public listings. Not affiliated with USC.<br />Local RSVPs · Calendar export only.</p></div>
      </footer>

      {/* Modals */}
      {/* 1. Calendar Conflict Modal */}
      {pendingConflictEvent && (
        <ConflictModal
          isOpen={Boolean(pendingConflictEvent)}
          event={pendingConflictEvent}
          conflictingClass={
            checkCalendarConflict(pendingConflictEvent, MOCK_STUDENT_SCHEDULE).conflictingClass
          }
          onClose={() => setPendingConflictEvent(null)}
          onConfirmRsvp={(evt) => confirmRsvp(evt)}
        />
      )}

      {/* 2. Student Class Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schedule={MOCK_STUDENT_SCHEDULE}
      />

      {/* 3. Event Detail Full Modal */}
      {selectedDetailEvent && (
        <EventDetailModal
          isOpen={Boolean(selectedDetailEvent)}
          event={selectedDetailEvent}
          conflictInfo={checkCalendarConflict(selectedDetailEvent, MOCK_STUDENT_SCHEDULE)}
          isRsvpd={rsvpIds.includes(selectedDetailEvent.id)}
          onRsvpClick={handleRsvpClick}
          onClose={() => setSelectedDetailEvent(null)}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-2 h-2 rounded-full bg-usc-gold animate-pulse"></div>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
