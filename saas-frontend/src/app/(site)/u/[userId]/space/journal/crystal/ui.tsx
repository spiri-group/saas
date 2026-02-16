'use client';

import { useState, useMemo } from 'react';
import { Gem, History, Loader2, Plus, Flame, BookOpen, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CompanionCard,
  CompanionForm,
} from '../../crystals/components';
import { CrystalCompanionLog } from '../../crystals/types';
import {
  useCrystalCollection,
  useTodaysCompanion,
  useCrystalCompanionLogs,
} from '../../crystals/hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CrystalCompanionLog | null>(null);

  const { data: crystals = [] } = useCrystalCollection(userId);
  const { data: todaysEntry, isLoading: loadingToday } = useTodaysCompanion(userId);
  const { data: journalEntries = [], isLoading: loadingHistory } = useCrystalCompanionLogs(userId, { limit: 30 });

  const handleNewEntry = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEditEntry = (entry: CrystalCompanionLog) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  // Get recent history (excluding today)
  const recentHistory = journalEntries.filter(entry => entry.id !== todaysEntry?.id).slice(0, 14);

  // Calculate insights
  const insights = useMemo(() => {
    const totalEntries = journalEntries.length;

    // This week's entries
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekEntries = journalEntries.filter(e => new Date(e.date) >= weekAgo).length;

    // Most journaled crystal
    const crystalCounts: Record<string, number> = {};
    journalEntries.forEach(entry => {
      if (entry.crystalName) {
        crystalCounts[entry.crystalName] = (crystalCounts[entry.crystalName] || 0) + 1;
      }
    });
    const topCrystal = Object.entries(crystalCounts).sort((a, b) => b[1] - a[1])[0];

    // Entries with intentions
    const entriesWithIntentions = journalEntries.filter(e => e.intention).length;

    // Unique crystals journaled
    const uniqueCrystals = new Set(journalEntries.map(e => e.crystalName)).size;

    // Milestones
    const milestones = [
      { count: 100, message: 'A hundred journal entries — a dedicated crystal chronicler!' },
      { count: 50, message: 'Fifty entries — your crystal story unfolds beautifully!' },
      { count: 25, message: 'Twenty-five entries in your crystal journey!' },
      { count: 10, message: 'Ten journal entries — building a beautiful practice!' },
      { count: 5, message: 'Five entries — your journaling habit begins!' },
    ];
    const currentMilestone = milestones.find(m => totalEntries >= m.count);

    return {
      totalEntries,
      thisWeekEntries,
      topCrystal: topCrystal ? { name: topCrystal[0], count: topCrystal[1] } : null,
      entriesWithIntentions,
      uniqueCrystals,
      currentMilestone,
    };
  }, [journalEntries]);

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

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-violet-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-indigo-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-4xl mx-auto lg:max-w-none relative z-10">
        {/* Centered Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Crystal Journal</h1>
          <p className="text-slate-400">Chronicle your daily crystal experiences and discoveries</p>

          {insights.totalEntries > 0 && (
            <div className="mt-4">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-1.5">
                <Gem className="w-4 h-4 mr-2" />
                {insights.totalEntries} journal entr{insights.totalEntries !== 1 ? 'ies' : 'y'}
              </Badge>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={handleNewEntry}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg px-6"
              data-testid="new-entry-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Milestone Banner */}
        {insights.currentMilestone && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Flame className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-purple-300 font-medium">{insights.currentMilestone.message}</p>
                {insights.topCrystal && (
                  <p className="text-purple-200/70 text-sm">
                    Most journaled: {insights.topCrystal.name} ({insights.topCrystal.count} entries)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* This Week's Activity */}
        {insights.thisWeekEntries > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-300 font-medium">
                  {insights.thisWeekEntries} journal entr{insights.thisWeekEntries !== 1 ? 'ies' : 'y'} this week!
                </p>
                <p className="text-emerald-200/70 text-sm">Your crystal story is unfolding beautifully</p>
              </div>
            </div>
          </div>
        )}

        {/* Favorite Crystal Insight */}
        {insights.topCrystal && insights.topCrystal.count >= 3 && !insights.currentMilestone && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Heart className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-pink-300 font-medium">
                  {insights.topCrystal.name} appears most in your journal
                </p>
                <p className="text-pink-200/70 text-sm">
                  {insights.topCrystal.count} entries featuring this crystal companion
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Crystal Card */}
        <div className="mb-8">
          <CompanionCard
            companion={todaysEntry || null}
            isLoading={loadingToday}
            onSetCompanion={handleNewEntry}
            onEditCompanion={handleEditEntry}
          />
        </div>

        {/* Quick Stats */}
        {insights.totalEntries > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{insights.totalEntries}</div>
              <div className="text-slate-400 text-sm">Total Entries</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{insights.thisWeekEntries}</div>
              <div className="text-slate-400 text-sm">This Week</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{insights.uniqueCrystals}</div>
              <div className="text-slate-400 text-sm">Crystals Featured</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{insights.entriesWithIntentions}</div>
              <div className="text-slate-400 text-sm">With Intentions</div>
            </div>
          </div>
        )}

        {/* Journal History */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Recent Entries</h2>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
              <p className="text-slate-400 text-sm">Loading journal...</p>
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="w-12 h-12 text-purple-400/30 mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Begin Your Crystal Chronicle</h3>
              <p className="text-slate-400 text-sm max-w-sm mb-4">
                Document your daily experiences with crystals. Note which stones you work with, set intentions, and reflect on their energy.
              </p>
              <Button
                onClick={handleNewEntry}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Write Your First Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => handleEditEntry(entry)}
                >
                  <div className="w-20 text-center flex-shrink-0">
                    <p className="text-slate-500 text-xs">{formatDate(entry.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{entry.crystalName}</p>
                    {entry.location && (
                      <p className="text-slate-400 text-xs">{entry.location}</p>
                    )}
                  </div>
                  {entry.intention && (
                    <p className="text-slate-500 text-sm italic truncate max-w-xs hidden sm:block">
                      &quot;{entry.intention}&quot;
                    </p>
                  )}
                  {entry.effectivenessScore && (
                    <div className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs flex-shrink-0">
                      <Star className="w-3 h-3 inline mr-1" />
                      {entry.effectivenessScore}/10
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-400" />
              {editingEntry ? 'Edit Journal Entry' : 'New Crystal Journal Entry'}
            </DialogTitle>
          </DialogHeader>

          <CompanionForm
            userId={userId}
            crystals={crystals}
            existingLog={editingEntry}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
