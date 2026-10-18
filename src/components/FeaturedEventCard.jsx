import React from 'react';
import { ArrowUpRight, Clock, MapPin } from 'lucide-react';
import { formatEventDateTime } from '../utils/calendar';

// Presentation only. The shared App owns data, details, conflicts and RSVP state.
export function FeaturedEventCard({ event, onSelectEvent, index = 0, compact = false }) {
  return <button type="button" className={`home-event home-event-${index % 4}${compact ? ' home-event-compact' : ''}`} onClick={() => onSelectEvent(event)} aria-label={`View details: ${event.title}`}>
    <div className="home-event-art" aria-hidden="true"><span className="home-art-category">{event.category}</span><span className="home-art-glyph">{['✳', '↗', '◎', '+'][index % 4]}</span><span className="home-art-index">AROUND SC / {String(index + 1).padStart(2, '0')}</span></div>
    <div className="home-event-copy"><span className="home-event-kind">{event.dataset === 'verified' ? 'Public USC listing' : 'Sample event'}</span><span className="home-event-organizer">{event.organizer}</span><h3>{event.title}</h3><span className="home-event-meta"><Clock size={14} />{formatEventDateTime(event.startTime, event.endTime)}</span><span className="home-event-meta"><MapPin size={14} />{[event.location.name, event.room].filter(Boolean).join(' · ')}</span>{event.dataset === 'verified' && <span className="home-event-eligibility">{event.eligibility}</span>}<span className="home-event-action">View event <ArrowUpRight size={19} /></span></div>
  </button>;
}
