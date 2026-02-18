'use client';

import { useState, useMemo } from 'react';
import { Heart, Plus, Calendar, Clock, ChevronRight, Star, User, Sparkles, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useSessionReflections, SessionReflection } from '../hooks';
import { SessionReflectionForm } from './components/SessionReflectionForm';
import { SessionReflectionHistory } from './components/SessionReflectionHistory';

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
  crystal_healing: 'Crystal Healing',
  sound_healing: 'Sound Healing',
  distance_healing: 'Distance Healing',
  massage: 'Massage',
  acupuncture: 'Acupuncture',
  other: 'Other',
};

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingReflection, setEditingReflection] = useState<SessionReflection | null>(null);
  const [selectedReflection, setSelectedReflection] = useState<SessionReflection | null>(null);

  const { data: reflections, isLoading } = useSessionReflections(userId);

  const handleEdit = (reflection: SessionReflection) => {
    setEditingReflection(reflection);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingReflection(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReflection(null);
  };

  // Calculate insights
  const insights = useMemo(() => {
    if (!reflections || reflections.length === 0) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = reflections.filter(r => new Date(r.date) >= weekAgo);

    // Count modalities
    const modalityCounts: Record<string, number> = {};
    reflections.forEach(r => {
      if (r.modality) {
        modalityCounts[r.modality] = (modalityCounts[r.modality] || 0) + 1;
      }
    });
    const topModality = Object.entries(modalityCounts).sort((a, b) => b[1] - a[1])[0];

    // Count practitioners
    const practitionerCounts: Record<string, number> = {};
    reflections.forEach(r => {
      if (r.practitionerName) {
        practitionerCounts[r.practitionerName] = (practitionerCounts[r.practitionerName] || 0) + 1;
      }
    });
    const favoriteHealer = Object.entries(practitionerCounts).sort((a, b) => b[1] - a[1])[0];

    // Roles breakdown
    const asRecipient = reflections.filter(r => r.role === 'recipient').length;
    const asPractitioner = reflections.filter(r => r.role === 'practitioner').length;

    return {
      thisWeekCount: thisWeek.length,
      totalSessions: reflections.length,
      topModality: topModality ? { name: topModality[0], count: topModality[1] } : null,
      favoriteHealer: favoriteHealer ? { name: favoriteHealer[0], count: favoriteHealer[1] } : null,
      asRecipient,
      asPractitioner,
    };
  }, [reflections]);

  // Most recent reflection
  const mostRecent = reflections?.[0];

  return (
    <div className="min-h-screen-minus-nav">
      {/* Warm, Healing Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-rose-500/20">
            <Heart className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Session Reflections</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Honor the healing you give and receive. Every session leaves its mark.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
              <Heart className="relative w-12 h-12 text-rose-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your sessions...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!reflections || reflections.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-rose-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-4 mb-3">
                  <Hand className="w-8 h-8 text-rose-400/60" />
                  <Heart className="w-8 h-8 text-pink-400/40" />
                  <Sparkles className="w-8 h-8 text-teal-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Your Healing Journey</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Whether you&apos;re giving or receiving healing, each session holds wisdom.
              Begin documenting your experiences and watch patterns emerge.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/30 hover:scale-105"
              data-testid="new-session-reflection-button"
            >
              <Heart className="w-5 h-5 mr-2" />
              Reflect on a Session
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && reflections && reflections.length > 0 && (
          <>
            {/* Insight Banner */}
            {insights && insights.thisWeekCount >= 2 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/10 rounded-2xl border border-rose-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-rose-500/20 rounded-lg">
                    <Heart className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Active Healing Week</h3>
                    <p className="text-slate-300 text-sm">
                      {insights.thisWeekCount} sessions this week. Your commitment to healing work is beautiful.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions + Last Session */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* New Reflection */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-rose-600/20 to-pink-600/20 rounded-2xl border border-rose-500/30 hover:border-rose-500/50 transition-all hover:scale-[1.02] text-left"
                data-testid="new-session-reflection-button"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-rose-500/30 rounded-lg group-hover:bg-rose-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-rose-300" />
                  </div>
                  <span className="text-white font-medium">Add Reflection</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Document a healing session while the experience is fresh
                </p>
              </button>

              {/* Last Session Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedReflection(mostRecent)}
                  className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-rose-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(mostRecent.date), { addSuffix: true })}</span>
                      <Badge variant="secondary" className={`text-xs ${
                        mostRecent.role === 'recipient' ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {mostRecent.role === 'recipient' ? 'Received' : 'Given'}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {mostRecent.modality && (
                      <span className="px-2 py-1 bg-rose-500/20 text-rose-300 rounded text-xs">
                        {MODALITY_LABELS[mostRecent.modality] || mostRecent.modality}
                      </span>
                    )}
                    {mostRecent.practitionerName && mostRecent.role === 'recipient' && (
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {mostRecent.practitionerName}
                      </span>
                    )}
                  </div>
                  {mostRecent.personalNotes && (
                    <p className="text-slate-400 text-sm line-clamp-2">{mostRecent.personalNotes}</p>
                  )}
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Heart className="w-4 h-4 text-rose-400" />
                <span><strong className="text-white">{insights?.totalSessions}</strong> sessions total</span>
              </div>
              {insights?.asRecipient !== undefined && insights.asRecipient > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4 text-teal-400" />
                  <span><strong className="text-white">{insights.asRecipient}</strong> received</span>
                </div>
              )}
              {insights?.asPractitioner !== undefined && insights.asPractitioner > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Hand className="w-4 h-4 text-amber-400" />
                  <span><strong className="text-white">{insights.asPractitioner}</strong> given</span>
                </div>
              )}
              {insights?.favoriteHealer && insights.favoriteHealer.count >= 2 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span><strong className="text-white">{insights.favoriteHealer.name}</strong> favorite healer</span>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Your Sessions</h2>
              </div>
              <div className="p-4">
                <SessionReflectionHistory
                  reflections={reflections}
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
        <DialogContent className="border-rose-500/20 max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              {editingReflection ? 'Edit Reflection' : 'Reflect on Your Session'}
            </DialogTitle>
          </DialogHeader>

          <SessionReflectionForm
            userId={userId}
            existingReflection={editingReflection}
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
      <Dialog open={!!selectedReflection} onOpenChange={(open) => !open && setSelectedReflection(null)}>
        <DialogContent className="border-rose-500/20 sm:max-w-lg">
          {selectedReflection && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedReflection.date), 'MMMM d, yyyy')}
                  </div>
                  <Badge variant="secondary" className={`text-xs ${
                    selectedReflection.role === 'recipient' ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {selectedReflection.role === 'recipient' ? 'Received Healing' : 'Gave Healing'}
                  </Badge>
                </div>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-400" />
                  {MODALITY_LABELS[selectedReflection.modality || ''] || 'Healing Session'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Session Details */}
                <div className="flex items-center gap-4 text-sm">
                  {selectedReflection.duration && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-4 h-4" />
                      {selectedReflection.duration} min
                    </div>
                  )}
                  {selectedReflection.practitionerName && selectedReflection.role === 'recipient' && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <User className="w-4 h-4" />
                      {selectedReflection.practitionerName}
                    </div>
                  )}
                </div>

                {/* Pre-Session State */}
                {selectedReflection.preSessionState && (
                  <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <div className="text-sm text-rose-400 mb-1">Pre-Session State</div>
                    <p className="text-slate-300 text-sm">{selectedReflection.preSessionState}</p>
                  </div>
                )}

                {/* Personal Notes */}
                {selectedReflection.personalNotes && (
                  <Panel dark className="p-4 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">Personal Notes</div>
                    <p className="text-slate-300 text-sm">{selectedReflection.personalNotes}</p>
                  </Panel>
                )}

                {/* Sensations */}
                {selectedReflection.sensations && selectedReflection.sensations.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Sensations</div>
                    <p className="text-slate-400 text-sm">{selectedReflection.sensations.join(', ')}</p>
                  </div>
                )}

                {/* Post-Session State */}
                {selectedReflection.postSessionState && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Post-Session State</div>
                    <p className="text-slate-400 text-sm">{selectedReflection.postSessionState}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedReflection(null);
                      handleEdit(selectedReflection);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedReflection(null)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700"
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
