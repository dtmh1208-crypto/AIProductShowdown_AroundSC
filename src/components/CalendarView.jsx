import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Upload, ChevronLeft, ChevronRight, ArrowRight, X } from 'lucide-react';
import { todayAtCampus, monthCells, shiftMonth, occursOn, formatPersonalTime, readCalendarFile, mergePersonalEvents } from '../utils/personalCalendar';
import { checkCalendarConflict, formatEventDateTime } from '../utils/calendar';
import { ScheduleModal } from './ScheduleModal';
import { CalendarTimeView } from './CalendarTimeView';
import { CalendarYear } from './CalendarYear';
import { PageLink } from './PageLink';
import { composeCalendarSchedule, mockCalendarOccurrences } from '../utils/calendarSchedule';
import { calendarHeading, navigateCalendar, hasCalendarEventsInPeriod } from '../utils/calendarLayout';
import { MOCK_STUDENT_SCHEDULE } from '../data/mockSchedule';

export function CalendarOnboarding({ onGoogle, onApple, onImport, onContinue }) {
  return <section className="calendar-onboarding">
    <span className="calendar-eyebrow"><CalendarDays size={18} /> YOUR TIME, WELL SPENT</span>
    <h2>Plan your<br /><em>campus life.</em></h2>
    <p>Bring your schedule into AroundSC to see your commitments alongside USC events and find opportunities that fit your day.</p>
    <div className="calendar-connect-options">
      <button className="calendar-connect primary" onClick={onGoogle}><strong>Connect Google Calendar <ArrowRight size={18} /></strong><span>Setup required · No account connection is configured.</span></button>
      <button className="calendar-connect" onClick={onApple}><strong>Connect Apple Calendar <ArrowRight size={18} /></strong><span>Use a calendar file exported from Apple. No direct sync.</span></button>
      <button className="calendar-connect" onClick={onImport}><strong><Upload size={18} /> Import calendar file (.ics)</strong><span>Preview your commitments before saving anything.</span></button>
    </div>
    <button className="calendar-link" onClick={onContinue}>Continue without connecting <ArrowRight size={16} /></button>
    <p className="calendar-small">You can explore AroundSC events without a personal calendar. Imports stay in this browser; nothing is uploaded.</p>
  </section>;
}

export function CalendarViewSelector({ view, onView }) {
  return <div className="calendar-view-selector" role="group" aria-label="Calendar view">{['day', 'week', 'month', 'year'].map((name) => <button key={name} aria-pressed={name === view} onClick={() => onView(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div>;
}

export function CalendarHeader({ date, view, onPrevious, onNext, onToday, onView }) {
  return <div className="calendar-month-header"><h2 aria-live="polite">{view === 'month' ? <>{new Date(`${date.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })} <span className="calendar-year">{date.slice(0, 4)}</span></> : calendarHeading(date, view)}</h2>
    {onView && <CalendarViewSelector view={view} onView={onView} />}
    <div className="calendar-navigation" aria-label="Calendar navigation"><button aria-label={`Previous ${view}`} onClick={onPrevious}><ChevronLeft size={19} /></button><button className="calendar-today-button" onClick={onToday}>Today</button><button aria-label={`Next ${view}`} onClick={onNext}><ChevronRight size={19} /></button></div>
  </div>;
}

export function CalendarMonth({ month, selectedDate, today, items, schedule, onMonth, onToday, onDate, onEvent, onMore = onDate, showHeader = true, children }) {
  const cells = monthCells(month);
  const byDate = new Map(cells.map((date) => [date, items.filter((item) => occursOn(item, date))]));
  return <section className="calendar-month" aria-label="Month calendar">
    {showHeader && CalendarHeader({ date: `${month}-01`, view: 'month', onPrevious: () => onMonth(shiftMonth(month, -1)), onNext: () => onMonth(shiftMonth(month, 1)), onToday })}
    {children}
    <div className="calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{cells.map((date) => {
      const dayItems = byDate.get(date);
      const hasDayConflict = dayItems.some((event) => event.kind !== 'personal' && event.kind !== 'mock' && checkCalendarConflict(event, schedule).hasConflict);
      return <div key={date} className={`calendar-cell${date.slice(0, 7) !== month ? ' outside-month' : ''}${date === selectedDate ? ' selected' : ''}${date === today ? ' today' : ''}`}>
        <button className="calendar-date" aria-controls="selected-calendar-agenda" aria-current={date === today ? 'date' : undefined} aria-pressed={date === selectedDate} aria-label={`${date}, ${dayItems.length} events${date === today ? ', today' : ''}`} onClick={() => onDate(date)}>{Number(date.slice(-2))}</button>
        {dayItems.slice(0, 2).map((event) => {
          const personal = event.kind === 'personal', mock = event.kind === 'mock';
          const conflict = !personal && !mock && checkCalendarConflict(event, schedule).hasConflict;
          return <button key={`${personal ? 'p' : 'a'}:${event.id}`} className={`calendar-chip ${mock ? 'mock' : personal ? 'personal' : 'campus'}${conflict ? ' conflict' : ''}`} title={`${mock ? 'Mock class' : personal ? 'Personal' : 'AroundSC'}: ${event.title}${conflict ? ' · Schedule conflict' : ''}`} aria-label={`${mock ? 'Mock class' : personal ? 'Personal' : 'AroundSC'}: ${event.title}${conflict ? ', schedule conflict' : ''}`} onClick={() => { onDate(date); onEvent(event); }}><span className="calendar-chip-symbol" aria-hidden="true">{mock ? 'M' : personal ? 'P' : 'A'}</span><span className="calendar-chip-title">{event.title}</span>{conflict && <span className="calendar-chip-warning" aria-hidden="true">!</span>}<span className="calendar-chip-time" aria-hidden="true">{event.allDay ? 'All day' : new Date(event.startTime).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' })}</span></button>;
        })}
        {dayItems.length > 0 && <button className="calendar-mobile-summary" aria-controls="selected-calendar-agenda" aria-label={`View ${dayItems.length} events on ${date}${hasDayConflict ? ', schedule conflict' : ''}`} onClick={() => onMore(date)}><span aria-hidden="true" className="calendar-mobile-dots">{dayItems.some((item) => item.kind === 'personal') && <i className="personal-dot" />}{dayItems.some((item) => item.kind !== 'personal' && item.kind !== 'mock') && <i className="campus-dot" />}{dayItems.some((item) => item.kind === 'mock') && <i className="mock-dot" />}</span><span>{hasDayConflict && <span className="calendar-mobile-warning" aria-hidden="true">! </span>}{dayItems.length}</span></button>}
        {dayItems.length > 2 && <button className="calendar-more" aria-controls="selected-calendar-agenda" onClick={() => onMore(date)} aria-label={`Show all ${dayItems.length} events on ${date}`}>+{dayItems.length - 2} more</button>}
      </div>;
    })}</div>
  </section>;
}

const EMPTY_CALENDAR = { events: [], continued: false, remember: true, useMock: false };
export function CalendarView({ events, rsvpIds = [], calendarState = EMPTY_CALENDAR, onChange, storageError, schedule = [], onSelectEvent, onExploreEvents, initialView = 'week' }) {
  const [view, setView] = useState(initialView);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayAtCampus);
  const month = selectedDate.slice(0, 7);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [personalDetail, setPersonalDetail] = useState(null);
  const [showMock, setShowMock] = useState(false);
  const agendaRef = useRef(null);
  const personalDetailRef = useRef(null);
  const [agendaRequest, setAgendaRequest] = useState(0);
  useEffect(() => {
    if (agendaRequest) {
      agendaRef.current?.focus({ preventScroll: true });
      agendaRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [agendaRequest]);
  useEffect(() => {
    if (personalDetail) {
      personalDetailRef.current?.focus({ preventScroll: true });
      personalDetailRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [personalDetail]);
  const input = useRef(null);
  const requestId = useRef(0);
  const composed = useMemo(() => composeCalendarSchedule(events, rsvpIds, calendarState.events), [events, rsvpIds, calendarState.events]);
  const campusEvents = composed.campusEvents;
  const mockEvents = useMemo(() => calendarState.useMock ? mockCalendarOccurrences(MOCK_STUDENT_SCHEDULE, selectedDate, view) : [], [calendarState.useMock, selectedDate, view]);
  const allItems = useMemo(() => [...composed.items, ...mockEvents].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)), [composed, mockEvents]);
  const periodHasEvents = hasCalendarEventsInPeriod(allItems, selectedDate, view);
  const [hasSeenSchedule, setHasSeenSchedule] = useState(() => calendarState.continued || calendarState.events.length > 0 || campusEvents.length > 0 || calendarState.useMock);
  useEffect(() => {
    if (calendarState.continued || calendarState.events.length > 0 || campusEvents.length > 0 || calendarState.useMock) setHasSeenSchedule(true);
  }, [calendarState.continued, calendarState.events.length, campusEvents.length, calendarState.useMock]);
  const dayItems = allItems.filter((event) => occursOn(event, selectedDate));
  const change = (next, options) => onChange?.(next, options) !== false;
  const pickFile = () => { setError(''); input.current?.click(); };
  const importFile = async (file) => {
    const id = ++requestId.current;
    setBusy(true); setError(''); setMessage(''); setPreview(null); setReplace(false);
    try { const result = await readCalendarFile(file); if (id === requestId.current) setPreview(result); }
    catch (failure) { if (id === requestId.current) setError(failure.message); }
    finally { if (id === requestId.current) setBusy(false); }
  };
  const confirmImport = () => {
    try {
      if (calendarState.loadFailed && !replace) throw new Error('Confirm replacement of the unreadable saved calendar before importing.');
      const merged = mergePersonalEvents(calendarState.events, preview.events, replace);
      if (!change({ ...calendarState, events: merged.events, continued: true }, { replaceSaved: replace })) return;
      setMessage(`Imported ${merged.events.length - (replace ? 0 : calendarState.events.length)} personal commitments. ${merged.duplicates} duplicate(s) kept unchanged.`);
      const first = preview.events[0];
      if (first) { const date = first.allDay ? first.startTime : todayAtCampus(new Date(first.startTime)); setSelectedDate(date); }
      setPreview(null); setReplace(false); setPersonalDetail(null);
    } catch (failure) { setError(failure.message); }
  };
  const openEvent = (event) => event.kind === 'mock' ? setShowMock(true) : event.kind === 'personal' ? setPersonalDetail(event) : onSelectEvent(event);
  const chooseDate = (date) => { setSelectedDate(date); setPersonalDetail(null); };
  const showCalendar = calendarState.continued || calendarState.events.length > 0 || campusEvents.length > 0 || calendarState.useMock || hasSeenSchedule;
  return <div className="personal-calendar">
    <input ref={input} id="personal-ics-file" aria-label="Import personal calendar .ics file" type="file" accept=".ics,text/calendar" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) importFile(file); }} />
    <details className="calendar-preferences" open={!showCalendar}><summary>Local calendar · Storage & privacy</summary><div className="calendar-privacy"><label><input type="checkbox" checked={calendarState.remember} onChange={(event) => change({ ...calendarState, remember: event.target.checked })} /> Remember on this browser</label><p>Personal titles, times, locations and source identifiers are saved unencrypted on this device when enabled. Avoid shared devices. Turn off for session-only use. No upload or account synchronization.</p></div></details>
    {(storageError || calendarState.loadFailed) && <p role="alert" className="calendar-notice">{storageError || 'Saved personal calendar could not be loaded. Existing data has not been replaced. Import again or explicitly remove saved data.'}</p>}
    {error && <p role="alert" className="calendar-notice">{error}</p>}
    {message && <p role="status" className="calendar-notice">{message}</p>}
    {busy && <p role="status">Reading calendar file…</p>}
    {!showCalendar && !preview && <CalendarOnboarding onGoogle={() => setMessage('Google Calendar: Setup required. This app has no OAuth or Calendar API integration. A Google Cloud project, enabled Calendar API, browser OAuth client ID, authorized origins/redirect URI, consent and read-only scopes must be configured before a real connection can be built. No account is connected. You can import an exported .ics file now.')} onApple={() => { setMessage('Apple Calendar: file import only. On a Mac, select a calendar in Calendar and use File → Export → Export to save an .ics file, then choose Import calendar file below. Direct Apple account sync is not implemented.'); }} onImport={pickFile} onContinue={() => { if (change({ ...calendarState, continued: true })) setMessage('Your calendar shows your RSVPs and personal commitments. Find campus events in discovery, or import your commitments whenever you’re ready.'); }} />}
    {preview && <section className="calendar-preview" aria-labelledby="import-preview-title">
      <h2 id="import-preview-title">Review your import</h2><p>{preview.events.length} supported events from {preview.total} records. Nothing is imported until you confirm. All times are displayed in America/Los_Angeles.</p>
      <p className="calendar-small">Non-recurring events only. Unsupported recurring series, unknown timezones and unreliable times are skipped with explanations. An incomplete import cannot prove that you are free.</p>
      {preview.warnings.length > 0 && <details open><summary>{preview.warnings.length} import notices — review before continuing</summary><ul>{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
      <div className="calendar-preview-list">{preview.events.map((event) => <article key={event.id}><strong>{event.title}</strong><p>{formatPersonalTime(event)}</p>{event.location && <p>{event.location}</p>}<span>{event.busy ? 'Busy commitment' : 'Marked free — does not cause conflicts'}</span></article>)}</div>
      {(calendarState.events.length > 0 || calendarState.loadFailed) && <label className="calendar-replace"><input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} /> {calendarState.loadFailed ? 'Replace unreadable saved personal calendar when I confirm.' : `Replace all ${calendarState.events.length} existing personal commitments when I confirm. Leave unchecked to add and deduplicate.`}</label>}
      <div className="calendar-actions"><button className="calendar-primary" disabled={!preview.events.length || busy || (calendarState.loadFailed && !replace)} onClick={confirmImport}>{replace ? 'Confirm replacement' : 'Confirm import'}</button><button onClick={() => { setPreview(null); setReplace(false); setError(''); }}>Cancel preview</button></div>
      {!preview.events.length && <p>No supported events to import. Existing commitments are unchanged. Export individual occurrences with complete start/end times.</p>}
    </section>}
    {showCalendar && <>
      <div className="calendar-toolbar"><div><span className="calendar-eyebrow">AROUNDSC / CALENDAR</span><p>{calendarState.events.length} personal commitments · {composed.rsvpCount} RSVP’d campus events{composed.savedIds.size > 0 && ` · ${composed.savedIds.size} saved campus imports`}</p></div><div className="calendar-actions"><button onClick={pickFile} disabled={busy}><Upload size={16} /> Import another .ics</button><button onClick={() => setConfirmRemove(true)}>Remove personal calendar</button></div></div>
      <CalendarHeader date={selectedDate} view={view} onView={setView} onPrevious={() => chooseDate(navigateCalendar(selectedDate, view, -1))} onNext={() => chooseDate(navigateCalendar(selectedDate, view, 1))} onToday={() => chooseDate(todayAtCampus())} />
      <div className="calendar-legend"><span><b>P</b> Personal</span><span><b>A</b> AroundSC</span><span><b>!</b> Schedule overlap</span>{calendarState.useMock && <span className="calendar-mock-legend"><b>M</b> Mock class · demo only</span>}<span>USC time · America/Los_Angeles</span></div>
      {!periodHasEvents && <section className="calendar-notice" role="status"><h3>Your schedule is yours to build</h3><p>No commitments in this {view}. RSVP to campus events to add them to your calendar, or import your personal calendar to see your commitments alongside AroundSC events.</p><PageLink href="/discover" className="calendar-link" onClick={onExploreEvents}>Explore events <ArrowRight size={16} /></PageLink></section>}
      {view === 'month' ? <CalendarMonth showHeader={false} month={month} selectedDate={selectedDate} today={todayAtCampus(now)} items={allItems} schedule={schedule} onDate={chooseDate} onEvent={openEvent} onMore={(date) => { chooseDate(date); setAgendaRequest((count) => count + 1); }} />
        : view === 'year' ? <CalendarYear date={selectedDate} today={todayAtCampus(now)} items={allItems} onDate={(date) => { chooseDate(date); setView('day'); }} onMonth={(date) => { chooseDate(date); setView('month'); }} />
        : <CalendarTimeView showEmptyState={false} date={selectedDate} view={view} selectedDate={selectedDate} now={now} items={allItems} schedule={schedule} onDate={chooseDate} onEvent={openEvent} />}
      <p className="calendar-dataset-note">Saved calendar imports + campus RSVPs{calendarState.useMock ? ' + labeled mock classes' : ''} · Campus entries may include sample records or curated public listings · Conflicts reflect imported busy times and the optional mock schedule, not guaranteed availability.</p>
      <section ref={agendaRef} id="selected-calendar-agenda" tabIndex={-1} className="calendar-agenda" aria-labelledby="selected-calendar-day" aria-live="polite"><h3 id="selected-calendar-day">{new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</h3>
        {!dayItems.length && <p>No personal commitments or RSVP’d campus events on this day. Try another date, RSVP in discovery, or import your schedule.</p>}
        {dayItems.map((event) => { const personal = event.kind === 'personal', mock = event.kind === 'mock'; const conflict = !personal && !mock ? checkCalendarConflict(event, schedule) : null;
          return <button key={`${personal ? 'p' : 'a'}:${event.id}`} className={`calendar-agenda-event ${mock ? 'mock' : personal ? 'personal' : 'campus'}`} onClick={() => openEvent(event)}><span className="calendar-eyebrow">{mock ? 'M · MOCK CLASS · DEMO ONLY' : personal ? 'P · PERSONAL' : composed.savedIds.has(event.id) ? 'A · AROUNDSC · SAVED IMPORT' : 'A · AROUNDSC'}{conflict?.hasConflict ? ' · ! CONFLICT' : ''}</span><strong>{event.title}</strong><span>{personal ? formatPersonalTime(event) : formatEventDateTime(event.startTime, event.endTime)}</span><span>{personal || mock ? event.location : event.location.name}</span>{conflict?.hasConflict && <span className="calendar-overlap">{conflict.details}</span>}</button>;
        })}
      </section>
      {personalDetail && <section ref={personalDetailRef} tabIndex={-1} className="calendar-personal-detail" aria-label="Personal commitment details"><button aria-label="Close personal details" onClick={() => setPersonalDetail(null)}><X size={18} /></button><span className="calendar-eyebrow">PERSONAL · PRIVATE TO THIS BROWSER</span><h3>{personalDetail.title}</h3><p>{formatPersonalTime(personalDetail)}</p><p>{personalDetail.location || 'No location supplied'}</p><p>{personalDetail.busy ? 'Busy' : 'Free / transparent'} · Imported from {personalDetail.sourceName}</p>{personalDetail.uid && <p className="calendar-small">Original UID: {personalDetail.uid}</p>}{personalDetail.sourceUrl && <p className="calendar-small">Source URL (from file): {personalDetail.sourceUrl}</p>}</section>}
    </>}
    {(calendarState.events.length > 0 || calendarState.loadFailed || showCalendar) && <div className="calendar-management"><label><input type="checkbox" checked={calendarState.useMock} onChange={(event) => change({ ...calendarState, useMock: event.target.checked })} /> Show mock classes and include them in conflict checks (demo data, not your classes)</label><button className="calendar-link" onClick={() => setShowMock(true)}>View mock class schedule</button>{!showCalendar && <button onClick={() => setConfirmRemove(true)}>Remove saved personal calendar</button>}</div>}
    {confirmRemove && <section role="alert" className="calendar-notice"><h3>Remove your personal calendar?</h3><p>This clears imported commitments and local calendar preferences. AroundSC events and RSVPs stay intact.</p><div className="calendar-actions"><button className="calendar-primary" onClick={() => { if (change({ events: [], continued: false, remember: false, useMock: false }, { removeSaved: true })) { setConfirmRemove(false); setPreview(null); setPersonalDetail(null); setHasSeenSchedule(false); setMessage('Personal calendar cleared from this session. Check any storage warning above before relying on removal from the device.'); } }}>Confirm removal</button><button onClick={() => setConfirmRemove(false)}>Keep calendar</button></div></section>}
    <ScheduleModal isOpen={showMock} onClose={() => setShowMock(false)} schedule={MOCK_STUDENT_SCHEDULE} />
  </div>;
}
