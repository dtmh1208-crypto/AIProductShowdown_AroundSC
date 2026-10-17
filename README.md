# aroundSC ✌️

**Live USC Campus Event Radar & Intelligent Conflict Planner**  
*Built for the USC AI Product Showdown Competition*

---

## 🌟 Overview

**aroundSC** solves the fragmented campus communication problem at USC. While official portals like EngageSC and university email lists bury events behind logins and disconnected calendars, **aroundSC** aggregates real-time student activities onto an interactive campus map. It automatically checks student class schedules for time conflicts and offers frictionless one-click RSVPs and calendar synchronization.

---

## 🛠️ Installation & Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** (comes with Node.js) or **pnpm** / **yarn**

### Quickstart

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dtmh1208-crypto/AIProductShowdown_AroundSC.git
   cd AIProductShowdown_AroundSC
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Open in your browser**:
   Navigate to:
   ```
   http://localhost:5173
   ```

### Other Helpful Commands

- **Build for production**:
  ```bash
  npm run build
  ```
  Generates an optimized static bundle in the `dist/` directory.

- **Preview the production build locally**:
  ```bash
  npm run preview
  ```

---

## 🚀 Key Features

1. **Interactive Campus Radar (MapLibre GL & CARTO)**:
   - High-contrast, dark-mode vector map centered on USC University Park Campus (UPC).
   - Real campus buildings: Ronald Tutor Campus Center (TCC), Leavey Library (LVL), Fertitta Hall (JFF), Salvatori CS Center (SAL), Galen Center, and more.
   - Live pulsating pins for events happening **right now**.
   - Powered by CARTO Basemaps Vector Dark Matter styling.

2. **Switchable Map View & List View**:
   - Single-click toggle between the geospatial campus map and a structured 2-column card directory.

3. **Intelligent Calendar Conflict Engine**:
   - Pre-loaded with mock student schedule blocks (e.g. *CSCI 104: Data Structures* MW 2–3:20 PM, *BUAD 304* TR 10–11:50 AM, *MATH 225* MWF 11–11:50 AM).
   - Automatically detects overlapping event times and displays conflict warning badges (`!`).
   - Includes a **"No Conflicts" filter** toggle to instantly hide events that clash with class.

4. **Calendar Conflict Modal & RSVP Sync**:
   - Clicking RSVP on an overlapping event triggers the **Calendar Conflict Modal**, warning the student of the exact class collision and asking for confirmation.
   - Confirmed RSVPs toggle the in-app state (`✓ RSVP'd`), add to the "My RSVPs" filter tab, and generate direct **Google Calendar** sync links and `.ics` file downloads.

5. **Student-Centric Filters**:
   - **Status**: All, Happening Now (Live ⚡), Today, Upcoming, My RSVPs.
   - **Perks**: 🍕 Free Food Only filter.
   - **Categories**: Academic, Social, Career, Athletics, Arts, Workshop.
   - **Search**: Instant text search across titles, descriptions, and campus building codes.

---

## 🎨 Design System

Adheres strictly to the restrained dark zinc design tokens:
- **Typography**: Page title (`text-4xl font-bold tracking-tight`), Section headings (`text-xl font-semibold`), Body (`text-sm font-normal text-zinc-400`), Labels (`text-xs uppercase tracking-wider font-medium text-zinc-500`).
- **Layers**: `bg-zinc-950` page, `bg-zinc-900` cards with `border-zinc-800`, `hover:bg-zinc-800` interactive states.
- **Tokens**: `rounded-2xl` for cards, `rounded-lg` for buttons, `rounded-md` for inputs.
- **Brand Colors**: Authentic **USC Cardinal** (`#990000`) and **USC Gold** (`#FFCC00`).

---

## 🎬 Suggested 2-Minute Competition Demo Walkthrough

1. **Hook ("What's happening right now?")**:
   - Open the app at `http://localhost:5173`.
   - Point out the pulsating **"LIVE NOW"** gold markers on the map (e.g., *Viterbi AI Lab Showcase* or *USG Lawn Games at Tommy Trojan*).
   - Click a marker to reveal event details, attendees, and free food perks (e.g. Boba & In-N-Out).

2. **The Conflict Problem**:
   - Switch to **List View** or search for *"CSCI"* / *"Farmer Market"*.
   - Notice the **amber/red "Conflict (CSCI 104)" badge** indicating the event clashes with Wednesday class time.
   - Click **"RSVP"**: The **Calendar Conflict Modal** appears, clearly showing the schedule collision.
   - Click **"RSVP Anyway"** to demonstrate override flexibility.

3. **The Planning Solution**:
   - Click the **"No Conflicts"** filter toggle: watch the schedule automatically purify to only events you are free to attend.
   - Toggle the **"🍕 Free Food"** filter for a crowd-pleasing demo moment.
   - Click the **Google Cal** button on an event to show external calendar interoperability.
