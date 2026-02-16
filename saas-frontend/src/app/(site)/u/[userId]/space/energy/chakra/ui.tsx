'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Plus, Calendar, TrendingUp, Eye, Sun, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { useChakraCheckins, ChakraCheckin } from '../hooks';
import { ChakraCheckinForm } from './components/ChakraCheckinForm';
import { ChakraCheckinHistory } from './components/ChakraCheckinHistory';

interface Props {
  userId: string;
}

// Chakra configuration with colors and positions
const CHAKRAS = [
  { key: 'crown', name: 'Crown', color: 'violet', position: 'top-0' },
  { key: 'third_eye', name: 'Third Eye', color: 'indigo', position: 'top-[14%]' },
  { key: 'throat', name: 'Throat', color: 'sky', position: 'top-[28%]' },
  { key: 'heart', name: 'Heart', color: 'green', position: 'top-[42%]' },
  { key: 'solar_plexus', name: 'Solar Plexus', color: 'yellow', position: 'top-[56%]' },
  { key: 'sacral', name: 'Sacral', color: 'orange', position: 'top-[70%]' },
  { key: 'root', name: 'Root', color: 'red', position: 'top-[84%]' },
];

const CHAKRA_COLORS: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  crown: { bg: 'bg-violet-500', text: 'text-violet-400', glow: 'shadow-violet-500/50', border: 'border-violet-500/30' },
  third_eye: { bg: 'bg-indigo-500', text: 'text-indigo-400', glow: 'shadow-indigo-500/50', border: 'border-indigo-500/30' },
  throat: { bg: 'bg-sky-500', text: 'text-sky-400', glow: 'shadow-sky-500/50', border: 'border-sky-500/30' },
  heart: { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50', border: 'border-green-500/30' },
  solar_plexus: { bg: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/50', border: 'border-yellow-500/30' },
  sacral: { bg: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50', border: 'border-orange-500/30' },
  root: { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50', border: 'border-red-500/30' },
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
    case 'balanced':
      return 'text-green-400';
    case 'blocked':
    case 'weak':
      return 'text-red-400';
    case 'overactive':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
};

const getStatusOpacity = (status: string) => {
  switch (status) {
    case 'open':
    case 'balanced':
      return 1;
    case 'overactive':
      return 0.9;
    case 'blocked':
    case 'weak':
      return 0.4;
    default:
      return 0.6;
  }
};

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState<ChakraCheckin | null>(null);
  const [selectedCheckin, setSelectedCheckin] = useState<ChakraCheckin | null>(null);

  const { data: checkins, isLoading } = useChakraCheckins(userId);

  const handleEdit = (checkin: ChakraCheckin) => {
    setEditingCheckin(checkin);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCheckin(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCheckin(null);
  };

  // Check if user has done a check-in today
  const today = new Date().toISOString().split('T')[0];
  const todaysCheckin = checkins?.find(c => c.date === today);

  // Calculate insights
  const insights = useMemo(() => {
    if (!checkins || checkins.length < 2) return null;

    // Find chakras that are consistently blocked or open
    const chakraCounts: Record<string, { blocked: number; open: number }> = {};
    checkins.slice(0, 7).forEach(c => {
      c.chakras?.forEach(ch => {
        if (!chakraCounts[ch.chakra]) chakraCounts[ch.chakra] = { blocked: 0, open: 0 };
        if (ch.status === 'blocked' || ch.status === 'weak') chakraCounts[ch.chakra].blocked++;
        if (ch.status === 'open' || ch.status === 'balanced') chakraCounts[ch.chakra].open++;
      });
    });

    const needsAttention = Object.entries(chakraCounts)
      .filter(([, counts]) => counts.blocked >= 3)
      .map(([chakra]) => chakra);

    const thriving = Object.entries(chakraCounts)
      .filter(([, counts]) => counts.open >= 5)
      .map(([chakra]) => chakra);

    // Average balance
    const withBalance = checkins.filter(c => c.overallBalance);
    const avgBalance = withBalance.length
      ? (withBalance.reduce((sum, c) => sum + (c.overallBalance || 0), 0) / withBalance.length).toFixed(1)
      : null;

    return {
      needsAttention,
      thriving,
      avgBalance,
      totalCheckins: checkins.length,
    };
  }, [checkins]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Rainbow Chakra Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-56 h-56 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-60 h-60 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-violet-500/20 via-green-500/20 to-red-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-white/10">
            <Sparkles className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Chakra Check-In</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Tune into your energy centers. Notice what flows. Honor what needs attention.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
              <Sparkles className="relative w-12 h-12 text-violet-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Sensing your energy...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!checkins || checkins.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-green-500/10 to-red-500/10 rounded-full blur-2xl" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-white/10 backdrop-blur-xl">
                {/* Mini chakra visualization */}
                <div className="flex flex-col items-center gap-2">
                  {CHAKRAS.slice(0, 7).map((chakra) => {
                    const colors = CHAKRA_COLORS[chakra.key];
                    return (
                      <div
                        key={chakra.key}
                        className={`w-4 h-4 rounded-full ${colors.bg} opacity-40`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Begin Your Energy Awareness</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              A daily check-in with your chakras builds awareness and reveals patterns over time.
              Start noticing how your energy centers respond to life.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-violet-600 via-green-600 to-red-600 hover:from-violet-500 hover:via-green-500 hover:to-red-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105"
              data-testid="new-chakra-checkin-button"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Your First Check-In
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && checkins && checkins.length > 0 && (
          <>
            {/* Insight Banner */}
            {insights && insights.needsAttention.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 rounded-2xl border border-violet-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Eye className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Pattern Noticed</h3>
                    <p className="text-slate-300 text-sm">
                      Your {insights.needsAttention[0].replace('_', ' ')} chakra has been blocked in recent check-ins.
                      Consider focused meditation or energy work in this area.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Check-In Card OR New Check-In Prompt */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Visual Chakra Display */}
              <Panel dark className="p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-400" />
                    <h2 className="text-white font-medium">
                      {todaysCheckin ? 'Today\'s Energy' : 'Your Chakras'}
                    </h2>
                  </div>
                  {!todaysCheckin && (
                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
                      No check-in today
                    </span>
                  )}
                </div>

                {/* Vertical Chakra Visualization */}
                <div className="flex justify-center">
                  <div className="relative py-4">
                    {/* Central energy line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-gradient-to-b from-violet-500/30 via-green-500/30 to-red-500/30 rounded-full" />

                    {/* Chakra points */}
                    <div className="flex flex-col items-center gap-4">
                      {CHAKRAS.map((chakra) => {
                        const colors = CHAKRA_COLORS[chakra.key];
                        const checkinData = todaysCheckin?.chakras?.find(c => c.chakra === chakra.key);
                        const opacity = checkinData ? getStatusOpacity(checkinData.status) : 0.3;

                        return (
                          <div key={chakra.key} className="flex items-center gap-4">
                            <span className="text-xs text-slate-500 w-20 text-right">{chakra.name}</span>
                            <div
                              className={`w-8 h-8 rounded-full ${colors.bg} transition-all duration-500 shadow-lg ${colors.glow}`}
                              style={{ opacity }}
                            />
                            <span className={`text-xs w-20 ${checkinData ? getStatusColor(checkinData.status) : 'text-slate-600'}`}>
                              {checkinData?.status || '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {todaysCheckin?.overallBalance && (
                  <div className="mt-4 text-center text-sm text-slate-400">
                    Overall Balance: <span className="text-white font-medium">{todaysCheckin.overallBalance}/10</span>
                  </div>
                )}
              </Panel>

              {/* Action Card */}
              <div className="flex flex-col gap-4">
                {/* New Check-In */}
                <button
                  onClick={() => setShowForm(true)}
                  className="group p-6 bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-2xl border border-violet-500/30 hover:border-violet-500/50 transition-all hover:scale-[1.02] text-left flex-1"
                  data-testid="new-chakra-checkin-button"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-violet-500/30 rounded-lg group-hover:bg-violet-500/40 transition-colors">
                      <Plus className="w-5 h-5 text-violet-300" />
                    </div>
                    <span className="text-white font-medium">
                      {todaysCheckin ? 'New Check-In' : 'Daily Check-In'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {todaysCheckin
                      ? 'Energy shifts throughout the day. Check in again.'
                      : 'Take a moment to sense each energy center.'
                    }
                  </p>
                </button>

                {/* Most Recent (if not today) */}
                {checkins[0] && checkins[0].date !== today && (
                  <button
                    onClick={() => setSelectedCheckin(checkins[0])}
                    className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{formatDistanceToNow(new Date(checkins[0].date), { addSuffix: true })}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <p className="text-slate-400 text-sm">
                      Balance: {checkins[0].overallBalance || '—'}/10
                    </p>
                  </button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span><strong className="text-white">{insights?.totalCheckins}</strong> check-ins logged</span>
              </div>
              {insights?.avgBalance && (
                <div className="flex items-center gap-2 text-slate-400">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span><strong className="text-white">{insights.avgBalance}</strong> avg balance</span>
                </div>
              )}
              {insights?.thriving && insights.thriving.length > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span><strong className="text-white capitalize">{insights.thriving[0].replace('_', ' ')}</strong> thriving</span>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Check-In History</h2>
              </div>
              <div className="p-4">
                <ChakraCheckinHistory
                  checkins={checkins}
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
        <DialogContent className="border-violet-500/20 max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              {editingCheckin ? 'Edit Check-In' : 'Sense Your Energy Centers'}
            </DialogTitle>
          </DialogHeader>

          <ChakraCheckinForm
            userId={userId}
            existingCheckin={editingCheckin}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedCheckin} onOpenChange={(open) => !open && setSelectedCheckin(null)}>
        <DialogContent className="border-violet-500/20 sm:max-w-lg">
          {selectedCheckin && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedCheckin.date), 'MMMM d, yyyy')}
                </div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Chakra Check-In
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Chakra States */}
                <div className="space-y-2">
                  {selectedCheckin.chakras?.map((ch) => {
                    const colors = CHAKRA_COLORS[ch.chakra];
                    const chakraInfo = CHAKRAS.find(c => c.key === ch.chakra);
                    return (
                      <div key={ch.chakra} className={`flex items-center justify-between p-3 rounded-lg ${colors.border} border bg-white/5`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.bg}`} style={{ opacity: getStatusOpacity(ch.status) }} />
                          <span className="text-white text-sm">{chakraInfo?.name || ch.chakra}</span>
                        </div>
                        <span className={`text-sm ${getStatusColor(ch.status)}`}>{ch.status}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedCheckin.overallBalance && (
                  <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center">
                    <div className="text-sm text-violet-400 mb-1">Overall Balance</div>
                    <div className="text-2xl font-bold text-white">{selectedCheckin.overallBalance}/10</div>
                  </div>
                )}

                {selectedCheckin.observations && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Observations</div>
                    <p className="text-slate-400 text-sm">{selectedCheckin.observations}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCheckin(null);
                      handleEdit(selectedCheckin);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedCheckin(null)}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
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
