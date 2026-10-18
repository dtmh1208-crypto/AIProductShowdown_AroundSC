import React, { useState } from 'react';
import { CAMPUS_LOCATIONS } from '../data/campusLocations';
import { INTERESTS } from '../utils/discoveryParser';

const formatMinutes = (minutes) => minutes === null ? null : `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes >= 720 ? 'PM' : 'AM'}`;
const EXAMPLE = "I'm free from 3:00-4:00 PM near TCC. Find tech events or coffee chats before my next class in JFF at 4:00 PM.";

export function AskAroundSC({ exampleQuery = 'Find tech events today', parsed, ignoreLocations, resultCount, onSearch, onClear, onIgnoreLocations }) {
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState('');
  const criteria = parsed?.criteria;
  const blocked = parsed && (parsed.errors.length > 0 || (parsed.unresolvedLocations.length > 0 && !ignoreLocations));
  return (
    <section aria-labelledby="ask-aroundsc-title" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-3">
      <div>
        <h2 id="ask-aroundsc-title" className="text-xl font-semibold text-zinc-100">Ask AroundSC</h2>
        <p id="ask-help" className="text-sm text-zinc-400 mt-1">Describe your interests, available time, and campus location.</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setSubmitted(draft); onSearch(draft); }} className="space-y-3">
        <label htmlFor="ask-request" className="block text-sm font-medium text-zinc-200">What would you like to discover?</label>
        <textarea id="ask-request" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} aria-describedby="ask-help ask-supported" placeholder={EXAMPLE}
          className="w-full rounded-md bg-zinc-950 border border-zinc-700 p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-usc-gold/60" />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-lg px-4 py-2 bg-usc-cardinal hover:bg-usc-cardinal-light text-sm font-semibold text-zinc-100">Search events</button>
          <button type="button" onClick={() => { setDraft(''); setSubmitted(''); onClear(); }} className="rounded-lg px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-sm text-zinc-200">Clear Ask search</button>
          <button type="button" onClick={() => setDraft(exampleQuery)} className="rounded-lg px-3 py-2 text-sm text-usc-gold hover:bg-zinc-800">Try “{exampleQuery}”</button>
        </div>
      </form>
      <details id="ask-supported" className="text-xs text-zinc-400">
        <summary className="cursor-pointer text-zinc-300">Supported wording and starting buildings</summary>
        <p className="mt-2">Interests: tech/AI/coding, painting, coffee chats, academic, social, career, sports, arts, workshops. Interests are alternatives (OR). Use today, tomorrow, or a date such as 2026-10-20; “from 3:00-4:00 PM”, “near TCC”, or “before my next class in JFF at 4:00 PM”. Full event attendance only. Times use America/Los_Angeles (USC).</p>
        <p className="mt-2">Buildings: {Object.values(CAMPUS_LOCATIONS).map((loc) => `${loc.code} (${loc.name})`).join('; ')}.</p>
      </details>
      {parsed && (
        <div role="status" aria-live="polite" className="border-t border-zinc-800 pt-3 space-y-2 text-sm">
          <h3 className="font-semibold text-zinc-100">Interpreted request</h3>
          <p className="text-xs text-zinc-400">Submitted: {submitted}</p>
          {draft !== submitted && <p className="text-amber-300">Draft changed. Submit Search events to apply your edits.</p>}
          <ul className="space-y-1 text-zinc-300">
            <li>Date: {criteria.date} · USC time (America/Los_Angeles)</li>
            <li>Interests (OR): {criteria.interests.length ? criteria.interests.map((id) => INTERESTS[id].label).join(' or ') : 'Any supported interest'}</li>
            {criteria.startMinutes !== null && <li>Full event within: {formatMinutes(criteria.startMinutes)}–{formatMinutes(criteria.endMinutes)}</li>}
            {criteria.deadlineMinutes !== null && <li>Hard deadline: event must end by {formatMinutes(criteria.deadlineMinutes)}</li>}
            {criteria.origin && <li>Near: {criteria.origin.text} {criteria.origin.code ? '(within 300 m straight-line distance)' : '(unresolved)'}</li>}
            {criteria.destination && <li>Next class building: {criteria.destination.text} {criteria.destination.code ? '(recognized; travel unverified)' : '(unresolved)'}</li>}
            {criteria.freeFoodOnly && <li>Free food required</li>}
          </ul>
          {parsed.warnings.map((warning) => <p key={warning} className="text-amber-200">{warning}</p>)}
          {parsed.errors.map((error) => <p key={error} className="text-rose-300">{error}</p>)}
          {parsed.unresolvedLocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-amber-200">Cannot resolve with available location evidence: {parsed.unresolvedLocations.join(', ')}. Choose a supported building or explicitly continue without unresolved location constraints. Time limits and recognized locations remain applied.</p>
              {!ignoreLocations && !parsed.errors.length && <button type="button" onClick={onIgnoreLocations} className="rounded-lg px-3 py-2 border border-amber-600 text-amber-200 hover:bg-amber-900/20">Search without location</button>}
              {ignoreLocations && <p className="text-amber-200">You chose to search without unresolved locations. Travel feasibility remains unverified.</p>}
            </div>
          )}
          <p className="text-zinc-400">Existing search, category, time, food, conflict, and RSVP filters also apply (AND).</p>
          {blocked ? <p className="text-zinc-200">Search needs clarification; no matching pins are shown.</p> : (
            <p className="text-zinc-100">{resultCount ? `${resultCount} matching event${resultCount === 1 ? '' : 's'}.` : 'No matching events. Try another interest, date, or supported building, or review existing filters. Deadlines are never relaxed automatically.'}</p>
          )}
        </div>
      )}
    </section>
  );
}
