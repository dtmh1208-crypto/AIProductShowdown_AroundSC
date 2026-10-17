import React from 'react';
import { AlertTriangle, Clock, MapPin, CheckCircle, X } from 'lucide-react';
import { formatEventDateTime } from '../utils/calendar';

export const ConflictModal = ({
  isOpen,
  onClose,
  onConfirmRsvp,
  event,
  conflictingClass
}) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-rose-800/80 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Warning Accent Banner */}
        <div className="bg-rose-950/60 border-b border-rose-800/60 px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-100">
              Schedule Conflict Detected
            </h3>
            <span className="text-xs uppercase tracking-wider font-medium text-rose-400">
              Overlaps with your enrolled class
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-normal text-zinc-300 leading-relaxed">
            You are attempting to RSVP for an event that overlaps directly with your academic schedule:
          </p>

          {/* Conflict Comparison Box */}
          <div className="space-y-3">
            {/* The Event */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70">
              <span className="text-xs uppercase tracking-wider font-medium text-zinc-500 block mb-1">
                Event you want to attend
              </span>
              <p className="text-sm font-semibold text-zinc-100">{event.title}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{formatEventDateTime(event.startTime, event.endTime)}</span>
              </div>
            </div>

            {/* The Conflicting Class */}
            <div className="p-3.5 rounded-xl border border-rose-900/60 bg-rose-950/20">
              <span className="text-xs uppercase tracking-wider font-semibold text-rose-400 block mb-1">
                ⚠️ Your Conflicting Class Block
              </span>
              <p className="text-sm font-semibold text-zinc-100">
                {conflictingClass?.code}: {conflictingClass?.title}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  {conflictingClass?.days.join(', ')} • {conflictingClass?.startTime} – {conflictingClass?.endTime}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {conflictingClass?.location}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            You can still confirm this RSVP to record your interest and add it to your calendar anyway.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmRsvp(event);
              onClose();
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-zinc-100 shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>RSVP Anyway</span>
          </button>
        </div>
      </div>
    </div>
  );
};
