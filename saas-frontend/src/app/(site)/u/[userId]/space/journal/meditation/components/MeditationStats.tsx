'use client';

import { Flame, Clock, TrendingUp, Heart } from 'lucide-react';
import { MeditationStats as MeditationStatsType } from '../hooks';
import { MEDITATION_TECHNIQUES } from '../types';

interface MeditationStatsProps {
  stats: MeditationStatsType | undefined;
  isLoading?: boolean;
}

const getTechniqueLabel = (key?: string) => {
  if (!key) return null;
  return MEDITATION_TECHNIQUES.find(t => t.key === key)?.label || key;
};

const MeditationStats: React.FC<MeditationStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-white/5 border border-white/20 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return null;
  }

  const statItems = [
    {
      icon: <Flame className="w-5 h-5 text-orange-400" />,
      label: 'Current Streak',
      value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`,
      subtext: stats.longestStreak > stats.currentStreak ? `Best: ${stats.longestStreak}` : 'Personal best!',
    },
    {
      icon: <Clock className="w-5 h-5 text-teal-400" />,
      label: 'Total Time',
      value: stats.totalMinutes >= 60
        ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
        : `${stats.totalMinutes}m`,
      subtext: `${stats.totalSessions} session${stats.totalSessions !== 1 ? 's' : ''}`,
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-cyan-400" />,
      label: 'Average',
      value: `${stats.averageDuration} min`,
      subtext: 'per session',
    },
    {
      icon: <Heart className="w-5 h-5 text-pink-400" />,
      label: 'Favorite',
      value: getTechniqueLabel(stats.favoriteTechnique) || 'Mindfulness',
      subtext: 'technique',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            {item.icon}
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
          <div className="text-xl font-semibold text-white">{item.value}</div>
          <div className="text-xs text-slate-500">{item.subtext}</div>
        </div>
      ))}
    </div>
  );
};

export default MeditationStats;
