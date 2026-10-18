# aroundSC

USC campus event discovery showcase prototype built with React 18, Vite and Tailwind CSS. One discovery experience combines synthetic sample records and manually curated public USC listings. Ask AroundSC uses a local, rule-based parser. There is no AI API, live event feed, EngageSC connection, authentication, or calendar synchronization.

## Run locally

Use Node 22 or a compatible version of Node supported by the installed Vite version, and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

```bash
node --test tests/*.test.js
npm run build
npm run preview
```

## Pages and routing

- `/` is the separate AroundSC homepage: navigation, hero, actual-event previews, featured grid, how-it-works, about and closing CTA. It does not mount Ask AroundSC, the map or discovery filters.
- `/discover` is the functional event discovery app. Explore events and Discover links use the History API; the AroundSC wordmark returns to `/`. Browser Back/Forward changes pages. Category links can open `/discover?category=Arts`.
- Featured cards use actual records from the same collection and open the existing event-details modal. Homepage cards do not display invented attendance counts.

`App.jsx` owns one event/filter/RSVP controller shared across pages. `LandingPage.jsx` and `DiscoverPage.jsx` are separate render branches; no second discovery engine was introduced. Submitted natural-language criteria and other filters survive client-side page changes, and local RSVPs remain in the existing browser storage key.

Vite's asset base is `/`. The local Vite dev and preview servers provide SPA fallback for direct `/discover` loads. For production hosting, serve `dist/` at the domain root and configure unknown application paths (including `/discover`) to serve `index.html`, while keeping `/assets/*` as static files. A static host without this rewrite will return a 404 on refresh; this repository does not configure an external deployment. Do not open `dist/index.html` via `file://`.

The homepage uses CSS entrance/hover animations and IntersectionObserver reveals, with readable fallbacks and reduced-motion handling. The live-browser acceptance checks (visual/mobile layout, click navigation, browser Back/Forward/refresh, featured modals, map modes and RSVP persistence) are separate from static/server-render tests.

## One showcase collection

The `/discover` page uses one collection shared by the map, list, filters, counts, natural-language search, event details and My RSVPs. There is no collection selector. Both source files stay in the project: `src/data/eventsData.js` contains 32 synthetic sample events, and `src/data/verifiedEvents.js` contains two manually curated public USC listings. Neither an AI API nor a live USC/EngageSC feed is connected.

Samples have illustrative descriptions, attendance, food perks and dates generated relative to the current USC date when the module loads. Curated listings keep their real dates, source/registration URLs, eligibility restrictions and coordinate provenance, available in event details. Only those curated listings have review metadata; samples are never marked verified.

`buildShowcaseCollection` first validates curated records with the existing adapter, then checks the complete collection for duplicate identities and ID collisions. A duplicate requires the exact interval and venue/room, plus either the normalized title and organizer or an event-specific URL and matching title. Organizer homepages, similar titles and nearby coordinates alone never trigger a merge. Curated records are preferred when a matching sample representation exists, preserving provenance. Unrelated events sharing an ID are retained with a unique prefixed ID. Original IDs are aliased for RSVP migration. Current data has **34 events, zero duplicates and zero ID collisions** at the review time.

Curated records are excluded once their start time is reached, or when validation identifies cancellation, postponement, unconfirmed status or missing evidence. The collection is reevaluated every 30 seconds. Samples remain intentionally present; failed or expired curated records are not relabeled, moved to today or substituted with newly invented records. Later real-world changes require manual source review.

## Curated public USC listings

Reviewed October 17, 2026, 7:48 PM PDT (`2026-10-18T02:48:22Z`). Two events passed the initial map-focused gate:

- **Crafting Your Ph.D. Elevator Pitch**, October 20, 2026, 5:30–7 PM PDT, Doheny Memorial Library, room 240. Designed for first-year Dornsife Ph.D. students; others must contact the organizer. Admission cost and free food are not confirmed. The listing separates check-in/dinner at 5:30 from programming at 6. [Official source](https://calendar.usc.edu/event/crafting-your-phd-elevator-pitch). [Original registration URL](https://forms.gle/xj8HrRqDP2GqbkE69); the destination form could not be independently loaded during review.
- **Future Archive**, October 20, 2026, 5–7 PM PDT, Library for International and Public Affairs. Free, open to everyone. The official listing says no reservation is required and also provides an RSVP link; both facts are preserved. [Official source](https://calendar.usc.edu/event/future-archive). [Original external RSVP link](https://engage.usc.edu/USCLibraries/rsvp_boot?id=413408). This is an outbound link, not an EngageSC integration. [Arts in Action corroboration](https://artsinaction.usc.edu/event/future-archive/), [Visions & Voices corroboration](https://visionsandvoices.usc.edu/events/53995646323032).

Coordinate provenance: the **Event Location Map** links on those official USC event pages explicitly publish the named venue map centers. DML: longitude `-118.283725`, latitude `34.020197`. Library for International and Public Affairs: longitude `-118.283977`, latitude `34.021192`. These are venue-level map points, not room/entrance coordinates. The Google map embeds themselves were not loadable through the research tool; the coordinate parameters came from the actual links on the official pages. The Future Archive page does not give a building code or room, so those remain blank. All pins retain their stored venue coordinates. Collocated events use screen-space display offsets in both map modes so each pin remains selectable; these offsets do not represent different venues or entrances.

Excluded candidates:

- Public Lecture in Armenian at TCC: its official map link publishes a point that appears inconsistent with the named venue. Do not substitute the prototype's TCC coordinates without resolving that discrepancy.
- DREAM Industry Mentorship sessions: the public Viterbi listing showed October 19 and 26 at RTH, but occurrence-level source, admission/eligibility and coordinate verification were not completed. They are not in the verified data.
- Events whose venue is hidden behind EngageSC, events with missing end times, and curated records without verified map coordinates are not admitted to the curated portion of the showcase.

## Refreshing verified data manually

1. Read the public official event detail page. Confirm the exact occurrence date, start and end times, America/Los_Angeles offset, venue, admission/eligibility restrictions and current cancellation/postponement notices. Recheck near the demo date. Never move a real event to today to make a demo work.
2. Copy the original source and registration URLs. Preserve link availability caveats. Use a short original summary rather than copied descriptions or images. Never infer free food from free admission, a dinner mention, or a registration button. Leave unknown attendance/food values `null`.
3. Verify a venue-level coordinate against an official published map point. Record the source URL, the actual coordinate evidence and review time. Do not infer coordinates from a nearby building. Curated records without that evidence cannot enter the showcase map.
4. Add the reviewed record to `src/data/verifiedEvents.js`. Update `VERIFIED_CHECKED_AT` only when the entire snapshot has actually been reviewed. Each record also retains its own review timestamp. Categories are editorial mappings into the prototype's existing categories; original source event types are retained.
5. Run the tests and build. Check the adapter diagnostics and the UI. Do not assume passing validation proves an external fact: human source review is still required.

USC's published [external-display guidance](https://calendarhelp.usc.edu/welcome/add-a-feed/) and [calendar FAQ](https://calendarhelp.usc.edu/frequently-asked-questions/) describe displaying calendar listings on other sites via widgets/API. Their indexed official text was available, but direct help-page fetches returned errors during research. Some calendar requests were rate-limited. No API/feed endpoint, access conditions, rate limits or automated collection workflow have been verified or implemented. Public accessibility is not treated as blanket permission to scrape standalone department sites. This demo uses manually curated factual metadata, source attribution and original summaries; no copied images.

## Search and calendar behavior

Example queries that work across the showcase collection:

- `Find arts or workshop events on 2026-10-20`
- `Find workshop events on 2026-10-20 near DML from 5-7 PM`
- `Find arts events on 2026-10-20 before my next class at 6 PM` (no results: the exhibition ends at 7 PM)

The parser supports today, tomorrow, or a single `YYYY-MM-DD` date, supported interests, explicit time windows, starting buildings and next-class deadlines. Interests use OR; all other constraints and existing filters use AND. An entire event must fit the window. Unknown locations require clarification or the explicit **Search without location** action; that action retains recognized starting locations and all time/deadline constraints. Starting-building recognition uses the existing prototype campus registry. DML has reviewed coordinate provenance; other prototype anchors are not newly verified by combining the records. The Future Archive venue has an event-specific map point but is not yet a supported starting-building alias.

“Near” is a 300-metre straight-line radius, not walking distance. No travel times or class-arrival guarantee are provided. Unsupported wording is blocked instead of silently omitted. Dates, formatting, conflict detection and sample-date generation use America/Los_Angeles. The original mock class schedule remains available as an explicitly labeled, opt-in demo option. Imported personal commitments also participate in conflict checks; neither is imported from a university account.

RSVPs are local browser state, not reservations or external registrations. The unified list uses `aroundsc_showcase_rsvps`. On first use it imports existing `aroundsc_rsvps` and `aroundsc_verified_rsvps`, maps any deduplicated/reassigned IDs, and removes repeated selections. Once the unified key exists, it is authoritative—even when empty—so old selections cannot resurrect a removed RSVP. Legacy keys are left intact. Use the organizer's link to register if required. Google Calendar links open an event-creation form; `.ics` files are exports. Neither synchronizes a calendar or reads your calendar. Exports include source/registration links and eligibility information.

## Architecture and limitations

- `src/utils/eventAdapter.js`: curated-record validation plus unified collection assembly, conservative deduplication and ID aliases. `mapOnly: true` gates curated map records. `mapOnly: false` supports future list-only records with `coordinates: null`; the showcase collection still requires map coordinates for every visible record.
- `src/utils/rsvpStorage.js`: one-time migration into the unified local RSVP list.
- `src/utils/discoveryParser.js` and `discoveryMatching.js`: modular rule-based parsing and matching; replaceable by a future parser with the same criteria contract.
- `src/components/AskAroundSC.jsx`: request review and clarification.
- `src/App.jsx`: shared collection, filters, local RSVPs and view/modal coordination.
- `src/utils/calendar.js`: USC time helpers, imported-commitment and optional mock-schedule conflicts, and calendar exports.

Focused tests validate records and filtering/export behavior, not real-world availability. Both map modes, view switching, clicking pins, RSVP persistence, conflict dialogs, keyboard/mobile usability and opening external registration/calendar links still require browser checks. The vector map needs network access and browser graphics support; the 2D radar remains available. The curated portion may have no events today or tomorrow and will eventually be empty until manually refreshed; its fixed dates are never shifted to make the demo work. Samples remain available in the same showcase collection.


## Functionality audit checks

Run `node --test tests/*.test.js`, `npm run build`, and `git diff --check`. The project has no npm test script and uses Node’s existing test runner; no additional test packages are needed.

`tests/audit.test.js` covers the shared filter/RSVP pipeline, component callbacks, rendered controls and links, calendar download operations with browser API doubles, map lifecycle with an injected engine double, and dialog keyboard/focus logic with a DOM double. `tests/pages.test.js` checks route-specific server rendering and navigation callbacks. These are not mounted browser interaction tests. A passing suite does not verify real WebGL tiles, mobile layouts, browser refresh persistence, actual focus behavior, downloaded-file imports, or external registrations.

The map starts in the offline 2D radar. Switching to the vector map initializes its visible container; unsupported graphics, renderer errors, or a ten-second load timeout show the radar with an explanation. Event data and coordinates are unchanged. Dialogs include names, Escape handling, focus wrapping/restoration, and scroll locking; the conflict warning is layered above event details. Manual browser checks remain necessary.


## Personal Calendar tab

Open `/discover` → **Calendar** (or **My Schedule**). First use offers onboarding; **Continue without connecting** opens Week view without personal commitments. Day, Week, Month and Year are functional views. Switching views retains the selected date; previous/next move by the active unit and Today returns to USC-local today. Month keeps its selected-day agenda, two event previews per cell and accessible “more” action. All calendar views combine imported commitments, existing local campus RSVPs, and explicitly enabled mock-class occurrences. An imported AroundSC export is an independent saved commitment: its exact exported UID and occurrence interval can identify a campus record even after RSVP cancellation. Discovery filters do not change calendar membership, and map/list/Ask AroundSC continue to browse the full campus collection. Duplicate RSVP IDs cannot create duplicate calendar entries. New users start without an invented RSVP; existing saved and migrated RSVPs remain intact. Removing an RSVP from calendar details closes that detail and removes its RSVP-driven entry; an independently imported copy remains visible. Its calendar-only workspace uses a white surface, light weekday/grid dividers, compact source-labeled entries and separate today/selection highlights. On narrow screens the date grid uses source dots and event-count buttons instead of unreadably narrow event titles; selecting a count or “more” focuses and scrolls to the complete selected-day agenda. Selecting an AroundSC entry opens the existing details, registration, RSVP and export interface. Personal events are labeled P; campus events A; conflicts include a text “!” indicator. Mock classes are off by default and can be enabled or inspected separately. When enabled, the existing weekly rules are displayed as M / Mock class entries, with their actual demo rule times, independently of RSVP state.

**Google:** Setup required. No OAuth, Calendar API client, account connection or live sync is implemented. The action explains missing Google Cloud/OAuth configuration; existing Google event-creation links still work independently. **Apple:** `.ics` files exported from Apple Calendar can be imported; there is no Apple account authentication or synchronization. No backend, paid service, AI API or new dependencies were added.

### Import and privacy

- Choose an `.ics` file (maximum 512 KB and 1,000 VEVENT records). Parsing runs locally, with a scrollable preview showing titles, dates, times, locations and notices. Nothing is added before **Confirm import**. Cancel discards only the preview.
- Individual, non-recurring events support UTC, IANA TZID times, and all-day dates with exclusive end dates. Floating times are explicitly interpreted in America/Los_Angeles. Quoted TZIDs, folded lines, escaped text and common durations are supported. An all-day event without an end spans one day. Timed events need an end or supported duration.
- Recurring series and overrides are **skipped entirely**, with notices; no recurrence expansion is implemented. Export individual occurrences. Unsupported/custom timezones, ambiguous or nonexistent DST times, malformed events and missing timed ends are skipped with explanations. Cancellation notices are rejected and cancelled events omitted. Review warnings: an incomplete import cannot establish that you are free.
- Imports add to existing commitments. The same UID + start instant is deduplicated, retaining the existing record; without a UID, title/start/end/location establish identity. Changed start times count as distinct occurrences. This is a snapshot importer, not an update/cancellation synchronization engine. Use explicit replacement to refresh the whole snapshot.
- **Replace all** in the preview requires checking the replacement option and clicking **Confirm replacement**. Unreadable saved data also requires explicit replacement acknowledgement. **Remove personal calendar** requires a separate confirmation and returns to onboarding; campus data and RSVP keys are untouched.
- **Remember on this browser** stores only normalized calendar metadata under `aroundsc_personal_calendar_v1`, separately from RSVP data. The bounded, normalized snapshot is capped at 1 MB for localStorage. This is appropriate only for a small, explicitly disclosed prototype snapshot: it is unencrypted, accessible to scripts on the same origin, and unsuitable for sensitive schedules on shared devices. Disable Remember for session-only use. Raw files are not saved, and personal data is never sent to a server or AI service.
- Storage errors are surfaced. Failed persistent saves leave the current calendar unchanged; session-only mode can continue in memory. If browser storage cannot be cleared, the UI explicitly warns that old saved data may return after refresh and that site storage must be cleared in the browser. Local browser storage is not a backup and does not synchronize between devices.

If an import appears on only one day, first review the preview's dates and import notices. A mixed export can contain one supported standalone event and multiple unsupported recurring classes; only the supported records are offered for confirmation. No weekly occurrences are generated from recurrence rules. Confirmation merges **all** supported preview records, then selects the first imported event's USC-local date; selecting that date does not filter the saved collection. Other occurrences can be in a different week or month. Day, Week and Month all receive the same composed personal/campus collection and place events using America/Los_Angeles dates. UTC midnight can belong to the previous USC date, while all-day dates retain their original calendar dates and exclusive ends. Do not clear or replace storage to diagnose missing occurrences. The original file and actual browser data are needed to establish which records a particular import contained.

`tests/calendarImportDates.test.js` covers multi-date preview parsing, repeated UIDs at distinct starts, additive confirmation helpers, save/reload with isolated in-memory storage, explicit rejection of weekly recurrence/exception records, UTC/IANA/floating boundaries, DST/month/year transitions, and Day/Week/Month date placement and event callbacks using restored records. These are synthetic regression fixtures outside the application dataset, not recovered classes. They do not verify a user's actual import, browser storage, mounted file-picker/confirmation interaction, or visual layout.

Personal commitments are kept outside the campus adapter and search dataset. The shared conflict checker compares real intervals with strict overlap (`start < otherEnd && end > otherStart`); adjacent boundaries are free. Busy all-day commitments use campus-local midnight boundaries. Events marked TRANSPARENT remain visible but do not block availability. All personal overlaps are listed in campus details; the existing RSVP warning still allows RSVP Anyway. Optional mock-class conflicts are labeled “Mock”. RSVP persistence and existing calendar exports remain separate.

### Checks and manual walkthrough

`tests/personalCalendar.test.js` adds parser, file-validation, timezone/DST, deduplication, persistence, overlap, date-grid, rendered-state and callback checks using Node’s existing runner. Run `node --test tests/*.test.js`, `npm run build`, and `git diff --check`.

Manual browser checks still needed:

1. Open Calendar → test Google/Apple explanations, Continue, previous/next month, Today, date selection, overflow, keyboard focus and mobile layout.
2. Export a small **non-recurring** real calendar to `.ics`. Choose it, inspect preview notices and times, cancel, reopen and confirm. Verify personal details and a campus-event details/RSVP flow.
3. Import it again (no duplicate commitments), add another file, explicitly replace, then refresh with Remember enabled. Test session-only mode separately.
4. Confirm a real overlapping commitment appears in calendar and campus details and activates the existing RSVP warning; adjacent events must not conflict. Test No Conflicts in map/list and the opt-in mock schedule.
5. Confirm removal, refresh, and verify onboarding returns while campus events and RSVPs remain. Exercise a blocked/full-storage browser separately. External Google/Apple account connections are not available to test.

These automated checks are not real-browser file-picker, refresh, visual, or external-service tests. The production host still needs the SPA fallback described above for direct `/discover` refreshes.


### Day, Week and Year views

Day shows one selected date on a vertical hourly timeline; Week shows seven Sunday–Saturday columns sharing a time axis. Both use the same source-aware saved-import/RSVP collection as Month and Year, alongside independent personal commitments and enabled mock classes. Empty visible periods offer “Your schedule is yours to build” and an Explore events link that switches `/discover` to its list view. Event offsets/heights come from actual start/end instants (64 pixels per elapsed hour), with greedy overlap lanes. Overnight events are clipped into date segments that retain the original record and ID. All-day entries stay above the hourly grid; invalid timed data is not assigned an invented time. Personal and campus entries keep their source labels and existing conflict/details actions. The timeline starts near current time if today is visible, otherwise near 8 AM, and the current-time line refreshes every 30 seconds. The week can scroll horizontally on smaller screens while the time axis remains sticky.

The timeline uses America/Los_Angeles clock-hour slots. A fall-back day includes a second labeled 1 AM slot. A spring-forward day omits its nonexistent 2 AM hour. Week views use the union of those slots and shade hours absent from a date; events crossing a gap split into visual segments so their combined height still reflects real elapsed duration. Source timestamps, import eligibility and recurrence limitations are unchanged.

Year displays twelve real mini-month calendars. Selecting a month opens Month; selecting a date opens Day. Month/year navigation clamps dates such as January 31 and February 29 to the last valid day of the destination month/year.

`tests/calendarLayout.test.js` checks exact offsets/durations, overlap lanes, adjacent boundaries, midnight splits, both DST transitions, current-time visibility, scroll targets, all navigation units, all four rendered layouts and source-preserving callbacks. These are logic/server-render/callback tests. Browser scroll positioning, sticky headers/axis, real view switching, desktop/mobile appearance and click-to-modal behavior still require manual verification. No browser screenshots were captured for this change.


Calendar RSVP regression checks live in `tests/calendarRsvp.test.js`: ID-based membership and deduplication; RSVP add/cancel and storage reloads; personal-only schedules; all four rendered views receiving changed RSVP props; period-specific empty states and the discovery-list action; and unchanged keyword/NLP discovery. The existing migration test now expects an empty RSVP list for a new user rather than automatically selecting the first sample event. These checks do not constitute a mounted browser refresh or real click test; manually verify RSVP → Calendar → remove RSVP → refresh before a demo.


### Existing-engagement investigation and preservation

The pre-filter calendar implementation in this working session received `activeEvents` and combined **every active campus record** with imported commitments. Those displayed campus records were not saved engagements. The committed version (`2f23aba`) predates the Calendar tab and shows a static mock-class schedule modal. No independent saved/pinned campus-event collection, storage key or committed historical calendar snapshot exists in this repository. Known persistent sources are the unified/legacy RSVP IDs and `aroundsc_personal_calendar_v1`; mock classes come from the existing static rules and saved `useMock` preference. The app does not infer past intent from previous visibility, populate a saved baseline from all events, or resurrect cancelled legacy RSVPs.

`calendarSchedule.js` now composes actual sources without rewriting them. Personal imports remain independent. AroundSC exports use the actual `${event.id}@aroundsc.local` UID emitted by the existing exporter; only this identifier plus the same start/end interval (at the export's whole-second precision) links a saved import to a campus occurrence. Matching import + RSVP records display once with canonical campus metadata and a “Saved import” label in the agenda. Cancelling RSVP does not delete that imported commitment. If a campus record disappears or changes dates, its stored import remains at its original dates as a personal record. Matching titles alone never merges records. An imported copy is excluded from its own campus conflict check; unrelated overlaps still warn.

No new saved-engagement store or migration was introduced. The existing import and RSVP keys are untouched by composition. A calendar that merely displayed the full dataset did not persist those records as personal commitments, so there is no recoverable subset of intended campus engagements. RSVP storage contains IDs, not historical event snapshots; generated sample dates can change on reload, and curated records stop appearing in discovery when no longer upcoming. Original historical times cannot be reconstructed from an ID alone. Stored imports keep their real saved times. Source-code inspection cannot prove which records exist in a particular browser; no historical user data recovery is claimed.

`tests/calendarSchedule.test.js` covers pre-existing import persistence without rewrites, new/removed RSVPs, independently saved exports surviving cancellation, UID/occurrence deduplication, missing-record fallback, self-conflict avoidance, unchanged discovery, and real mock-rule expansion/rendering. Browser refresh, interactions and the contents of a user's browser storage still need manual verification.
