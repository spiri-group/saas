'use client';

import { useState, useMemo } from 'react';
import { BookHeart, Plus, Heart, CheckCircle2, Clock, ChevronRight, Flame, Calendar, User, Sparkles, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import usePrayerJournalEntries, { PrayerJournalEntry } from '../hooks/usePrayerJournal';
import { PrayerJournalForm } from './components/PrayerJournalForm';
import { PrayerJournalHistory } from './components/PrayerJournalHistory';

interface Props {
  userId: string;
}

const PRAYER_TYPE_LABELS: Record<string, string> = {
  praise: 'Praise',
  thanksgiving: 'Thanksgiving',
  petition: 'Petition',
  intercession: 'Intercession',
  confession: 'Confession',
  meditation: 'Meditation',
  contemplation: 'Contemplation',
  devotional: 'Devotional',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500/20 text-blue-600',
  waiting: 'bg-amber-500/20 text-amber-600',
  ongoing: 'bg-purple-500/20 text-purple-600',
  answered: 'bg-green-500/20 text-green-600',
  answered_differently: 'bg-teal-500/20 text-teal-600',
};

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PrayerJournalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PrayerJournalEntry | null>(null);

  const { data: entries, isLoading } = usePrayerJournalEntries(userId);

  const handleEdit = (entry: PrayerJournalEntry) => {
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

  // Calculate insights
  const insights = useMemo(() => {
    if (!entries || entries.length === 0) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = entries.filter(e => new Date(e.date) >= weekAgo);

    const answered = entries.filter(e => e.status === 'answered' || e.status === 'answered_differently');
    const active = entries.filter(e => e.status === 'active' || e.status === 'waiting' || e.status === 'ongoing');

    // Count prayer types
    const typeCounts: Record<string, number> = {};
    entries.forEach(e => {
      if (e.prayerType) {
        typeCounts[e.prayerType] = (typeCounts[e.prayerType] || 0) + 1;
      }
    });
    const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Count who they pray for
    const prayingForCounts: Record<string, number> = {};
    entries.forEach(e => {
      if (e.prayingFor) {
        prayingForCounts[e.prayingFor] = (prayingForCounts[e.prayingFor] || 0) + 1;
      }
    });
    const topPrayingFor = Object.entries(prayingForCounts).sort((a, b) => b[1] - a[1])[0];

    // Recent answered prayers (last 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recentlyAnswered = answered.filter(e => e.answeredDate && new Date(e.answeredDate) >= monthAgo);

    return {
      thisWeekCount: thisWeek.length,
      totalPrayers: entries.length,
      answeredCount: answered.length,
      activeCount: active.length,
      recentlyAnswered: recentlyAnswered.length,
      mostCommonType: mostCommonType ? { type: mostCommonType[0], count: mostCommonType[1] } : null,
      topPrayingFor: topPrayingFor ? { name: topPrayingFor[0], count: topPrayingFor[1] } : null,
    };
  }, [entries]);

  // Most recent entry
  const mostRecent = entries?.[0];

  // Recent answered for celebration
  const recentAnswered = entries?.filter(e =>
    (e.status === 'answered' || e.status === 'answered_differently') &&
    e.answeredDate
  ).slice(0, 1)[0];

  return (
    <div className="min-h-screen-minus-nav">
      {/* Warm, Reverent Atmosphere - Gold/Cream tones */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-indigo-500/20">
            <BookHeart className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Prayer Journal</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Pour out your heart. Trust His timing. Watch Him move.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
              <BookHeart className="relative w-12 h-12 text-indigo-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your prayers...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="relative p-10 bg-white/5 rounded-3xl border border-indigo-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-4 mb-3">
                  <HandHeart className="w-8 h-8 text-indigo-400/60" />
                  <Heart className="w-8 h-8 text-rose-400/40" />
                  <Sparkles className="w-8 h-8 text-amber-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">A Sacred Space for Prayer</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Bring your petitions, your praise, your gratitude.
              Record your conversations with God and watch how He answers over time.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105"
              data-testid="new-prayer-entry-button"
            >
              <BookHeart className="w-5 h-5 mr-2" />
              Begin Your Prayer Journal
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && entries && entries.length > 0 && (
          <>
            {/* Celebration Banner - Recently Answered Prayer */}
            {recentAnswered && (
              <div className="mb-8 p-5 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 rounded-2xl border border-green-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Prayer Answered</h3>
                    <p className="text-slate-300 text-sm">
                      {recentAnswered.title || 'A prayer'} was answered{recentAnswered.answeredDate ? ` on ${format(new Date(recentAnswered.answeredDate), 'MMM d')}` : ''}.
                      {recentAnswered.answerDescription && ` ${recentAnswered.answerDescription}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Consistency Banner */}
            {insights && insights.thisWeekCount >= 5 && !recentAnswered && (
              <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Faithful in Prayer</h3>
                    <p className="text-slate-300 text-sm">
                      {insights.thisWeekCount} prayers this week. Your faithfulness in coming before God is beautiful.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions + Last Entry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* New Prayer */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/50 transition-all hover:scale-[1.02] text-left"
                data-testid="new-prayer-entry-button"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-500/30 rounded-lg group-hover:bg-indigo-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-indigo-300" />
                  </div>
                  <span className="text-white font-medium">New Prayer</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Bring your heart before the Lord
                </p>
              </button>

              {/* Last Prayer Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedEntry(mostRecent)}
                  className="group p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(mostRecent.date), { addSuffix: true })}</span>
                      {mostRecent.status && (
                        <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[mostRecent.status] || ''}`}>
                          {mostRecent.status === 'answered_differently' ? 'Answered Differently' : mostRecent.status}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {mostRecent.prayerType && (
                      <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                        {PRAYER_TYPE_LABELS[mostRecent.prayerType] || mostRecent.prayerType}
                      </span>
                    )}
                    {mostRecent.prayingFor && (
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        For {mostRecent.prayingFor}
                      </span>
                    )}
                  </div>
                  {(mostRecent.title || mostRecent.content) && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {mostRecent.title || mostRecent.content}
                    </p>
                  )}
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <BookHeart className="w-4 h-4 text-indigo-400" />
                <span><strong className="text-white">{insights?.totalPrayers}</strong> prayers recorded</span>
              </div>
              {insights?.activeCount && insights.activeCount > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Heart className="w-4 h-4 text-blue-400" />
                  <span><strong className="text-white">{insights.activeCount}</strong> active</span>
                </div>
              )}
              {insights?.answeredCount && insights.answeredCount > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span><strong className="text-white">{insights.answeredCount}</strong> answered</span>
                </div>
              )}
              {insights?.topPrayingFor && insights.topPrayingFor.count >= 3 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>Often praying for <strong className="text-white">{insights.topPrayingFor.name}</strong></span>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Your Prayers</h2>
              </div>
              <div className="p-4">
                <PrayerJournalHistory
                  entries={entries}
                  onEdit={handleEdit}
                  isLoading={isLoading}
                  userId={userId}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent dark={false} glass className="border-indigo-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookHeart className="w-5 h-5 text-indigo-400" />
              {editingEntry ? 'Edit Prayer' : 'Record Your Prayer'}
            </DialogTitle>
          </DialogHeader>

          <PrayerJournalForm
            userId={userId}
            existingEntry={editingEntry}
            onSuccess={handleFormSuccess}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent dark={false} glass className="border-indigo-500/20 sm:max-w-lg">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedEntry.date), 'MMMM d, yyyy')}
                  </div>
                  {selectedEntry.status && (
                    <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[selectedEntry.status] || ''}`}>
                      {selectedEntry.status === 'answered' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {selectedEntry.status === 'answered_differently' ? 'Answered Differently' : selectedEntry.status}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="flex items-center gap-2">
                  <BookHeart className="w-5 h-5 text-indigo-400" />
                  {selectedEntry.title || PRAYER_TYPE_LABELS[selectedEntry.prayerType || ''] || 'Prayer'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Meta info */}
                <div className="flex items-center gap-4 text-sm">
                  {selectedEntry.prayerType && (
                    <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      {PRAYER_TYPE_LABELS[selectedEntry.prayerType]}
                    </Badge>
                  )}
                  {selectedEntry.prayingFor && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <User className="w-4 h-4" />
                      For {selectedEntry.prayingFor}
                    </div>
                  )}
                </div>

                {/* Prayer content */}
                {selectedEntry.content && (
                  <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <p className="text-black/70 text-sm italic leading-relaxed">{selectedEntry.content}</p>
                  </div>
                )}

                {/* Scripture reference */}
                {selectedEntry.scriptureReference && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="text-indigo-400">{selectedEntry.scriptureReference}</span>
                  </div>
                )}

                {/* Insights */}
                {selectedEntry.insights && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Insights</div>
                    <p className="text-slate-400 text-sm">{selectedEntry.insights}</p>
                  </div>
                )}

                {/* Answer description */}
                {selectedEntry.answerDescription && (
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="text-sm text-green-400 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      How God Answered
                    </div>
                    <p className="text-black/70 text-sm">{selectedEntry.answerDescription}</p>
                    {selectedEntry.answeredDate && (
                      <p className="text-green-400/60 text-xs mt-2">
                        Answered on {format(new Date(selectedEntry.answeredDate), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedEntry(null);
                      handleEdit(selectedEntry);
                    }}
                    className="flex-1 border-black/20 hover:bg-black/5"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedEntry(null)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
