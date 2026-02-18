'use client';

import { useState, useMemo } from 'react';
import { Droplets, Plus, Moon, Sparkles, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CleansingForm,
  CleansingHistory,
} from '../components';
import { CrystalCleansingLog } from '../types';
import {
  useCrystalCollection,
  useCrystalCleansingLogs,
  useDeleteCleansingLog,
} from '../hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);

  const { data: crystals = [] } = useCrystalCollection(userId);
  const { data: logs = [], isLoading } = useCrystalCleansingLogs(userId);
  const deleteMutation = useDeleteCleansingLog();

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  const handleDelete = async (log: CrystalCleansingLog) => {
    if (confirm('Are you sure you want to delete this cleansing session log?')) {
      await deleteMutation.mutateAsync({ id: log.id, userId });
    }
  };

  // Calculate insights
  const insights = useMemo(() => {
    const totalSessions = logs.length;

    // This week's sessions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekSessions = logs.filter(l => new Date(l.date) >= weekAgo).length;

    // Most common method
    const methodCounts: Record<string, number> = {};
    logs.forEach(l => {
      if (l.method) {
        methodCounts[l.method] = (methodCounts[l.method] || 0) + 1;
      }
    });
    const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0];

    // Moon phase sessions
    const moonPhaseSessions = logs.filter(l => l.moonPhase).length;

    // Unique crystals cleansed
    const uniqueCrystals = new Set(logs.flatMap(l => l.crystalIds || [])).size;

    return {
      totalSessions,
      thisWeekSessions,
      topMethod: topMethod ? { method: topMethod[0], count: topMethod[1] } : null,
      moonPhaseSessions,
      uniqueCrystals,
    };
  }, [logs]);

  const hasData = logs.length > 0;

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background - Water/Cleansing theme */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-cyan-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-sky-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Empty State - Centered welcoming design */}
        {!hasData && !isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-blue-500/20 rounded-2xl mb-4">
              <Droplets className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-light text-white mb-2">Cleansing Rituals</h1>
            <p className="text-slate-400 mb-8">Sacred care for your crystals, restoring their pure vibration</p>

            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Droplets className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Begin Your Cleansing Practice</h3>
              <p className="text-slate-400 mb-4 max-w-md mx-auto">
                Log your crystal cleansing rituals to track methods, moon phases, and build a sacred practice of care for your stones.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                data-testid="log-cleansing-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Your First Cleansing
              </Button>
            </div>
          </div>
        )}

        {/* Has Data - Compact layout */}
        {hasData && (
          <>
            {/* Compact Header Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Droplets className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-light text-white">Cleansing Rituals</h1>
                  <p className="text-slate-500 text-sm">Sacred care for your crystals</p>
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                data-testid="log-cleansing-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Cleansing
              </Button>
            </div>

            {/* Compact Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">{insights.totalSessions}</span>
                <span className="text-slate-400">total</span>
              </div>
              {insights.thisWeekSessions > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 rounded-lg">
                  <Flame className="w-4 h-4 text-teal-400" />
                  <span className="text-teal-300 font-medium">{insights.thisWeekSessions}</span>
                  <span className="text-teal-300/80">this week</span>
                </div>
              )}
              {insights.moonPhaseSessions > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-lg">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-indigo-300 font-medium">{Math.round((insights.moonPhaseSessions / insights.totalSessions) * 100)}%</span>
                  <span className="text-indigo-300/80">moon aligned</span>
                </div>
              )}
              {insights.topMethod && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Favorite:</span>
                  <span className="text-white">{insights.topMethod.method}</span>
                </div>
              )}
            </div>

            {/* Cleansing History */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <CleansingHistory
                logs={logs}
                isLoading={isLoading}
                onDelete={handleDelete}
              />
            </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              Log Cleansing Session
            </DialogTitle>
          </DialogHeader>

          <CleansingForm
            userId={userId}
            crystals={crystals}
            onSuccess={handleFormSuccess}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
