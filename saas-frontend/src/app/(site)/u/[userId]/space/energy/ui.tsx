'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Zap, Activity, Heart, Sparkles, TrendingUp, Flame, Sun, ChevronRight, Wind, Shield } from 'lucide-react';
import { useEnergyStats } from './hooks';

interface Props {
  userId: string;
}

// Chakra colors for visual representation
const CHAKRA_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  root: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/20' },
  sacral: { bg: 'bg-orange-500/20', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  solar_plexus: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  heart: { bg: 'bg-green-500/20', text: 'text-green-400', glow: 'shadow-green-500/20' },
  throat: { bg: 'bg-sky-500/20', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
  third_eye: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
  crown: { bg: 'bg-violet-500/20', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
};

const UI: React.FC<Props> = ({ userId }) => {
  const { data: stats, isLoading } = useEnergyStats(userId);

  // Generate an insight message based on stats
  const insight = useMemo(() => {
    if (!stats) return null;

    // Check for streak
    if (stats.practiceStreak >= 7) {
      return {
        icon: <Flame className="w-5 h-5 text-amber-400" />,
        title: 'Consistency Building',
        message: `${stats.practiceStreak} days of practice! Your dedication is strengthening your energetic foundation.`,
        color: 'from-amber-500/10 via-orange-500/10 to-amber-500/10',
        border: 'border-amber-500/20',
      };
    }

    // Check for improving chakras
    const improvingChakras = stats.chakraTrends?.filter(t => t.trend === 'improving') || [];
    if (improvingChakras.length >= 2) {
      return {
        icon: <TrendingUp className="w-5 h-5 text-green-400" />,
        title: 'Energy Rising',
        message: `${improvingChakras.length} chakras showing improvement. Your energy work is creating positive shifts.`,
        color: 'from-green-500/10 via-emerald-500/10 to-green-500/10',
        border: 'border-green-500/20',
      };
    }

    // Check for blocked chakras needing attention
    const needsAttention = stats.chakraTrends?.filter(t => t.trend === 'declining') || [];
    if (needsAttention.length > 0) {
      const chakraName = needsAttention[0].chakra.replace('_', ' ');
      return {
        icon: <Wind className="w-5 h-5 text-sky-400" />,
        title: 'Invitation to Balance',
        message: `Your ${chakraName} chakra may benefit from focused attention. Trust your body's wisdom.`,
        color: 'from-sky-500/10 via-blue-500/10 to-sky-500/10',
        border: 'border-sky-500/20',
      };
    }

    // Default encouraging message
    if (stats.totalJournalEntries > 0) {
      return {
        icon: <Sun className="w-5 h-5 text-amber-400" />,
        title: 'Your Energy Journey',
        message: `${stats.totalPracticeMinutes} minutes of practice logged. Every moment of awareness strengthens your field.`,
        color: 'from-amber-500/10 via-yellow-500/10 to-amber-500/10',
        border: 'border-amber-500/20',
      };
    }

    return null;
  }, [stats]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Warm, Glowing Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/3 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-rose-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header - Warm and Inviting */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-amber-500/20">
            <Zap className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Energy Healing</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Nurture your energetic body. Track your practice. Feel the shifts.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
              <Zap className="relative w-12 h-12 text-amber-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Connecting to your energy...</p>
          </div>
        )}

        {/* Empty State - Welcoming */}
        {!isLoading && stats && stats.totalJournalEntries === 0 && stats.chakraCheckinsCount === 0 && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-amber-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-4 mb-3">
                  <Zap className="w-8 h-8 text-amber-400/60" />
                  <Sparkles className="w-8 h-8 text-orange-400/40" />
                  <Heart className="w-8 h-8 text-rose-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Begin Your Energy Practice</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Whether you practice Reiki, work with chakras, or explore other healing modalities,
              this is your space to track and deepen your journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/u/${userId}/space/energy/journal`}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-8 py-4 text-lg rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-105"
              >
                <Activity className="w-5 h-5" />
                Log Your First Session
              </Link>
              <Link
                href={`/u/${userId}/space/energy/chakra`}
                className="inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-8 py-4 text-lg rounded-xl border border-white/10 transition-all hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Chakra Check-In
              </Link>
            </div>
          </div>
        )}

        {/* Active State - With Data */}
        {!isLoading && stats && (stats.totalJournalEntries > 0 || stats.chakraCheckinsCount > 0) && (
          <>
            {/* Insight Banner */}
            {insight && (
              <div className={`mb-8 p-5 bg-gradient-to-r ${insight.color} rounded-2xl border ${insight.border} backdrop-blur-sm`}>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">{insight.title}</h3>
                    <p className="text-slate-300 text-sm">{insight.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Link
                href={`/u/${userId}/space/energy/journal`}
                className="group p-6 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-2xl border border-amber-500/30 hover:border-amber-500/50 transition-all hover:scale-[1.02] text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/30 rounded-lg group-hover:bg-amber-500/40 transition-colors">
                      <Activity className="w-5 h-5 text-amber-300" />
                    </div>
                    <span className="text-white font-medium">Energy Journal</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-slate-400 text-sm mb-3">Log sessions, practices, and observations</p>
                <div className="text-2xl font-bold text-amber-400">{stats.totalJournalEntries}</div>
                <div className="text-xs text-slate-500">entries logged</div>
              </Link>

              <Link
                href={`/u/${userId}/space/energy/chakra`}
                className="group p-6 bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-2xl border border-violet-500/30 hover:border-violet-500/50 transition-all hover:scale-[1.02] text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/30 rounded-lg group-hover:bg-violet-500/40 transition-colors">
                      <Sparkles className="w-5 h-5 text-violet-300" />
                    </div>
                    <span className="text-white font-medium">Chakra Check-In</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                </div>
                <p className="text-slate-400 text-sm mb-3">Track your energy centers</p>
                <div className="text-2xl font-bold text-violet-400">{stats.chakraCheckinsCount}</div>
                <div className="text-xs text-slate-500">check-ins completed</div>
              </Link>

              <Link
                href={`/u/${userId}/space/energy/sessions`}
                className="group p-6 bg-gradient-to-br from-rose-600/20 to-pink-600/20 rounded-2xl border border-rose-500/30 hover:border-rose-500/50 transition-all hover:scale-[1.02] text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/30 rounded-lg group-hover:bg-rose-500/40 transition-colors">
                      <Heart className="w-5 h-5 text-rose-300" />
                    </div>
                    <span className="text-white font-medium">Session Reflections</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
                </div>
                <p className="text-slate-400 text-sm mb-3">Reflect on healing received</p>
                <div className="text-2xl font-bold text-rose-400">{(stats.sessionsGiven || 0) + (stats.sessionsReceived || 0)}</div>
                <div className="text-xs text-slate-500">sessions recorded</div>
              </Link>
            </div>

            {/* Stats Row - Subtle */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              {stats.practiceStreak > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span><strong className="text-white">{stats.practiceStreak}</strong> day streak</span>
                </div>
              )}
              {stats.totalPracticeMinutes > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span><strong className="text-white">{stats.totalPracticeMinutes}</strong> minutes practiced</span>
                </div>
              )}
              {(stats.sessionsGiven || 0) > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span><strong className="text-white">{stats.sessionsGiven}</strong> sessions given</span>
                </div>
              )}
            </div>

            {/* Chakra Trends - Visual */}
            {stats.chakraTrends && stats.chakraTrends.length > 0 && (
              <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                    <h2 className="text-white font-medium">Chakra Balance</h2>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">Based on your recent check-ins</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                    {stats.chakraTrends.map((trend) => {
                      const colors = CHAKRA_COLORS[trend.chakra] || CHAKRA_COLORS.heart;
                      return (
                        <div
                          key={trend.chakra}
                          className={`relative text-center p-4 rounded-xl ${colors.bg} border border-white/5 transition-all hover:scale-105`}
                        >
                          {/* Chakra indicator dot */}
                          <div className={`w-3 h-3 rounded-full ${colors.bg} ${colors.text} mx-auto mb-2 shadow-lg ${colors.glow}`}
                               style={{ boxShadow: `0 0 12px currentColor` }} />
                          <div className="text-xs text-slate-400 capitalize mb-1">
                            {trend.chakra.replace('_', ' ')}
                          </div>
                          <div className={`text-sm font-medium ${colors.text}`}>
                            {trend.recentStatus}
                          </div>
                          <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                            trend.trend === 'improving' ? 'text-green-400' :
                            trend.trend === 'declining' ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {trend.trend === 'improving' && '↑'}
                            {trend.trend === 'declining' && '↓'}
                            {trend.trend}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UI;
