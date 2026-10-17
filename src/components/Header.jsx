import React from 'react';
import { Map, List, Calendar, Sparkles } from 'lucide-react';

export const Header = ({
  viewMode,
  setViewMode,
  liveCount,
  onOpenSchedule,
  rsvpCount
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Branding */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
              University of Southern California
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-usc-cardinal/20 text-usc-gold border border-usc-gold/30">
              Prototype
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
              around<span className="text-usc-gold">SC</span>
            </h1>
            {liveCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-usc-gold border border-usc-gold/40">
                <span className="w-2 h-2 rounded-full bg-usc-gold animate-pulse"></span>
                {liveCount} Live on Campus
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: View Switcher & My Schedule */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Segmented Map / List switcher */}
          <div className="inline-flex p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <Map className="w-4 h-4 text-usc-gold" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <List className="w-4 h-4 text-usc-gold" />
              <span>List View</span>
            </button>
          </div>

          {/* Student Schedule & RSVPs Button */}
          <button
            onClick={onOpenSchedule}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-medium text-zinc-100 transition-colors"
            title="View mock class schedule and conflict rules"
          >
            <Calendar className="w-4 h-4 text-usc-cardinal" />
            <span className="hidden sm:inline">My Schedule</span>
            {rsvpCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-usc-cardinal text-zinc-100">
                {rsvpCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
