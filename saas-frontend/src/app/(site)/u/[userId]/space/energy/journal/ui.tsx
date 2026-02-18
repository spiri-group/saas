'use client';

import { useState, useMemo } from 'react';
import { Activity, Plus, Clock, Zap, Flame, ChevronRight, Calendar, Sun, Sparkles, Heart, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { useEnergyJournalEntries, EnergyJournalEntry } from '../hooks';
import { EnergyJournalForm } from './components/EnergyJournalForm';
import { EnergyJournalHistory } from './components/EnergyJournalHistory';

interface Props {
  userId: string;
}

const MODALITY_LABELS: Record<string, string> = {
  reiki: 'Reiki',
  pranic_healing: 'Pranic Healing',
  quantum_touch: 'Quantum Touch',
  theta_healing: 'Theta Healing',
  healing_touch: 'Healing Touch',
  chakra_balancing: 'Chakra Balancing',
  aura_cleansing: 'Aura Cleansing',
  crystal_healing: 'Crystal Healing',
  sound_healing: 'Sound Healing',
  breathwork: 'Breathwork',
  grounding: 'Grounding',
  shielding: 'Shielding',
  cord_cutting: 'Cord Cutting',
  self_healing: 'Self Healing',
};

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EnergyJournalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<EnergyJournalEntry | null>(null);

  const { data: entries, isLoading } = useEnergyJournalEntries(userId);

  const handleEdit = (entry: EnergyJournalEntry) => {
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

    // Find most common modality
    const modalityCounts: Record<string, number> = {};
    entries.forEach(e => {
      if (e.modality) {
        modalityCounts[e.modality] = (modalityCounts[e.modality] || 0) + 1;
      }
    });
    const topModality = Object.entries(modalityCounts).sort((a, b) => b[1] - a[1])[0];

    // Calculate total minutes
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

    // Calculate average energy level
    const withEnergy = entries.filter(e => e.energyLevel);
    const avgEnergy = withEnergy.length
      ? (withEnergy.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / withEnergy.length).toFixed(1)
      : null;

    return {
      thisWeekCount: thisWeek.length,
      totalEntries: entries.length,
      totalMinutes,
      avgEnergy,
      topModality: topModality ? { name: topModality[0], count: topModality[1] } : null,
      sessionsGiven: entries.filter(e => e.role === 'practitioner').length,
      sessionsReceived: entries.filter(e => e.role === 'recipient').length,
    };
  }, [entries]);

  // Most recent entry
  const mostRecent = entries?.[0];

  return (
    <div className="min-h-screen-minus-nav">
      {/* Warm Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-yellow-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-amber-500/20">
            <Activity className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Energy Journal</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Document your practice. Honor your growth. Trust your journey.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
              <Activity className="relative w-12 h-12 text-amber-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your journal...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-amber-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-4 mb-3">
                  <Zap className="w-8 h-8 text-amber-400/60" />
                  <Wind className="w-8 h-8 text-sky-400/40" />
                  <Heart className="w-8 h-8 text-rose-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Your Sacred Practice Space</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Every healing session, every meditation, every moment of energy work matters.
              Begin documenting your journey and watch your practice deepen.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-105"
              data-testid="new-energy-entry-button"
            >
              <Activity className="w-5 h-5 mr-2" />
              Log Your First Session
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && entries && entries.length > 0 && (
          <>
            {/* Insight Banner */}
            {insights && insights.thisWeekCount >= 3 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Consistent Practice</h3>
                    <p className="text-slate-300 text-sm">
                      {insights.thisWeekCount} sessions this week! Your dedication to energy work is building a strong foundation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action + Last Entry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Log New */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-2xl border border-amber-500/30 hover:border-amber-500/50 transition-all hover:scale-[1.02] text-left"
                data-testid="new-energy-entry-button"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-500/30 rounded-lg group-hover:bg-amber-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-amber-300" />
                  </div>
                  <span className="text-white font-medium">Log Session</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Record your energy work while the experience is fresh
                </p>
              </button>

              {/* Last Entry Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedEntry(mostRecent)}
                  className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(mostRecent.date), { addSuffix: true })}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {mostRecent.modality && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs">
                        {MODALITY_LABELS[mostRecent.modality] || mostRecent.modality}
                      </span>
                    )}
                    {mostRecent.energyLevel && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {mostRecent.energyLevel}/10
                      </span>
                    )}
                  </div>
                  {(mostRecent.intention || mostRecent.insights) && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {mostRecent.intention || mostRecent.insights}
                    </p>
                  )}
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="w-4 h-4 text-amber-400" />
                <span><strong className="text-white">{insights?.totalEntries}</strong> total sessions</span>
              </div>
              {insights?.totalMinutes !== undefined && insights.totalMinutes > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span><strong className="text-white">{insights.totalMinutes}</strong> minutes of practice</span>
                </div>
              )}
              {insights?.avgEnergy && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <span><strong className="text-white">{insights.avgEnergy}</strong> avg energy level</span>
                </div>
              )}
              {insights?.topModality && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span><strong className="text-white">{MODALITY_LABELS[insights.topModality.name] || insights.topModality.name}</strong> most practiced</span>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Your Sessions</h2>
              </div>
              <div className="p-4">
                <EnergyJournalHistory
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
        <DialogContent className="border-amber-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              {editingEntry ? 'Edit Session' : 'Log Your Practice'}
            </DialogTitle>
          </DialogHeader>

          <EnergyJournalForm
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
        <DialogContent className="border-amber-500/20 sm:max-w-lg">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedEntry.date), 'MMMM d, yyyy')}
                </div>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  {selectedEntry.title || MODALITY_LABELS[selectedEntry.modality || ''] || 'Energy Session'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Stats Row */}
                <div className="flex items-center gap-4 text-sm">
                  {selectedEntry.duration && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-4 h-4" />
                      {selectedEntry.duration} min
                    </div>
                  )}
                  {selectedEntry.energyLevel && (
                    <div className="flex items-center gap-1 text-green-400">
                      <Zap className="w-4 h-4" />
                      {selectedEntry.energyLevel}/10 energy
                    </div>
                  )}
                </div>

                {/* Intention */}
                {selectedEntry.intention && (
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <div className="text-sm text-amber-400 mb-1">Intention</div>
                    <p className="text-slate-300 text-sm">{selectedEntry.intention}</p>
                  </div>
                )}

                {/* Insights */}
                {selectedEntry.insights && (
                  <Panel dark className="p-4 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">Insights</div>
                    <p className="text-slate-300 text-sm">{selectedEntry.insights}</p>
                  </Panel>
                )}

                {/* Notes */}
                {selectedEntry.notes && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Notes</div>
                    <p className="text-slate-400 text-sm">{selectedEntry.notes}</p>
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
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedEntry(null)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
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
