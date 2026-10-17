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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200 group">
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
              <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
                {event.category}
              </span>
            )}

            {/* Free Food Badge */}
            {event.freeFood && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span>🍕</span> Free Food
              </span>
            )}
          </div>

          {/* Conflict Badge */}
          {hasConflict && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"
              title={`Conflicts with your ${conflictingClass?.code} class`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Conflict ({conflictingClass?.code})</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelectEvent && onSelectEvent(event)}
          className="text-lg font-semibold text-zinc-100 group-hover:text-usc-gold transition-colors cursor-pointer leading-snug mb-1"
        >
          {event.title}
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
              <strong className="text-zinc-100 font-medium">{event.location.code}</strong> • {event.room}
            </span>
          </div>
        </div>

        {/* Body Description */}
        <p className="text-sm font-normal text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
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

      {/* Card Actions Footer */}
      <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
        {/* Attendees */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Users className="w-3.5 h-3.5" />
          <span>{event.attendeesCount + (isRsvpd ? 1 : 0)} Trojans going</span>
        </div>

        {/* RSVP / Registered Buttons */}
        <div className="flex items-center gap-2">
          {isRsvpd ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Check className="w-3.5 h-3.5" />
                <span>RSVP'd</span>
              </span>
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
                  ? 'bg-zinc-800 hover:bg-rose-900/30 text-rose-300 border border-rose-800/40'
                  : 'bg-usc-cardinal hover:bg-usc-cardinal-light text-zinc-100 border border-usc-cardinal-light shadow-sm'
              }`}
            >
              <span>RSVP</span>
              {hasConflict && <AlertTriangle className="w-3 h-3 text-rose-400" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
