'use client';

import { useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, RotateCcw, Layers, Calendar, Sparkles, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCardPatternStats, PatternPeriod } from '../hooks/useCardPatternStats';
import { format, parseISO } from 'date-fns';

interface CardPatternDashboardProps {
  userId: string;
}

// Period options for the selector
const PERIOD_OPTIONS: { key: PatternPeriod; label: string; shortLabel: string }[] = [
  { key: 'WEEK', label: 'This Week', shortLabel: '7d' },
  { key: 'MONTH', label: 'This Month', shortLabel: '30d' },
  { key: 'THREE_MONTHS', label: 'Last 3 Months', shortLabel: '3mo' },
  { key: 'SIX_MONTHS', label: 'Last 6 Months', shortLabel: '6mo' },
  { key: 'YEAR', label: 'This Year', shortLabel: '1y' },
  { key: 'ALL_TIME', label: 'All Time', shortLabel: 'All' },
];

// Suit colors and icons
const SUIT_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  Cups: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '🏆' },
  Swords: { color: 'text-slate-300', bg: 'bg-slate-500/20', icon: '⚔️' },
  Wands: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🪄' },
  Pentacles: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '⭐' },
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  color?: string;
}> = ({ label, value, sublabel, icon, color = 'text-purple-400' }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-slate-400">{label}</span>
      {icon && <span className={color}>{icon}</span>}
    </div>
    <div className={`text-2xl font-light ${color}`}>{value}</div>
    {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
  </div>
);

const SuitBar: React.FC<{ suit: string; percentage: number; count: number }> = ({
  suit,
  percentage,
  count,
}) => {
  const style = SUIT_STYLES[suit] || { color: 'text-slate-400', bg: 'bg-slate-500/20', icon: '?' };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={style.color}>
          {style.icon} {suit}
        </span>
        <span className="text-slate-400">{count} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${style.bg} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Change indicator component
const ChangeIndicator: React.FC<{ change?: number; percent?: number }> = ({ change, percent }) => {
  if (change === undefined || change === 0) {
    return (
      <span className="text-slate-500 flex items-center gap-1 text-xs">
        <Minus className="w-3 h-3" /> No change
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="text-emerald-400 flex items-center gap-1 text-xs">
        <ArrowUp className="w-3 h-3" /> +{change} ({percent?.toFixed(0)}%)
      </span>
    );
  }
  return (
    <span className="text-red-400 flex items-center gap-1 text-xs">
      <ArrowDown className="w-3 h-3" /> {change} ({percent?.toFixed(0)}%)
    </span>
  );
};

const CardPatternDashboard: React.FC<CardPatternDashboardProps> = ({ userId }) => {
  const [period, setPeriod] = useState<PatternPeriod>('MONTH');
  const { data: stats, isLoading, error } = useCardPatternStats(userId, period);

  const currentPeriodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label || 'This Month';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Unable to load pattern statistics</p>
      </div>
    );
  }

  if (stats.totalReadings === 0) {
    return (
      <div className="space-y-6">
        {/* Period Selector - even on empty state */}
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setPeriod(option.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === option.key
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">{option.shortLabel}</span>
            </button>
          ))}
        </div>

        <div className="text-center py-12 text-slate-400">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No readings in {currentPeriodLabel.toLowerCase()}</p>
          <p className="text-sm mt-1">Try selecting a different time period or log some readings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setPeriod(option.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === option.key
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sm:hidden">{option.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Period Context */}
      {stats.periodStart && stats.periodEnd && (
        <div className="flex items-center justify-between text-sm text-slate-400 px-1">
          <span>
            {format(parseISO(stats.periodStart), 'MMM d')} - {format(parseISO(stats.periodEnd), 'MMM d, yyyy')}
          </span>
          {stats.previousPeriodReadings !== undefined && (
            <ChangeIndicator change={stats.readingsChange} percent={stats.readingsChangePercent} />
          )}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Readings"
          value={stats.totalReadings}
          sublabel={stats.previousPeriodReadings !== undefined ? `vs ${stats.previousPeriodReadings} last period` : undefined}
          icon={<Layers className="w-5 h-5" />}
        />
        <StatCard
          label="Cards Pulled"
          value={stats.totalCards}
          sublabel={`${stats.uniqueCards} unique cards`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Major Arcana"
          value={`${stats.majorArcanaPercentage}%`}
          sublabel={`${stats.majorArcanaCount} of ${stats.totalCards} cards`}
          icon={<Sparkles className="w-5 h-5" />}
          color="text-amber-400"
        />
        <StatCard
          label="Reversed"
          value={`${stats.reversedPercentage}%`}
          sublabel={`${stats.totalReversed} cards reversed`}
          icon={<RotateCcw className="w-5 h-5" />}
          color="text-indigo-400"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Cards */}
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Most Frequent Cards
          </h3>
          <div className="space-y-3">
            {stats.topCards.slice(0, 5).map((card, idx) => (
              <div
                key={card.name}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-white">{card.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">{card.count}x</span>
                  {card.reversedCount > 0 && (
                    <span className="text-indigo-400 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      {card.reversedCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Suit Distribution */}
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-lg font-medium text-white mb-4">Suit Distribution</h3>
          <div className="space-y-4">
            {stats.suitDistribution.map((suit) => (
              <SuitBar
                key={suit.suit}
                suit={suit.suit}
                percentage={suit.percentage}
                count={suit.count}
              />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Minor Arcana Total</span>
              <span>{stats.minorArcanaCount} cards</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Emerging & Fading Patterns - only show when we have comparison data */}
      {period !== 'ALL_TIME' && ((stats.emergingCards && stats.emergingCards.length > 0) || (stats.fadingCards && stats.fadingCards.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Emerging Cards */}
          {stats.emergingCards && stats.emergingCards.length > 0 && (
            <Card className="bg-white/5 border-white/10 p-5 border-l-4 border-l-emerald-500">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>What&apos;s Emerging</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">Cards showing up more frequently in your recent readings</p>
              <div className="space-y-2">
                {stats.emergingCards.map((card) => (
                  <div
                    key={card.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10"
                  >
                    <span className="text-emerald-300">{card.name}</span>
                    <span className="text-sm text-emerald-400/70">{card.count}x</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Fading Cards */}
          {stats.fadingCards && stats.fadingCards.length > 0 && (
            <Card className="bg-white/5 border-white/10 p-5 border-l-4 border-l-slate-500">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-slate-400" />
                <span>What&apos;s Fading</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">Cards that appeared before but less frequently now</p>
              <div className="space-y-2">
                {stats.fadingCards.map((card) => (
                  <div
                    key={card.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-500/10"
                  >
                    <span className="text-slate-400">{card.name}</span>
                    <span className="text-sm text-slate-500">was {card.count}x</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Recent Cards */}
      <Card className="bg-white/5 border-white/10 p-5">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Recently Pulled
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.recentCards.slice(0, 5).map((card) => (
            <div
              key={card.name}
              className="p-3 rounded-lg bg-white/5 border border-white/10 text-center"
            >
              <div className="text-sm text-white mb-1">{card.name}</div>
              <div className="text-xs text-slate-500">
                {format(parseISO(card.lastPulled), 'MMM d')}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reading Sources */}
      {(stats.externalReadings > 0 || stats.spiriverseReadings > 0) && (
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-lg font-medium text-white mb-4">Reading Sources</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-light text-purple-400">{stats.selfReadings}</div>
              <div className="text-xs text-slate-400 mt-1">Self Pulls</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-light text-blue-400">{stats.externalReadings}</div>
              <div className="text-xs text-slate-400 mt-1">External</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-light text-amber-400">{stats.spiriverseReadings}</div>
              <div className="text-xs text-slate-400 mt-1">SpiriVerse</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CardPatternDashboard;
