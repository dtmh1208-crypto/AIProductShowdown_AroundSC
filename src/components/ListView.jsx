import React from 'react';
import { EventCard } from './EventCard';
import { Sparkles, CalendarX } from 'lucide-react';

export const ListView = ({
  events,
  schedule,
  rsvpIds,
  onRsvpClick,
  onSelectEvent,
  checkConflict
}) => {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center max-w-xl mx-auto my-8">
        <CalendarX className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-zinc-100 mb-1">No matching events found</h3>
        <p className="text-sm font-normal text-zinc-400">
          Try loosening your search filters, category selection, or turn off the conflict filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {events.map((event) => {
        const conflict = checkConflict(event, schedule);
        const isRsvpd = rsvpIds.includes(event.id);

        return (
          <EventCard
            key={event.id}
            event={event}
            conflictInfo={conflict}
            isRsvpd={isRsvpd}
            onRsvpClick={onRsvpClick}
            onSelectEvent={onSelectEvent}
          />
        );
      })}
    </div>
  );
};
