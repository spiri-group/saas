'use client';

import { BarChart3, Moon, Smile, Star } from 'lucide-react';
import { AstrologyJournalStats, getMoodInfo } from '../_hooks/useAstrologyJournal';
import { getBodyInfo } from '../_hooks/useBirthChart';
import { MoonPhase, getMoonPhaseInfo } from '../_hooks/useTransits';
import { Panel } from '@/components/ui/panel';

interface Props {
  stats: AstrologyJournalStats;
}

export const JournalStats: React.FC<Props> = ({ stats }) => {
  // Get top moon phases
  const topMoonPhases = Object.entries(stats.entriesByMoonPhase as Record<string, number>)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Get top moods
  const topMoods = Object.entries(stats.entriesByMood as Record<string, number>)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/50 to-purple-900/20 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">Journal Insights</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entries */}
        <Panel dark className="p-3 rounded-lg">
          <div className="text-2xl font-bold text-white">{stats.totalEntries}</div>
          <div className="text-xs text-slate-400">Total entries</div>
        </Panel>

        {/* Top Moon Phases */}
        <Panel dark className="p-3 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Moon className="w-3 h-3 text-indigo-400" />
            <span className="text-xs text-slate-400">Top moon phases</span>
          </div>
          {topMoonPhases.length > 0 ? (
            <div className="space-y-1">
              {topMoonPhases.map(([phase, count]) => {
                const info = getMoonPhaseInfo(phase as MoonPhase);
                return (
                  <div key={phase} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {info?.symbol} {info?.name}
                    </span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No data yet</div>
          )}
        </Panel>

        {/* Top Moods */}
        <Panel dark className="p-3 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Smile className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-slate-400">Common moods</span>
          </div>
          {topMoods.length > 0 ? (
            <div className="space-y-1">
              {topMoods.map(([mood, count]) => {
                const info = getMoodInfo(mood as any);
                return (
                  <div key={mood} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {info?.emoji} {info?.name}
                    </span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No data yet</div>
          )}
        </Panel>

        {/* Most Tagged Planets */}
        <Panel dark className="p-3 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-slate-400">Top planetary themes</span>
          </div>
          {stats.mostTaggedPlanets.length > 0 ? (
            <div className="space-y-1">
              {stats.mostTaggedPlanets.slice(0, 3).map(({ planet, count }) => {
                const info = getBodyInfo(planet);
                return (
                  <div key={planet} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {info?.symbol} {info?.name}
                    </span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No data yet</div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default JournalStats;
