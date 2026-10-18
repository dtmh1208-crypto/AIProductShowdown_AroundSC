import React from 'react';
import { Search, Flame, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export const CATEGORIES = ['All', 'Academic', 'Social', 'Career', 'Athletics', 'Arts', 'Workshop'];

export const FiltersBar = ({
  searchQuery,
  setSearchQuery,
  timeFilter,
  setTimeFilter,
  categoryFilter,
  setCategoryFilter,
  freeFoodOnly,
  setFreeFoodOnly,
  hideConflicts,
  setHideConflicts,
  totalMatching,
  liveCount
}) => {
  return (
    <div className="pulse-filters w-full space-y-4">
      {/* Top Search & Highlights Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input (rounded-md) */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            aria-label="Search events, organizers, food, or buildings"
            placeholder="Search USC events, clubs, or campus buildings (e.g. TCC, AI, Boba)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-usc-gold/60 focus:ring-1 focus:ring-usc-gold/40 transition-colors"
          />
        </div>

        {/* Special Feature Toggles (rounded-lg buttons) */}
        <div className="flex items-center gap-2">
          {/* Free Food Toggle */}
          <button
            aria-pressed={freeFoodOnly}
            onClick={() => setFreeFoodOnly(!freeFoodOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              freeFoodOnly
                ? 'bg-usc-gold/15 border-usc-gold/50 text-usc-gold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <span>🍕</span>
            <span className="text-xs uppercase tracking-wider font-semibold">Free Food</span>
          </button>

          {/* Conflict Filter Toggle */}
          <button
            aria-pressed={hideConflicts}
            onClick={() => setHideConflicts(!hideConflicts)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              hideConflicts
                ? 'bg-usc-gold/15 border-usc-gold/50 text-usc-gold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
            title="Hide events that overlap imported commitments or the enabled mock schedule"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">No Conflicts</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Time Range & Categories */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
        {/* Time Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'live', label: `Happening Now (${liveCount})`, icon: Flame, special: true },
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'rsvp', label: 'My RSVPs', icon: CheckCircle2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = timeFilter === tab.id;
            return (
              <button
                key={tab.id}
                aria-pressed={isActive}
                onClick={() => setTimeFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? tab.special
                      ? 'bg-usc-cardinal text-zinc-100 border border-usc-cardinal-light shadow-sm'
                      : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${tab.special && isActive ? 'text-usc-gold' : ''}`} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
          <span className="text-xs uppercase tracking-wider font-medium text-zinc-500 mr-1 hidden lg:inline">
            Category:
          </span>
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-usc-gold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Meta Counter */}
      <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
        <span>Showing <strong className="text-zinc-100 font-semibold">{totalMatching}</strong> campus events</span>
        {hideConflicts && (
          <span className="text-usc-gold flex items-center gap-1">
            ✓ Filtered out schedule overlaps
          </span>
        )}
      </div>
    </div>
  );
};
