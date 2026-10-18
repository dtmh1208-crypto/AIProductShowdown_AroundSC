import React from 'react';
import { useDialog } from './useDialog';
import {
  Calendar,
  Clock,
  MapPin,
  X,
  Users,
  Utensils,
  ExternalLink,
  Download,
  AlertTriangle,
  Check
} from 'lucide-react';
import { formatEventDateTime, isEventLive, getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

export const EventDetailModal = ({
  event,
  isOpen,
  onClose,
  conflictInfo,
  isRsvpd,
  onRsvpClick
}) => {
  const dialogRef = useDialog(isOpen && Boolean(event), onClose);
  if (!isOpen || !event) return null;

  const isLive = isEventLive(event.startTime, event.endTime);
  const { hasConflict, conflictingClass } = conflictInfo || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="event-details-title" tabIndex={-1} className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-usc-cardinal text-zinc-100 border border-usc-gold/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-usc-gold"></span>
                  HAPPENING NOW
                </span>
              ) : (
                <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
                  {event.category}
                </span>
              )}

              {event.freeFood && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-usc-gold/15 text-usc-gold border border-usc-gold/30">
                  <span>🍕</span> Free Food Perk
                </span>
              )}

              {hasConflict && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-usc-gold/15 text-usc-gold border border-usc-gold/30">
                  <AlertTriangle className="w-3 h-3 text-usc-gold" />
                  <span>Conflicts with {conflictingClass?.code}</span>
                </span>
              )}
            </div>

            <h2 id="event-details-title" className="text-2xl font-bold tracking-tight text-zinc-100">
              {event.title}
            </h2>
            <p className="text-xs uppercase tracking-wider font-medium text-zinc-500 mt-1">
              Organized by {event.organizer}
            </p>
          </div>

          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
              <Clock className="w-5 h-5 text-usc-gold shrink-0 mt-0.5" />
              <div>
                <span className="text-xs uppercase tracking-wider font-medium text-zinc-500 block">
                  Time & Date
                </span>
                <span className="text-sm font-semibold text-zinc-200">
                  {formatEventDateTime(event.startTime, event.endTime)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-usc-cardinal shrink-0 mt-0.5" />
              <div>
                <span className="text-xs uppercase tracking-wider font-medium text-zinc-500 block">
                  Campus Location
                </span>
                <span className="text-sm font-semibold text-zinc-200 block">
                  {event.location.name}{event.location.code ? ` (${event.location.code})` : ''}
                </span>
                <span className="text-xs text-zinc-400">{[event.room, event.location.area].filter(Boolean).join(' • ')}</span>
              </div>
            </div>
          </div>

          {event.dataset === 'verified' && <div className="rounded-xl border border-zinc-700 p-4 space-y-2 text-sm text-zinc-300">
            <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-usc-gold underline">Source: {event.sourcePublisher}</a>
            <p>Manually checked: {new Date(event.verifiedAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' })}. Not a live status check.</p>
            <p>Admission: {event.admission}</p>
            <p>Eligibility: {event.eligibility}</p>
            <p>Free food: {event.freeFood === null ? 'not confirmed' : event.freeFood ? 'confirmed' : 'not offered'}.</p>
            <p>Attendance: {event.attendeesCount === null ? 'unknown' : event.attendeesCount}.</p>
            <a href={event.location.coordinateSourceUrl} target="_blank" rel="noreferrer" className="text-usc-gold underline">Venue coordinate source</a>
            <p>Map points identify the venue, not a room or entrance. Walking feasibility is unverified.</p>
            {event.registrationUrl && <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="block text-usc-gold underline">Open organizer registration ↗</a>}
            {event.registrationNote && <p>{event.registrationNote}</p>}
          </div>}
          <p className="text-xs text-zinc-400">AroundSC RSVPs are saved only in this browser. They do not reserve a place or register you with the organizer.</p>

          {/* Free Food Callout */}
          {event.freeFood && event.foodDescription && (
            <div className="p-4 rounded-xl border border-usc-gold/30 bg-usc-gold/10 flex items-start gap-3">
              <Utensils className="w-5 h-5 text-usc-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-usc-gold">
                  Food Details
                </h4>
                <p className="text-sm text-zinc-200 mt-0.5">{event.foodDescription}</p>
              </div>
            </div>
          )}

          {/* Conflict Alert Box if conflicting */}
          {hasConflict && (
            <div className="p-4 rounded-xl border border-usc-gold/60 bg-usc-cardinal/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-usc-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-usc-gold">
                  Schedule Collision Notice
                </h4>
                <p className="text-sm text-zinc-300 mt-0.5">
                  This session runs during your <strong>{conflictingClass?.code}</strong> class ({conflictingClass?.days.join('/')} at {conflictingClass?.startTime}).
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <span className="text-xs uppercase tracking-wider font-medium text-zinc-500 block mb-2">
              About This Event
            </span>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {event.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-normal bg-zinc-800 text-zinc-400 border border-zinc-700/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-950/70 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Direct Google Calendar Export */}
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700"
              title="Add to Google Calendar"
            >
              <Calendar className="w-4 h-4 text-usc-gold" />
              <span>Google Cal</span>
            </a>

            {/* iCal download */}
            <button
              onClick={() => downloadIcsFile(event)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700"
              title="Download iCal .ics"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>.ICS File</span>
            </button>
          </div>

          {/* Primary RSVP Button */}
          {isRsvpd ? (
            <button type="button" onClick={() => onRsvpClick(event)} title="Remove local RSVP" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-usc-cardinal/20 text-usc-gold border border-usc-gold/40 text-sm font-semibold">
              <Check className="w-4 h-4" />
              <span>Local RSVP saved · Remove</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onRsvpClick(event);
              }}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-usc-cardinal hover:bg-usc-cardinal-light text-zinc-100 shadow-md border border-usc-cardinal-light transition-colors flex items-center gap-2"
            >
              <span>RSVP locally</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
