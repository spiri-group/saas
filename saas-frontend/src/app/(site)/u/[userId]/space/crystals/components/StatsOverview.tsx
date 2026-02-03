'use client';

import { Gem, Heart, Star, Droplets, Grid3X3, Flame } from 'lucide-react';
import { CrystalStats, CRYSTAL_COLORS, CRYSTAL_FORMS, CHAKRAS } from '../types';

interface StatsOverviewProps {
  stats: CrystalStats | undefined;
  isLoading: boolean;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-xl animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Crystals',
      value: stats.totalCrystals,
      icon: Gem,
      color: 'purple',
      subtext: `${stats.activeCrystals} active`,
    },
    {
      label: 'Special Bonds',
      value: stats.specialBondCount,
      icon: Heart,
      color: 'pink',
      subtext: 'Deep connections',
    },
    {
      label: 'Wishlist',
      value: stats.wishlistCount,
      icon: Star,
      color: 'yellow',
      subtext: `${stats.acquiredFromWishlist} acquired`,
    },
    {
      label: 'Companion Streak',
      value: stats.companionStreak,
      icon: Flame,
      color: 'orange',
      subtext: 'days',
    },
    {
      label: 'Cleansing Sessions',
      value: stats.totalCleansingsSessions,
      icon: Droplets,
      color: 'blue',
      subtext: 'total logged',
    },
    {
      label: 'Active Grids',
      value: stats.activeGrids,
      icon: Grid3X3,
      color: 'indigo',
      subtext: 'in use',
    },
  ];

  const getColorClass = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
      yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
      orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    };
    return colorMap[color] || colorMap.purple;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colors = getColorClass(stat.color);
          return (
            <div
              key={stat.label}
              className={`p-4 ${colors.bg} border ${colors.border} rounded-xl`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${colors.text}`} />
                <span className="text-slate-400 text-xs">{stat.label}</span>
              </div>
              <p className="text-white text-2xl font-light">{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Distributions */}
      {stats.totalCrystals > 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Color Distribution */}
          {stats.colorDistribution.length > 0 && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h4 className="text-slate-300 text-sm font-medium mb-3">By Color</h4>
              <div className="space-y-2">
                {stats.colorDistribution.slice(0, 5).map((item) => {
                  const colorInfo = CRYSTAL_COLORS.find(c => c.key === item.color);
                  return (
                    <div key={item.color} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{colorInfo?.label || item.color}</span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Distribution */}
          {stats.formDistribution.length > 0 && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h4 className="text-slate-300 text-sm font-medium mb-3">By Form</h4>
              <div className="space-y-2">
                {stats.formDistribution.slice(0, 5).map((item) => {
                  const formInfo = CRYSTAL_FORMS.find(f => f.key === item.form);
                  return (
                    <div key={item.form} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{formInfo?.label || item.form}</span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chakra Distribution */}
          {stats.chakraDistribution.length > 0 && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h4 className="text-slate-300 text-sm font-medium mb-3">By Chakra</h4>
              <div className="flex flex-wrap gap-2">
                {stats.chakraDistribution.map((item) => {
                  const chakraInfo = CHAKRAS.find(c => c.key === item.chakra);
                  return (
                    <div
                      key={item.chakra}
                      className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: chakraInfo?.color }}
                      />
                      <span className="text-slate-400 text-xs">{chakraInfo?.label}</span>
                      <span className="text-slate-500 text-xs">({item.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently Added */}
      {stats.recentlyAdded.length > 0 && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <h4 className="text-slate-300 text-sm font-medium mb-3">Recently Added</h4>
          <div className="flex flex-wrap gap-2">
            {stats.recentlyAdded.map((crystal) => (
              <div
                key={crystal.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full"
              >
                <Gem className="w-3 h-3 text-purple-400" />
                <span className="text-slate-300 text-sm">{crystal.name}</span>
                <span className="text-slate-500 text-xs">
                  {new Date(crystal.addedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsOverview;
