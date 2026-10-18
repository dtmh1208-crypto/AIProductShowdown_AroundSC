import React from 'react';
import { Header } from './Header';
import { AskAroundSC } from './AskAroundSC';
import { FiltersBar } from './FiltersBar';
import { MapView } from './MapView';
import { ListView } from './ListView';
import { ErrorBoundary } from './ErrorBoundary';
import { parseDiscoveryRequest } from '../utils/discoveryParser';
import { MOCK_STUDENT_SCHEDULE } from '../data/mockSchedule';
import { checkCalendarConflict } from '../utils/calendar';

export function DiscoverPage({
  viewMode, setViewMode, liveCount, activeEvents, rsvpIds, onOpenSchedule,
  discovery, setDiscovery, discoveryRequest, setDiscoveryRequest, ignoreUnknownLocations, setIgnoreUnknownLocations,
  filteredEvents, setSelectedDetailEvent, searchQuery, setSearchQuery,
  timeFilter, setTimeFilter, categoryFilter, setCategoryFilter,
  freeFoodOnly, setFreeFoodOnly, hideConflicts, setHideConflicts, handleRsvpClick,
}) {
  return <>
    <Header viewMode={viewMode} setViewMode={setViewMode} onOpenSchedule={onOpenSchedule} rsvpCount={activeEvents.filter((event) => rsvpIds.includes(event.id)).length} />
    <main id="main-content" tabIndex={-1} aria-label="Discover events">
        <section id="discover" className="pulse-discovery">
          <div className="pulse-section-intro">
            <div><span className="pulse-section-kicker">01 / YOUR NEXT GOOD PLAN</span><h1>Find your <em>scene.</em></h1></div>
            <p>Big ideas, small gatherings, and everything in between. Explore what moves you.</p>
          </div>
          <div className="pulse-discovery-console">
        <AskAroundSC
          initialRequest={discoveryRequest}
          parsed={discovery}
          ignoreLocations={ignoreUnknownLocations}
          resultCount={filteredEvents.length}
          onSearch={(request) => {
            setDiscoveryRequest(request);
            setDiscovery(parseDiscoveryRequest(request));
            setIgnoreUnknownLocations(false);
            setSelectedDetailEvent(null);
          }}
          onClear={() => { setDiscoveryRequest(''); setDiscovery(null); setIgnoreUnknownLocations(false); }}
          onIgnoreLocations={() => setIgnoreUnknownLocations(true)}
        />

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

        {filteredEvents.length === 0 && <p role="status" className="rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300">
          No matching events. Review the search interpretation and filters.
        </p>}

          </div>

        {/* Active View: Map or List */}
        <section className="pulse-results">
          {viewMode === 'map' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="pulse-results-title">
                  Interactive Campus Radar
                </h3>
                <span className="pulse-results-caption">
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
                <h3 className="pulse-results-title">
                  Campus Events Directory
                </h3>
                <span className="pulse-results-caption">
                  Chronological listings
                </span>
              </div>
              <ListView
                discoveryActive={Boolean(discovery)}
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
        </section>
    </main>
  </>;
}
