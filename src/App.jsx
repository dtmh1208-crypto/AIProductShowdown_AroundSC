import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { MapView } from './components/MapView';
import { ListView } from './components/ListView';
import { ConflictModal } from './components/ConflictModal';
import { ScheduleModal } from './components/ScheduleModal';
import { EventDetailModal } from './components/EventDetailModal';
import { RAW_EVENTS } from './data/eventsData';
import { MOCK_STUDENT_SCHEDULE } from './data/mockSchedule';
import { checkCalendarConflict, isEventLive, isEventToday } from './utils/calendar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Check, Sparkles, MapPin, Calendar, ExternalLink } from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'live' | 'today' | 'upcoming' | 'rsvp'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [freeFoodOnly, setFreeFoodOnly] = useState(false);
  const [hideConflicts, setHideConflicts] = useState(false);

  // RSVP Persistence
  const [rsvpIds, setRsvpIds] = useState(() => {
    try {
      const saved = localStorage.getItem('aroundsc_rsvps');
      return saved ? JSON.parse(saved) : ['evt-01']; // seed 1 RSVP for demo warmth
    } catch {
      return ['evt-01'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aroundsc_rsvps', JSON.stringify(rsvpIds));
    } catch (e) {
      console.error(e);
    }
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
    return RAW_EVENTS.filter((e) => isEventLive(e.startTime, e.endTime)).length;
  }, []);

  // Filter Events Pipeline
  const filteredEvents = useMemo(() => {
    return RAW_EVENTS.filter((event) => {
      // 1. Text Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDesc = event.description.toLowerCase().includes(query);
        const matchesLoc =
          event.location.name.toLowerCase().includes(query) ||
          event.location.code.toLowerCase().includes(query) ||
          event.room.toLowerCase().includes(query);
        const matchesOrg = event.organizer.toLowerCase().includes(query);
        const matchesTags = event.tags.some((t) => t.toLowerCase().includes(query));

        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesOrg && !matchesTags) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'All' && event.category !== categoryFilter) {
        return false;
      }

      // 3. Free Food Filter
      if (freeFoodOnly && !event.freeFood) {
        return false;
      }

      // 4. Calendar Conflict Filter
      if (hideConflicts) {
        const conflict = checkCalendarConflict(event, MOCK_STUDENT_SCHEDULE);
        if (conflict.hasConflict) {
          return false;
        }
      }

      // 5. Time Status Filter
      if (timeFilter === 'live') {
        return isEventLive(event.startTime, event.endTime);
      }
      if (timeFilter === 'today') {
        return isEventToday(event.startTime);
      }
      if (timeFilter === 'upcoming') {
        const start = new Date(event.startTime);
        return start > new Date();
      }
      if (timeFilter === 'rsvp') {
        return rsvpIds.includes(event.id);
      }

      return true;
    });
  }, [searchQuery, categoryFilter, freeFoodOnly, hideConflicts, timeFilter, rsvpIds]);

  // Handle RSVP Click
  const handleRsvpClick = (event) => {
    // If already RSVP'd, allow toggling off or skip
    if (rsvpIds.includes(event.id)) {
      setRsvpIds((prev) => prev.filter((id) => id !== event.id));
      showToast(`Removed "${event.title}" from your schedule`);
      return;
    }

    // Check for conflict
    const conflict = checkCalendarConflict(event, MOCK_STUDENT_SCHEDULE);
    if (conflict.hasConflict) {
      // Open the Calendar Conflict Modal
      setPendingConflictEvent(event);
    } else {
      // No conflict -> Confirm directly
      confirmRsvp(event);
    }
  };

  const confirmRsvp = (event) => {
    setRsvpIds((prev) => [...prev, event.id]);
    showToast(`✓ Registered for "${event.title}"! Syncing to Google Calendar.`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 flex flex-col font-sans">
      {/* Sticky Header with Backdrop Blur */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        liveCount={liveCount}
        onOpenSchedule={() => setIsScheduleModalOpen(true)}
        rsvpCount={rsvpIds.length}
      />

      {/* Main Container constrained to max-w-5xl mx-auto */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Pitch / Hero Value Strip */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
              Campus Intelligence
            </span>
            <h2 className="text-xl font-semibold text-zinc-100 mt-0.5">
              Live USC Campus Event Radar & Conflict Planner
            </h2>
            <p className="text-sm font-normal text-zinc-400 mt-1 max-w-2xl">
              Real-time locations of student club activities, hackathons, and speaker talks. Automatically checks your course schedule so you never double-book.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setTimeFilter('live');
                setViewMode('map');
              }}
              className="px-3.5 py-2 rounded-lg bg-usc-cardinal hover:bg-usc-cardinal-light text-zinc-100 text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
            >
              <span>See Happening Now</span>
            </button>
          </div>
        </div>

        {/* Global Filters Bar */}
        <FiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          freeFoodOnly={freeFoodOnly}
          setFreeFoodOnly={setFreeFoodOnly}
          hideConflicts={hideConflicts}
          setHideConflicts={setHideConflicts}
          totalMatching={filteredEvents.length}
          liveCount={liveCount}
        />

        {/* Active View: Map or List */}
        <section className="pt-2">
          {viewMode === 'map' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-100">
                  Interactive Campus Radar
                </h3>
                <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
                  Click pins to view details & RSVP
                </span>
              </div>
              <ErrorBoundary
                onSwitchToList={() => setViewMode('list')}
                customMessage="The campus map graphics encountered an issue on your device. You can view in List View or retry."
              >
                <MapView
                  events={filteredEvents}
                  schedule={MOCK_STUDENT_SCHEDULE}
                  rsvpIds={rsvpIds}
                  onRsvpClick={handleRsvpClick}
                  onSelectEvent={(evt) => setSelectedDetailEvent(evt)}
                  checkConflict={checkCalendarConflict}
                />
              </ErrorBoundary>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-100">
                  Campus Events Directory
                </h3>
                <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
                  Chronological listings
                </span>
              </div>
              <ListView
                events={filteredEvents}
                schedule={MOCK_STUDENT_SCHEDULE}
                rsvpIds={rsvpIds}
                onRsvpClick={handleRsvpClick}
                onSelectEvent={(evt) => setSelectedDetailEvent(evt)}
                checkConflict={checkCalendarConflict}
              />
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            <span className="font-semibold text-zinc-400">aroundSC</span> • Designed for USC AI Product Showdown
          </div>
          <div className="flex items-center gap-4">
            <span>Data synced from Localist & EngageSC</span>
            <span>USC University Park Campus</span>
          </div>
        </div>
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
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
