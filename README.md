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

“Near” is a 300-metre straight-line radius, not walking distance. No travel times or class-arrival guarantee are provided. Unsupported wording is blocked instead of silently omitted. Dates, formatting, conflict detection and sample-date generation use America/Los_Angeles. The class schedule is a mock schedule, not imported from a student's account.

RSVPs are local browser state, not reservations or external registrations. The unified list uses `aroundsc_showcase_rsvps`. On first use it imports existing `aroundsc_rsvps` and `aroundsc_verified_rsvps`, maps any deduplicated/reassigned IDs, and removes repeated selections. Once the unified key exists, it is authoritative—even when empty—so old selections cannot resurrect a removed RSVP. Legacy keys are left intact. Use the organizer's link to register if required. Google Calendar links open an event-creation form; `.ics` files are exports. Neither synchronizes a calendar or reads your calendar. Exports include source/registration links and eligibility information.

## Architecture and limitations

- `src/utils/eventAdapter.js`: curated-record validation plus unified collection assembly, conservative deduplication and ID aliases. `mapOnly: true` gates curated map records. `mapOnly: false` supports future list-only records with `coordinates: null`; the showcase collection still requires map coordinates for every visible record.
- `src/utils/rsvpStorage.js`: one-time migration into the unified local RSVP list.
- `src/utils/discoveryParser.js` and `discoveryMatching.js`: modular rule-based parsing and matching; replaceable by a future parser with the same criteria contract.
- `src/components/AskAroundSC.jsx`: request review and clarification.
- `src/App.jsx`: shared collection, filters, local RSVPs and view/modal coordination.
- `src/utils/calendar.js`: USC time helpers, mock-schedule conflicts and calendar exports.

Focused tests validate records and filtering/export behavior, not real-world availability. Both map modes, view switching, clicking pins, RSVP persistence, conflict dialogs, keyboard/mobile usability and opening external registration/calendar links still require browser checks. The vector map needs network access and browser graphics support; the 2D radar remains available. The curated portion may have no events today or tomorrow and will eventually be empty until manually refreshed; its fixed dates are never shifted to make the demo work. Samples remain available in the same showcase collection.


## Functionality audit checks

Run `node --test tests/*.test.js`, `npm run build`, and `git diff --check`. The project has no npm test script and uses Node’s existing test runner; no additional test packages are needed.

`tests/audit.test.js` covers the shared filter/RSVP pipeline, component callbacks, rendered controls and links, calendar download operations with browser API doubles, map lifecycle with an injected engine double, and dialog keyboard/focus logic with a DOM double. `tests/pages.test.js` checks route-specific server rendering and navigation callbacks. These are not mounted browser interaction tests. A passing suite does not verify real WebGL tiles, mobile layouts, browser refresh persistence, actual focus behavior, downloaded-file imports, or external registrations.

The map starts in the offline 2D radar. Switching to the vector map initializes its visible container; unsupported graphics, renderer errors, or a ten-second load timeout show the radar with an explanation. Event data and coordinates are unchanged. Dialogs include names, Escape handling, focus wrapping/restoration, and scroll locking; the conflict warning is layered above event details. Manual browser checks remain necessary.
