# aroundSC — Technical Stack & Architecture

This document details the architecture, libraries, APIs, design systems, and algorithmic decisions powering **aroundSC**.

---

## 🏗️ 1. Architecture Overview

`aroundSC` is architected as a high-performance, client-first Single Page Application (SPA). Designed for responsive campus wayfinding and rapid event triage, it operates with zero runtime server latency while supporting offline resilience during live pitch demonstrations.

```
┌─────────────────────────────────────────────────────────────┐
│                       aroundSC Web Client                   │
├───────────────────────────────┬─────────────────────────────┤
│      Interactive Map View     │      List Directory View    │
│  (MapLibre GL + CARTO Vector) │     (Responsive Grid Cards) │
├───────────────────────────────┴─────────────────────────────┤
│                 Conflict Engine & State Core                │
│   • Temporal Collision Detection (Interval Math)           │
│   • LocalStorage RSVP Persistence                           │
│   • Category & Free Food Filtering                          │
├───────────────────────────────┬─────────────────────────────┤
│         Export Layer          │       Campus Data Layer     │
│   • Google Calendar Deep Links│   • Verified USC UPC Coords │
│   • RFC 5545 iCalendar (.ics) │   • Localist + EngageSC Data│
└───────────────────────────────┴─────────────────────────────┘
```

---

## ⚡ 2. Core Frontend Framework

| Technology | Version | Purpose & Rationale |
|---|---|---|
| **Node.js** | `v22.22.0` | Modern LTS JavaScript runtime environment. |
| **Vite** | `^6.0.7` | Next-generation build tool featuring instant Hot Module Replacement (HMR) via native ES modules and optimized production rollups. |
| **React** | `^18.3.1` | Declarative UI layer utilizing hooks (`useState`, `useMemo`, `useEffect`, `useRef`) for reactive filter pipelines and state coordination. |
| **React DOM** | `^18.3.1` | High-efficiency virtual DOM renderer. |

---

## 🎨 3. Styling & Design Token System

The interface adheres to an intentional, high-contrast dark aesthetic with authentic collegiate accents:

- **Tailwind CSS (`^3.4.17`) & PostCSS (`^8.4.49`)**:
  - Utility-first responsive engine enforcing strict token consistency across components.
- **Three-Tier Background Depth**:
  - **Base Canvas**: `bg-zinc-950` (`#09090b`)
  - **Cards & Surfaces**: `bg-zinc-900` (`#18181b`) with `border-zinc-800` (`#27272a`)
  - **Interactive States**: `hover:bg-zinc-800` (`#27272a`)
- **USC Brand Color Tokens**:
  - **USC Cardinal**: `#990000` (used for primary RSVP CTAs, live badge fills, and calendar accents)
  - **USC Gold**: `#FFCC00` (used for live indicator rings, active category pills, and Tommy Trojan pins)
- **Strict Geometric Constraints**:
  - All cards: `rounded-2xl`
  - All buttons: `rounded-lg`
  - All text inputs: `rounded-md`
  - Container constraint: `max-w-5xl mx-auto`
  - Layout grid: `gap-6`
- **Typographic Hierarchy**:
  - Page Titles: `text-4xl font-bold tracking-tight text-zinc-100`
  - Section Headers: `text-xl font-semibold text-zinc-100`
  - Body Text: `text-sm font-normal text-zinc-400`
  - Metadata / Badges: `text-xs uppercase tracking-wider font-medium text-zinc-500`

---

## 🗺️ 4. Geospatial & Mapping Engine

| Component | Provider / Tool | Implementation Details |
|---|---|---|
| **Map Engine** | **MapLibre GL JS** (`^5.2.0`) | Open-source, WebGL/WebGPU-accelerated vector rendering engine. Forked from Mapbox GL without proprietary telemetry or mandatory accounts. |
| **Basemap Service** | **CARTO Basemaps** | Vector Dark Matter style fetched securely via Basemaps API key: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=...`. Provides zero-watermark, razor-sharp building lines and street labels. |
| **Projection & Orientation** | USC UPC Anchor | Center: `[-118.2851, 34.0224]`, Zoom: `15.4`, Pitch: `35°` (dynamic 3D perspective), Bearing: `-10°` aligned to the University Park Campus street grid. |
| **Marker System** | Custom DOM Markers | Dynamic HTML markers rendered on the canvas: pulsing animated badges for live events (`live-pulse`), conflict warning flags (`!`), and building acronym tags (`TCC`, `LVL`, `JFF`). |
| **Multi-Pin Disambiguation** | Geospatial Jitter Algorithm | Offset algorithm (`offsetLng = coords[0] + (count % 3 - 1) * 0.00035`) preventing marker stacking when multiple simultaneous events share the same building. |

---

## 📅 5. Scheduling & Calendar Conflict Engine

### Conflict Detection Algorithm
Located in [`src/utils/calendar.js`](file:///Users/kunjeshgupta/Documents/projects/aroundSC/src/utils/calendar.js):
- Compares event intervals against the student's enrolled courses ([`src/data/mockSchedule.js`](file:///Users/kunjeshgupta/Documents/projects/aroundSC/src/data/mockSchedule.js)).
- Evaluates Day-of-Week containment (`block.days.includes(eventDay)`).
- Converts 24-hour timestamps to minutes from midnight (`hours * 60 + minutes`).
- Checks standard overlapping interval condition:
  $$\text{Overlap} \iff (\text{Start}_{\text{event}} < \text{End}_{\text{class}}) \land (\text{End}_{\text{event}} > \text{Start}_{\text{class}})$$
- Returns `{ hasConflict: boolean, conflictingClass: object | null }`.

### External Calendar Integrations
1. **Google Calendar Template URL**:
   Generates a one-click deep link to Google Calendar's web event creation flow:
   `https://calendar.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start}/{end}&details={details}&location={location}`
2. **RFC 5545 iCalendar (`.ics`)**:
   Generates downloadable MIME `text/calendar` blobs compatible with Apple Calendar, Microsoft Outlook, and mobile calendar apps.

---

## 📊 6. Data Sources & Schema

### Data Ingestion Strategy
- **USC Localist Public REST API (`calendar.usc.edu/api/2/events`)**:
  Supplies university-wide lectures, academic forums, and arts performances with exact GPS coordinates and venue names.
- **EngageSC iCal (`engage.usc.edu/ical/usc/ical_usc.ics`)**:
  Supplies student organization club meetings, social activities, and student government events.
- **Dynamic Relative Timestamp Engine**:
  Computes dates relative to the current execution time (`new Date()`), guaranteeing that "Happening Now" events are perpetually active during live presentations.

### Canonical Event Schema
```typescript
interface CampusEvent {
  id: string;                      // Unique identifier (e.g. 'evt-01')
  title: string;                   // Event display title
  organizer: string;               // Host club or academic department
  category: 'Academic' | 'Social' | 'Career' | 'Athletics' | 'Arts' | 'Workshop';
  location: {
    code: string;                  // Building code (e.g. 'TCC', 'LVL', 'JFF')
    name: string;                  // Full building title
    area: string;                  // Campus neighborhood
    coordinates: [number, number]; // [Longitude, Latitude]
  };
  room: string;                    // Room designation (e.g. 'Fertitta Hall 202')
  startTime: string;               // ISO 8601 string
  endTime: string;                 // ISO 8601 string
  freeFood: boolean;               // Free food indicator flag
  foodDescription?: string;        // Details of refreshments provided
  description: string;             // Detailed event summary
  tags: string[];                  // Discovery tags
  attendeesCount: number;          // Social proof counter
  externalUrl: string;             // Source link
  featured?: boolean;              // Highlight status
}
```

---

## 📁 7. Repository Structure

```
aroundSC/
├── CLAUDE.md                     # Agent skill routing instructions
├── GLOSSARY.md                   # Canonical domain terminology definitions
├── README.md                     # Pitch overview & demo walkthrough script
├── TECH_STACK.md                 # This file
├── index.html                    # Root HTML with font links and MapLibre styles
├── package.json                  # Dependency manifests & NPM scripts
├── postcss.config.js             # PostCSS Tailwind integration
├── tailwind.config.js            # Custom design tokens & USC color extensions
├── vite.config.js                # Vite development and bundle configuration
├── docs/
│   ├── adr/
│   │   └── 0001-map-engine-and-data-strategy.md   # Architectural Decision Record
│   └── agents/
│       ├── domain.md             # Domain documentation consumer guidelines
│       ├── issue-tracker.md      # Local markdown issue conventions
│       └── triage-labels.md      # Triage role mapping
└── src/
    ├── main.jsx                  # React DOM root mounting
    ├── index.css                 # Tailwind directives, pulse animations & dark popups
    ├── App.jsx                   # Central state orchestrator and modal coordination
    ├── components/
    │   ├── Header.jsx            # Branding, live status pill, view mode switch
    │   ├── FiltersBar.jsx        # Search, time filters, categories, free food toggle
    │   ├── MapView.jsx           # MapLibre GL radar with CARTO vector style
    │   ├── ListView.jsx          # 2-column card grid directory
    │   ├── EventCard.jsx         # Card component with conflict badge & RSVP
    │   ├── EventDetailModal.jsx  # Full event inspection modal
    │   ├── ConflictModal.jsx     # Schedule collision warning modal
    │   └── ScheduleModal.jsx     # Student course schedule inspector
    ├── data/
    │   ├── campusLocations.js    # Verified GPS coordinates for USC UPC landmarks
    │   ├── mockSchedule.js       # Hardcoded student course timetable blocks
    │   └── eventsData.js         # 32+ rich, dynamically anchored USC events
    └── utils/
        └── calendar.js           # Conflict detection, GCal linking, and .ics generation
```

---

## 🔮 8. Production Scalability Roadmap

For post-competition production scaling:
1. **Live Backend Pipeline**: A lightweight Node.js/Go background worker that polls `calendar.usc.edu/api/2/events` and extracts approved RSS/ICS feeds hourly.
2. **USC Shibboleth / CAS SSO**: Authenticating students with USC NetID to automatically import their Web Registration schedule into the conflict engine.
3. **Spatial Database**: PostgreSQL + PostGIS database supporting geospatial bounding-box queries (`ST_DWithin`) for "Events Near Me".
4. **Push Notifications**: Web Push notifications triggering when a bookmarked club starts an event within 200 meters of the student's current GPS location.
