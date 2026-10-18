import React from 'react';
import { useDialog } from './useDialog';
import { Calendar, Clock, MapPin, X, BookOpen, ShieldCheck } from 'lucide-react';

export const ScheduleModal = ({ isOpen, onClose, schedule }) => {
  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="schedule-title" tabIndex={-1} className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-usc-cardinal/20 text-usc-gold border border-usc-gold/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 id="schedule-title" className="text-xl font-semibold text-zinc-100">
                My Class Schedule
              </h3>
              <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
                USC Fall Semester • Active for Conflict Detection
              </span>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-usc-gold shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong>aroundSC</strong> automatically scans these class hours in real time. Whenever a campus event or club meeting overlaps with one of your lecture slots, you will see a warning badge and prompt.
            </p>
          </div>

          <div className="space-y-3">
            {schedule.map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-usc-cardinal text-zinc-100">
                      {course.code}
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-100">
                      {course.title}
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-usc-gold" />
                    <span>{course.days.join(', ')} • {course.startTime} – {course.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{course.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
