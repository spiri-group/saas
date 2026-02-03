'use client';

import { useState, useMemo } from 'react';
import { Sparkles, History, Loader2, Flame, Heart, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CompanionCard,
  CompanionForm,
} from '../components';
import { CrystalCompanionLog } from '../types';
import {
  useCrystalCollection,
  useTodaysCompanion,
  useCrystalCompanionLogs,
} from '../hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<CrystalCompanionLog | null>(null);

  const { data: crystals = [] } = useCrystalCollection(userId);
  const { data: todaysCompanion, isLoading: loadingToday } = useTodaysCompanion(userId);
  const { data: companionLogs = [], isLoading: loadingHistory } = useCrystalCompanionLogs(userId, { limit: 30 });

  const handleSetCompanion = () => {
    setEditingCompanion(null);
    setShowForm(true);
  };

  const handleEditCompanion = (companion: CrystalCompanionLog) => {
    setEditingCompanion(companion);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCompanion(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCompanion(null);
  };

  // Get recent history (excluding today)
  const recentHistory = companionLogs.filter(log => log.id !== todaysCompanion?.id).slice(0, 14);

  // Calculate insights
  const insights = useMemo(() => {
    const totalDays = companionLogs.length;

    // Calculate streak
    let streak = 0;
    const sortedLogs = [...companionLogs].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = new Date(sortedLogs[i].date);
      logDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    // Most frequent companion
    const crystalCounts: Record<string, number> = {};
    companionLogs.forEach(log => {
      if (log.crystalName) {
        crystalCounts[log.crystalName] = (crystalCounts[log.crystalName] || 0) + 1;
      }
    });
    const topCompanion = Object.entries(crystalCounts).sort((a, b) => b[1] - a[1])[0];

    // Unique crystals used
    const uniqueCrystals = new Set(companionLogs.map(l => l.crystalName)).size;

    // Average effectiveness (if tracked)
    const scoresWithValues = companionLogs.filter(l => l.effectivenessScore);
    const avgEffectiveness = scoresWithValues.length > 0
      ? Math.round(scoresWithValues.reduce((sum, l) => sum + (l.effectivenessScore || 0), 0) / scoresWithValues.length)
      : null;

    return {
      totalDays,
      streak,
      topCompanion: topCompanion ? { name: topCompanion[0], count: topCompanion[1] } : null,
      uniqueCrystals,
      avgEffectiveness,
    };
  }, [companionLogs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const hasHistory = companionLogs.length > 0;

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-violet-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-indigo-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Compact Header Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-light text-white">Daily Companion</h1>
              <p className="text-slate-500 text-sm">Which crystal journeys with you?</p>
            </div>
          </div>
        </div>

        {/* Compact Stats Row - only show when there's history */}
        {hasHistory && (
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-white font-medium">{insights.totalDays}</span>
              <span className="text-slate-400">day{insights.totalDays !== 1 ? 's' : ''}</span>
            </div>
            {insights.streak > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg">
                <Flame className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 font-medium">{insights.streak}</span>
                <span className="text-purple-300/80">day streak</span>
              </div>
            )}
            {insights.uniqueCrystals > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <span className="text-white font-medium">{insights.uniqueCrystals}</span>
                <span className="text-slate-400">unique crystal{insights.uniqueCrystals !== 1 ? 's' : ''}</span>
              </div>
            )}
            {insights.avgEffectiveness && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-white font-medium">{insights.avgEffectiveness}/10</span>
                <span className="text-slate-400">avg</span>
              </div>
            )}
            {insights.topCompanion && insights.topCompanion.count >= 3 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 rounded-lg">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-pink-300">{insights.topCompanion.name}</span>
                <span className="text-pink-300/80">×{insights.topCompanion.count}</span>
              </div>
            )}
          </div>
        )}

        {/* Today's Companion Card */}
        <div className="mb-6">
          <CompanionCard
            companion={todaysCompanion || null}
            isLoading={loadingToday}
            onSetCompanion={handleSetCompanion}
            onEditCompanion={handleEditCompanion}
          />
        </div>

        {/* Recent History */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Recent Companions</h2>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
              <p className="text-slate-400 text-sm">Loading history...</p>
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="w-12 h-12 text-purple-400/30 mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Begin Your Daily Practice</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Choose a crystal to accompany you each day. Over time, you&apos;ll discover which stones resonate most with your energy.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => handleEditCompanion(log)}
                >
                  <div className="w-20 text-center flex-shrink-0">
                    <p className="text-slate-500 text-xs">{formatDate(log.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{log.crystalName}</p>
                    {log.location && (
                      <p className="text-slate-400 text-xs">{log.location}</p>
                    )}
                  </div>
                  {log.intention && (
                    <p className="text-slate-500 text-sm italic truncate max-w-xs hidden sm:block">
                      &quot;{log.intention}&quot;
                    </p>
                  )}
                  {log.effectivenessScore && (
                    <div className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs flex-shrink-0">
                      <Star className="w-3 h-3 inline mr-1" />
                      {log.effectivenessScore}/10
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="bg-slate-900 border-white/20 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {editingCompanion ? 'Update Companion' : 'Set Today\'s Companion'}
            </DialogTitle>
          </DialogHeader>

          <CompanionForm
            userId={userId}
            crystals={crystals}
            existingLog={editingCompanion}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
