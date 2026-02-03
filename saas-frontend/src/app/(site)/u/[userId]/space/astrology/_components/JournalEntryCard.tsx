'use client';

import { RotateCcw, ChevronRight } from 'lucide-react';
import {
  AstrologyJournalEntry,
  getMoodInfo,
  formatRelativeDate,
} from '../_hooks/useAstrologyJournal';
import { getSignInfo, getBodyInfo } from '../_hooks/useBirthChart';
import { getMoonPhaseInfo } from '../_hooks/useTransits';

interface Props {
  entry: AstrologyJournalEntry;
  onClick: () => void;
}

export const JournalEntryCard: React.FC<Props> = ({ entry, onClick }) => {
  const moonSignInfo = getSignInfo(entry.transitSnapshot.moonSign);
  const moonPhaseInfo = getMoonPhaseInfo(entry.transitSnapshot.moonPhase);
  const moodInfo = entry.mood ? getMoodInfo(entry.mood) : null;

  // Get preview of content (first 150 chars)
  const contentPreview = entry.content.length > 150
    ? entry.content.substring(0, 150) + '...'
    : entry.content;

  return (
    <button
      onClick={onClick}
      className="w-full text-left backdrop-blur-xl bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all group"
      data-testid={`journal-entry-${entry.id}`}
    >
      {/* Header - Date and Mood */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">
          {formatRelativeDate(entry.createdAt)}
        </span>
        {moodInfo && (
          <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded-full text-slate-300 flex items-center gap-1">
            <span>{moodInfo.emoji}</span>
            <span>{moodInfo.name}</span>
          </span>
        )}
      </div>

      {/* Content Preview */}
      <p className="text-white text-sm mb-3 line-clamp-3">
        {contentPreview}
      </p>

      {/* Transit Snapshot Summary */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        {/* Moon */}
        <div className="flex items-center gap-1">
          <span>{moonPhaseInfo?.symbol}</span>
          <span>{moonSignInfo?.symbol}</span>
          <span className="hidden sm:inline">Moon in {moonSignInfo?.name}</span>
        </div>

        {/* Retrograde planets */}
        {entry.transitSnapshot.retrogradePlanets.length > 0 && (
          <div className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            <span>
              {entry.transitSnapshot.retrogradePlanets
                .slice(0, 2)
                .map(p => getBodyInfo(p)?.symbol)
                .join(' ')}
              {entry.transitSnapshot.retrogradePlanets.length > 2 && (
                <span className="ml-1">+{entry.transitSnapshot.retrogradePlanets.length - 2}</span>
              )}
            </span>
          </div>
        )}

        {/* Active transits count */}
        {entry.transitSnapshot.activeTransits.length > 0 && (
          <span>
            {entry.transitSnapshot.activeTransits.length} active transit{entry.transitSnapshot.activeTransits.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Planetary themes tags */}
      {entry.planetaryThemes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.planetaryThemes.slice(0, 4).map(planet => {
            const info = getBodyInfo(planet);
            return (
              <span
                key={planet}
                className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-300"
              >
                {info?.symbol} {info?.name}
              </span>
            );
          })}
          {entry.planetaryThemes.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-slate-500">
              +{entry.planetaryThemes.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Read more indicator */}
      <div className="flex items-center justify-end mt-2 text-slate-500 group-hover:text-slate-400 transition-colors">
        <span className="text-xs">Read more</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
};

export default JournalEntryCard;
