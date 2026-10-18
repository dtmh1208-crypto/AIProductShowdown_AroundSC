import React from 'react';
import { monthCells, occursOn } from '../utils/personalCalendar';
import { dateLabel } from '../utils/calendarLayout';

export function CalendarYear({ date, today, items, onDate, onMonth }) {
  const year = date.slice(0, 4);
  return <section className="calendar-year-grid" aria-label={`${year} year overview`}>{Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    return <section className="calendar-mini-month" key={month} aria-label={dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}>
      <button className="calendar-mini-month-title" onClick={() => onMonth(`${month}-01`)}>{dateLabel(`${month}-01`, { month: 'long' })}</button>
      <div className="calendar-mini-weekdays" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <span key={i}>{day}</span>)}</div>
      <div className="calendar-mini-days">{monthCells(month).map((day) => {
        if (!day.startsWith(month)) return <span key={day} />;
        const count = items.filter((event) => occursOn(event, day)).length;
        return <button key={day} className={`${day === today ? 'today ' : ''}${day === date ? 'selected ' : ''}${count ? 'has-events' : ''}`} aria-current={day === today ? 'date' : undefined} aria-pressed={day === date} aria-label={`${day}, ${count} events, open day`} onClick={() => onDate(day)}>{Number(day.slice(-2))}</button>;
      })}</div>
    </section>;
  })}</section>;
}
