'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Plus, Clock, Link2, Eye, ChevronRight, Moon, Stars } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import useSynchronicities, { Synchronicity } from '../hooks/useSynchronicities';
import { SynchronicityForm } from './components/SynchronicityForm';
import { SynchronicityHistory } from './components/SynchronicityHistory';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Synchronicity | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Synchronicity | null>(null);

  const { data: entries, isLoading } = useSynchronicities(userId);

  const handleEdit = (entry: Synchronicity) => {
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

  // Find patterns and insights
  const insights = useMemo(() => {
    if (!entries || entries.length < 2) return null;

    const recentThemes = entries.filter(e => e.recurringTheme).slice(0, 3);
    const symbolCounts: Record<string, number> = {};
    entries.forEach(e => {
      e.symbols?.forEach(s => {
        symbolCounts[s.name] = (symbolCounts[s.name] || 0) + 1;
      });
    });
    const topSymbols = Object.entries(symbolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = entries.filter(e => new Date(e.date) >= weekAgo).length;

    return {
      recentThemes,
      topSymbols,
      recentCount,
      totalCount: entries.length,
    };
  }, [entries]);

  // Get the most recent entry for the "last seen" card
  const mostRecent = entries?.[0];

  return (
    <div className="min-h-screen-minus-nav">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header - More Mystical */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-purple-500/20">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Synchronicity Log</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            The universe speaks in patterns. Notice. Record. Understand.
          </p>
        </div>

        {/* Empty State - Inviting */}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-purple-500/20 backdrop-blur-xl">
                <Stars className="w-16 h-16 text-purple-400/60 mx-auto mb-4" />
                <Moon className="w-8 h-8 text-indigo-400/60 absolute top-4 right-4" />
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Begin Your Pattern Journal</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Have you noticed a meaningful coincidence recently? A repeated number, an unexpected encounter,
              a message that felt like it was meant for you?
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Log Your First Synchronicity
            </Button>
          </div>
        )}

        {/* Active State - With Entries */}
        {!isLoading && entries && entries.length > 0 && (
          <>
            {/* Insight Banner - Only shows when patterns emerge */}
            {insights && insights.topSymbols.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Pattern Emerging</h3>
                    <p className="text-slate-400 text-sm">
                      {insights.topSymbols[0][1] > 2
                        ? `"${insights.topSymbols[0][0]}" has appeared ${insights.topSymbols[0][1]} times in your synchronicities. What might this symbol be trying to tell you?`
                        : insights.recentCount >= 3
                          ? `You've noticed ${insights.recentCount} synchronicities this week. Your awareness is expanding.`
                          : `You've logged ${insights.totalCount} synchronicities. Patterns often reveal themselves over time.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action + Last Entry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Log New - Primary Action */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-2xl border border-purple-500/30 hover:border-purple-500/50 transition-all hover:scale-[1.02] text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/30 rounded-lg group-hover:bg-purple-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-purple-300" />
                  </div>
                  <span className="text-white font-medium">Log Synchronicity</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Noticed something meaningful? Capture it before it fades.
                </p>
              </button>

              {/* Last Entry Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedEntry(mostRecent)}
                  className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(mostRecent.date), { addSuffix: true })}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <h4 className="text-white font-medium mb-2 line-clamp-1">{mostRecent.title}</h4>
                  <p className="text-slate-400 text-sm line-clamp-2">{mostRecent.description}</p>
                  {mostRecent.symbols && mostRecent.symbols.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {mostRecent.symbols.slice(0, 3).map((s, i) => (
                        <Badge key={i} variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* Stats Row - Subtle */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span><strong className="text-white">{entries.length}</strong> synchronicities logged</span>
              </div>
              {insights && insights.recentCount > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span><strong className="text-white">{insights.recentCount}</strong> this week</span>
                </div>
              )}
              {entries.filter(e => e.recurringTheme).length > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Link2 className="w-4 h-4 text-violet-400" />
                  <span><strong className="text-white">{entries.filter(e => e.recurringTheme).length}</strong> recurring themes</span>
                </div>
              )}
            </div>

            {/* Timeline View */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Your Synchronicities</h2>
              </div>
              <SynchronicityHistory
                entries={entries}
                onEdit={handleEdit}
                onView={setSelectedEntry}
                isLoading={isLoading}
                userId={userId}
              />
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
              <Sparkles className="relative w-12 h-12 text-purple-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your synchronicities...</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="border-purple-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {editingEntry ? 'Edit Synchronicity' : 'What Did You Notice?'}
            </DialogTitle>
          </DialogHeader>

          <SynchronicityForm
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
        <DialogContent className="border-purple-500/20 sm:max-w-lg">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  {format(new Date(selectedEntry.date), 'MMMM d, yyyy')}
                  {selectedEntry.time && ` at ${selectedEntry.time}`}
                </div>
                <DialogTitle className="text-xl">{selectedEntry.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <p className="text-slate-300 leading-relaxed">{selectedEntry.description}</p>

                {selectedEntry.location && (
                  <div className="text-sm text-slate-400">
                    <span className="text-slate-500">Location:</span> {selectedEntry.location}
                  </div>
                )}

                {selectedEntry.symbols && selectedEntry.symbols.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-500 mb-2">Symbols</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.symbols.map((s, i) => (
                        <Badge key={i} variant="secondary" className="bg-purple-500/20 text-purple-300">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntry.possibleMeaning && (
                  <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                    <div className="text-sm text-purple-400 mb-1">Your Interpretation</div>
                    <p className="text-slate-300 text-sm">{selectedEntry.possibleMeaning}</p>
                  </div>
                )}

                {selectedEntry.confirmedMeaning && (
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="text-sm text-green-400 mb-1">Confirmed Meaning</div>
                    <p className="text-slate-300 text-sm">{selectedEntry.confirmedMeaning}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedEntry(null);
                      handleEdit(selectedEntry);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit Entry
                  </Button>
                  <Button
                    onClick={() => setSelectedEntry(null)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
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
