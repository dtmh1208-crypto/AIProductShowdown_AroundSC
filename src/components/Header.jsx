import React from 'react';
import { Map, List, Calendar, ArrowUpRight } from 'lucide-react';
import { PageLink } from './PageLink';

export const Header = ({ viewMode, setViewMode, onOpenSchedule, rsvpCount }) => {
  const selectView = (view) => {
    setViewMode(view);
    document.getElementById('discover')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <header className="pulse-header">
      <PageLink className="pulse-wordmark" href="/" aria-label="AroundSC home"><span className="pulse-brand-icon" aria-hidden="true"><i /><i /><i /><i /></span>around<span>SC</span><span className="pulse-wordmark-dot" aria-hidden="true">.</span></PageLink>
      <PageLink href="/" className="pulse-header-tagline">BACK TO AROUNDSC <ArrowUpRight size={13} /></PageLink>
      <div className="pulse-header-actions">
        <div className="pulse-view-toggle" aria-label="Discovery view">
          <button aria-pressed={viewMode === 'map'} onClick={() => selectView('map')}><Map size={15} /><span>Map View</span></button>
          <button aria-pressed={viewMode === 'list'} onClick={() => selectView('list')}><List size={15} /><span>List View</span></button>
          <button aria-pressed={viewMode === 'calendar'} onClick={() => selectView('calendar')}><Calendar size={15} /><span>Calendar</span></button>
        </div>
        <button className="pulse-schedule-button" onClick={onOpenSchedule} title="Open your personal calendar and campus events"><Calendar size={16} /><span>My Schedule</span>{rsvpCount > 0 && <span className="pulse-rsvp-count">{rsvpCount}</span>}</button>
      </div>
    </header>
  );
};
