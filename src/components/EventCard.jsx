import React from 'react';
import { MapPin, Clock, Calendar, Check, ExternalLink, AlertTriangle, Users, Utensils } from 'lucide-react';
import { formatEventDateTime, isEventLive, getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

export const EventCard = ({
  event,
  conflictInfo,
  isRsvpd,
  onRsvpClick,
  onSelectEvent
}) => {
  const isLive = isEventLive(event.startTime, event.endTime);
  const { hasConflict, conflictingClass } = conflictInfo || {};

  return (
    <div className="event-card rounded-2xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200 group">
      <div>
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Live Indicator */}
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-usc-cardinal text-zinc-100 border border-usc-gold/40 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-usc-gold"></span>
                LIVE NOW
              </span>
            ) : (
              <span className="event-card-category text-xs uppercase tracking-wider font-medium text-usc-gold">
                {event.category}
              </span>
            )}

            {/* Free Food Badge */}
            {event.freeFood && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-usc-gold/15 text-usc-gold border border-usc-gold/30">
                <span>🍕</span> Free Food
              </span>
            )}
          </div>

          {/* Conflict Badge */}
          {hasConflict && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-usc-gold/15 text-usc-gold border border-usc-gold/30"
              title={`Conflicts with your ${conflictingClass?.code} class`}
            >
              <AlertTriangle className="w-3 h-3 text-usc-gold" />
              <span>Conflict ({conflictingClass?.code})</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="event-card-title text-lg font-semibold text-zinc-100 group-hover:text-usc-gold transition-colors leading-snug mb-1"
        >
          <button type="button" onClick={() => onSelectEvent && onSelectEvent(event)} className="text-left">{event.title}</button>
        </h3>

        {/* Organizer */}
        <p className="text-xs uppercase tracking-wider font-medium text-zinc-500 mb-3">
          {event.organizer}
        </p>

        {/* Metadata: Location & Time */}
        <div className="space-y-1.5 mb-3 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>{formatEventDateTime(event.startTime, event.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-usc-cardinal shrink-0" />
            <span className="truncate">
              <strong className="text-zinc-100 font-medium">{event.location.code || event.location.name}</strong>{event.room ? ` • ${event.room}` : ''}
            </span>
          </div>
        </div>

        {event.dataset === 'verified' && <div className="text-xs text-zinc-400 mb-3 space-y-1">
          <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-usc-gold underline">Official event source</a>
          <p>{event.eligibility}</p>
          <p>{event.admission}</p>
        </div>}

        {/* Body Description */}
        <p className="event-card-description text-sm font-normal text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>

        {/* Tags */}
        <div className="event-card-tags flex flex-wrap gap-1.5 mb-5">
          {event.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-xs font-normal bg-zinc-800 text-zinc-400 border border-zinc-700/60"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {event.registrationUrl && <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="text-sm text-usc-gold underline mb-3">Organizer registration ↗</a>}
      {/* Card Actions Footer */}
      <div className="event-card-actions pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
        {/* Attendees */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          {Number.isFinite(event.attendeesCount) ? <><Users className="w-3.5 h-3.5" />
          <span>{event.attendeesCount + (isRsvpd ? 1 : 0)} Trojans going{event.dataset === 'sample' ? ' (sample)' : ''}</span></> : <span>Attendance unknown</span>}
        </div>

        {/* RSVP / Registered Buttons */}
        <div className="flex items-center gap-2">
          {isRsvpd ? (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => onRsvpClick(event)} title="Remove local RSVP" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-usc-gold/20 text-usc-gold border border-usc-gold/40">
                <Check className="w-3.5 h-3.5" />
                <span>Local RSVP ✓</span>
              </button>
              <a
                href={getGoogleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Add to Google Calendar"
              >
                <Calendar className="w-4 h-4 text-usc-gold" />
              </a>
            </div>
          ) : (
            <button
              onClick={() => onRsvpClick(event)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                hasConflict
                  ? 'bg-zinc-800 hover:bg-usc-cardinal/30 text-usc-gold border border-usc-gold/40'
                  : 'bg-usc-cardinal hover:bg-usc-cardinal-light text-zinc-100 border border-usc-cardinal-light shadow-sm'
              }`}
            >
              <span>RSVP locally</span>
              {hasConflict && <AlertTriangle className="w-3 h-3 text-usc-gold" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
