'use client';

import { MessageCircle, Sparkles, Moon, Flame, Calendar, BookOpen } from 'lucide-react';
import type { MediumshipStats } from '../mediumship/hooks/useMediumshipStats';

interface Props {
  stats?: MediumshipStats;
  isLoading: boolean;
}

const ActivitySummary: React.FC<Props> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">Your Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-24 mb-3" />
              <div className="h-8 bg-white/10 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasActivity = stats && (
    stats.totalSpiritMessages > 0 ||
    stats.totalSynchronicities > 0 ||
    stats.daysActive > 0
  );

  if (!hasActivity) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">Your Activity</h2>
        <div data-testid="activity-empty-state" className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-center">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Begin Your Journey</p>
          <p className="text-sm text-slate-400">
            Start logging your spiritual experiences to see your activity summary here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-400">Your Activity</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* This Month Card */}
        <div data-testid="activity-this-month-card" className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">This Month</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300">Messages</span>
              </div>
              <span className="text-white font-medium">{stats.messagesThisMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Synchronicities</span>
              </div>
              <span className="text-white font-medium">{stats.synchronicitiesThisMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-slate-300">Exercises</span>
              </div>
              <span className="text-white font-medium">{stats.exercisesThisMonth}</span>
            </div>
          </div>
        </div>

        {/* Your Journey Card */}
        <div data-testid="activity-journey-card" className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-slate-400">Your Journey</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Current Streak</span>
              <span className="text-white font-medium">
                {stats.currentStreak > 0 ? (
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Days Active</span>
              <span className="text-white font-medium">{stats.daysActive}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Total Entries</span>
              <span className="text-white font-medium">
                {stats.totalSpiritMessages + stats.totalSynchronicities + stats.exerciseCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Symbols - Only show if there are symbols */}
      {stats.topSymbols && stats.topSymbols.length > 0 && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-slate-400">Top Symbols</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.topSymbols.slice(0, 5).map((symbol) => (
              <span
                key={symbol.name}
                className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm"
              >
                {symbol.name} ({symbol.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySummary;
