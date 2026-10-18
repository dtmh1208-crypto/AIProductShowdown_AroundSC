import React, { useEffect, useRef } from 'react';
import { occursOn, todayAtCampus } from '../utils/personalCalendar';
import { checkCalendarConflict } from '../utils/calendar';
import { HOUR_HEIGHT, timeGridModel, positionTimedEvents, currentTimePosition, initialTimeScroll, dateLabel, timeLabel } from '../utils/calendarLayout';

export function CalendarTimeGrid({ model, items, schedule = [], selectedDate, now, onDate, onEvent, showEmptyState = true }) {
  const today = todayAtCampus(now);
  const currentTop = currentTimePosition(model, now);
  const columns = `64px repeat(${model.days.length}, minmax(0, 1fr))`;
  const invalid = items.filter((event) => !event.allDay && (!Number.isFinite(Date.parse(event.startTime)) || !(Date.parse(event.endTime) > Date.parse(event.startTime))));
  const visible = items.filter((event) => event.allDay ? model.days.some((day) => occursOn(event, day.date)) : positionTimedEvents([event], model.days[0]).length || model.days.slice(1).some((day) => positionTimedEvents([event], day).length));
  const entry = (event, date, props = {}, content) => {
    const personal = event.kind === 'personal', mock = event.kind === 'mock';
    const conflict = !personal && !mock && checkCalendarConflict(event, schedule).hasConflict;
    return <button {...props} className={`${props.className || ''} ${mock ? 'mock' : personal ? 'personal' : 'campus'}${conflict ? ' conflict' : ''}`} aria-label={`${mock ? 'Mock class' : personal ? 'Personal' : 'AroundSC'}: ${event.title}${event.allDay ? ', all day' : `, ${timeLabel(event.startTime)} to ${timeLabel(event.endTime)}`}${conflict ? ', schedule conflict' : ''}`} title={`${event.title}${event.allDay ? ' · All day' : ` · ${timeLabel(event.startTime)} – ${timeLabel(event.endTime)}`}`} onClick={() => { onDate(date); onEvent(event); }}>{content || <><span className="calendar-time-source">{mock ? 'M' : personal ? 'P' : 'A'}{conflict ? ' · !' : ''}</span> {event.title}</>}</button>;
  };
  return <>
    {model.clockChange && <p className="calendar-clock-note">Clock-change week: repeated hours are labeled “again”; shaded slots do not exist on that date. Events crossing these slots are split without changing their actual duration. Times are America/Los_Angeles.</p>}
    {showEmptyState && !visible.length && <p className="calendar-time-empty" role="status">No personal commitments or AroundSC events {model.days.length === 1 ? 'on this day' : 'this week'}. You can still explore the timeline or choose another date.</p>}
    {invalid.length > 0 && <p role="status" className="calendar-clock-note">Not placed on the timeline — missing reliable start/end times: {invalid.map((event) => event.title).join('; ')}.</p>}
    <div className={`calendar-time-inner ${model.days.length === 1 ? 'is-day' : 'is-week'}`}>
      <div className="calendar-time-heading" style={{ gridTemplateColumns: columns }}><span className="calendar-time-corner">USC time</span>{model.days.map((day) => <button key={day.date} className={`calendar-time-date${day.date === today ? ' today' : ''}${day.date === selectedDate ? ' selected' : ''}`} aria-current={day.date === today ? 'date' : undefined} aria-pressed={day.date === selectedDate} onClick={() => onDate(day.date)}><span>{dateLabel(day.date, { weekday: 'short' })}</span><strong>{Number(day.date.slice(-2))}</strong><span className="sr-only">{day.date}</span></button>)}</div>
      <div className="calendar-all-day" style={{ gridTemplateColumns: columns }}><span className="calendar-all-day-label">all-day</span>{model.days.map((day) => <div key={day.date} className="calendar-all-day-cell">{items.filter((event) => event.allDay && occursOn(event, day.date)).map((event) => <React.Fragment key={event.id}>{entry(event, day.date, { className: 'calendar-all-day-event' })}</React.Fragment>)}</div>)}</div>
      <div className="calendar-time-body" style={{ height: model.height, gridTemplateColumns: columns, '--hour-height': `${HOUR_HEIGHT}px` }}>
        <div className="calendar-time-axis">{model.rows.map((row) => <span key={row.key} style={{ top: row.index * HOUR_HEIGHT }}>{row.label}</span>)}</div>
        {model.days.map((day) => <div className={`calendar-time-column${day.date === today ? ' today' : ''}`} key={day.date} data-date={day.date}>
          {model.rows.filter((row) => !day.slots.some((slot) => slot.key === row.key)).map((row) => <div className="calendar-unavailable-hour" style={{ top: row.index * HOUR_HEIGHT, height: HOUR_HEIGHT }} key={row.key} title="This clock hour does not occur on this date"><span>Clock change</span></div>)}
          {positionTimedEvents(items, day).map((piece) => {
            const event = piece.event, location = event.kind === 'personal' || event.kind === 'mock' ? event.location : [event.location?.name, event.room].filter(Boolean).join(' · ');
            return <React.Fragment key={`${event.id}:${piece.start}`}>{entry(event, day.date, { className: `calendar-time-event${piece.height < 35 ? ' short-event' : ''}`, style: { top: piece.top, height: piece.height, left: `calc(${piece.lane / piece.lanes * 100}% + 2px)`, width: `calc(${100 / piece.lanes}% - 4px)` }, 'data-start': new Date(piece.start).toISOString(), 'data-end': new Date(piece.end).toISOString() }, <><strong><span className="calendar-time-source">{event.kind === 'mock' ? 'M' : event.kind === 'personal' ? 'P' : 'A'}{event.kind !== 'personal' && event.kind !== 'mock' && checkCalendarConflict(event, schedule).hasConflict ? ' · !' : ''}</span> {piece.continuesBefore ? '↳ ' : ''}{event.title}{piece.continuesAfter ? ' ↴' : ''}</strong><span>{timeLabel(piece.start)} – {timeLabel(piece.end)}</span>{location && <span>{location}</span>}</>)}</React.Fragment>;
          })}
        </div>)}
        {currentTop !== null && <div className="calendar-now-line" style={{ top: currentTop }} role="status" aria-label={`Current USC time: ${timeLabel(now)}`}><span>{timeLabel(now)}</span></div>}
      </div>
    </div>
  </>;
}

export function CalendarTimeView({ date, view, now, ...props }) {
  const model = timeGridModel(date, view);
  const scrollRef = useRef(null);
  const firstDate = model.days[0].date;
  useEffect(() => {
    if (scrollRef.current) {
      // Headings/all-day rows precede the timed body; the default opens around work hours.
      const body = scrollRef.current.querySelector('.calendar-time-body');
      const bodyOffset = body ? body.getBoundingClientRect().top - scrollRef.current.getBoundingClientRect().top + scrollRef.current.scrollTop : 0;
      scrollRef.current.scrollTop = bodyOffset + initialTimeScroll(model, now);
    }
  }, [view, firstDate]);
  return <section aria-label={`${view === 'day' ? 'Day' : 'Week'} hourly calendar`}>
    {view === 'week' && <p className="calendar-time-mobile-help">Scroll sideways for all seven days. Select an event to see its full details.</p>}
    <div ref={scrollRef} className="calendar-time-scroll" tabIndex={0} aria-label="Scrollable hourly schedule"><CalendarTimeGrid {...props} model={model} now={now} /></div>
  </section>;
}
