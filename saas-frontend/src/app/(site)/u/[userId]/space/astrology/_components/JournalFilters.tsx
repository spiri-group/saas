'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  JOURNAL_MOODS,
  AstrologyJournalFilters,
} from '../_hooks/useAstrologyJournal';
import { ZODIAC_SIGNS, CELESTIAL_BODIES } from '../_hooks/useBirthChart';
import { MOON_PHASES } from '../_hooks/useTransits';

interface Props {
  filters: AstrologyJournalFilters;
  onFiltersChange: (filters: AstrologyJournalFilters) => void;
}

export const JournalFilters: React.FC<Props> = ({ filters, onFiltersChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = Boolean(
    filters.mood ||
    filters.moonSign ||
    filters.moonPhase ||
    filters.duringRetrograde ||
    (filters.planetaryThemes && filters.planetaryThemes.length > 0)
  );

  const activeFilterCount = [
    filters.mood,
    filters.moonSign,
    filters.moonPhase,
    filters.duringRetrograde,
    filters.planetaryThemes?.length,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const updateFilter = (key: keyof AstrologyJournalFilters, value: unknown) => {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  // Planets available for retrograde filter
  const retrogradePlanets = CELESTIAL_BODIES.filter(
    b => !['sun', 'moon', 'ascendant', 'midheaven', 'northnode'].includes(b.key)
  );

  return (
    <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/50 rounded-xl">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
        data-testid="toggle-filters-btn"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-white font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4">
          {/* Mood filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Mood</label>
            <div className="flex flex-wrap gap-2">
              {JOURNAL_MOODS.map(mood => (
                <button
                  key={mood.key}
                  onClick={() => updateFilter('mood', filters.mood === mood.key ? undefined : mood.key)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    filters.mood === mood.key
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  data-testid={`filter-mood-${mood.key}`}
                >
                  {mood.emoji} {mood.name}
                </button>
              ))}
            </div>
          </div>

          {/* Moon Phase filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Moon Phase</label>
            <div className="flex flex-wrap gap-2">
              {MOON_PHASES.map(phase => (
                <button
                  key={phase.key}
                  onClick={() => updateFilter('moonPhase', filters.moonPhase === phase.key ? undefined : phase.key)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    filters.moonPhase === phase.key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  data-testid={`filter-moon-phase-${phase.key}`}
                >
                  {phase.symbol} {phase.name}
                </button>
              ))}
            </div>
          </div>

          {/* Moon Sign filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Moon Sign</label>
            <div className="flex flex-wrap gap-2">
              {ZODIAC_SIGNS.map(sign => (
                <button
                  key={sign.key}
                  onClick={() => updateFilter('moonSign', filters.moonSign === sign.key ? undefined : sign.key)}
                  className={`px-2 py-1 rounded-lg text-xs transition-all ${
                    filters.moonSign === sign.key
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={sign.name}
                  data-testid={`filter-moon-sign-${sign.key}`}
                >
                  {sign.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* During Retrograde filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">During Retrograde</label>
            <div className="flex flex-wrap gap-2">
              {retrogradePlanets.map(planet => (
                <button
                  key={planet.key}
                  onClick={() => updateFilter('duringRetrograde', filters.duringRetrograde === planet.key ? undefined : planet.key)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    filters.duringRetrograde === planet.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  data-testid={`filter-retrograde-${planet.key}`}
                >
                  {planet.symbol} {planet.name}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-slate-700/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-400 hover:text-white"
                data-testid="clear-filters-btn"
              >
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JournalFilters;
