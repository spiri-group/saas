'use client';

import { Loader2, Sparkles, Moon, BookOpen, TrendingUp, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSymbolPatternStats, SymbolOccurrence, SymbolCategory } from '../hooks/useSymbolPatternStats';
import { format, parseISO } from 'date-fns';

interface SymbolPatternDashboardProps {
  userId: string;
}

// Category colors and icons
const CATEGORY_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  ELEMENT: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '💧' },
  ANIMAL: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: '🐾' },
  ARCHETYPE: { color: 'text-violet-400', bg: 'bg-violet-500/20', icon: '👤' },
  OBJECT: { color: 'text-slate-300', bg: 'bg-slate-500/20', icon: '🔮' },
  PLACE: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '🏔️' },
  PERSON: { color: 'text-pink-400', bg: 'bg-pink-500/20', icon: '👥' },
  ACTION: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '⚡' },
  CELESTIAL: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '✨' },
  OTHER: { color: 'text-indigo-400', bg: 'bg-indigo-500/20', icon: '🌀' },
};

const getCategoryStyle = (category?: SymbolCategory) => {
  return CATEGORY_STYLES[category || 'OTHER'] || CATEGORY_STYLES.OTHER;
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

const SymbolRow: React.FC<{ symbol: SymbolOccurrence; showCrossEntry?: boolean }> = ({
  symbol,
  showCrossEntry = false,
}) => {
  const style = getCategoryStyle(symbol.category);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
          {style.icon}
        </span>
        <div>
          <div className="text-white font-medium">{symbol.symbolName}</div>
          {symbol.personalMeaning && (
            <div className="text-xs text-slate-500 truncate max-w-[200px]">
              {symbol.personalMeaning}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {showCrossEntry ? (
          <>
            <div className="flex items-center gap-1 text-indigo-400">
              <BookOpen className="w-3 h-3" />
              {symbol.readingCount}
            </div>
            <div className="flex items-center gap-1 text-purple-400">
              <Moon className="w-3 h-3" />
              {symbol.dreamCount}
            </div>
          </>
        ) : (
          <span className="text-slate-400">{symbol.totalCount}x</span>
        )}
      </div>
    </div>
  );
};

const CategoryBar: React.FC<{ category: string; percentage: number; count: number }> = ({
  category,
  percentage,
  count,
}) => {
  const style = getCategoryStyle(category as SymbolCategory);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={style.color}>
          {style.icon} {category.charAt(0) + category.slice(1).toLowerCase()}
        </span>
        <span className="text-slate-400">{count} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${style.bg} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

const SymbolPatternDashboard: React.FC<SymbolPatternDashboardProps> = ({ userId }) => {
  const { data: stats, isLoading, error } = useSymbolPatternStats(userId);

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
        <p>Unable to load symbol statistics</p>
      </div>
    );
  }

  if (stats.totalSymbols === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No symbols tracked yet</p>
        <p className="text-sm mt-1">
          Add symbols to your dreams and readings to see patterns emerge
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Symbols"
          value={stats.totalSymbols}
          sublabel="unique symbols tracked"
          icon={<Layers className="w-5 h-5" />}
        />
        <StatCard
          label="Total Occurrences"
          value={stats.totalOccurrences}
          sublabel="across all entries"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Cross-Entry"
          value={stats.crossEntrySymbols.length}
          sublabel="appear in dreams & readings"
          icon={<Sparkles className="w-5 h-5" />}
          color="text-amber-400"
        />
      </div>

      {/* Cross-Entry Symbols - The Key Insight */}
      {stats.crossEntrySymbols.length > 0 && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20 p-5">
          <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Symbols Appearing in Both Dreams &amp; Readings
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            These symbols are speaking to you across multiple channels - pay attention!
          </p>
          <div className="space-y-2">
            {stats.crossEntrySymbols.map((symbol) => (
              <SymbolRow key={symbol.symbolName} symbol={symbol} showCrossEntry />
            ))}
          </div>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Symbols */}
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Most Frequent Symbols
          </h3>
          <div className="space-y-2">
            {stats.topSymbols.slice(0, 6).map((symbol) => (
              <SymbolRow key={symbol.symbolName} symbol={symbol} />
            ))}
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-lg font-medium text-white mb-4">Symbol Categories</h3>
          <div className="space-y-4">
            {stats.categoryBreakdown.slice(0, 6).map((cat) => (
              <CategoryBar
                key={cat.category}
                category={cat.category}
                percentage={cat.percentage}
                count={cat.count}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Symbol Activity */}
      <Card className="bg-white/5 border-white/10 p-5">
        <h3 className="text-lg font-medium text-white mb-4">Recent Symbol Activity</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.recentSymbols.slice(0, 5).map((symbol) => {
            const style = getCategoryStyle(symbol.category);
            return (
              <div
                key={symbol.symbolName}
                className={`p-3 rounded-lg ${style.bg} border border-white/10 text-center`}
              >
                <div className="text-lg mb-1">{style.icon}</div>
                <div className="text-sm text-white">{symbol.symbolName}</div>
                <div className="text-xs text-slate-500">
                  {format(parseISO(symbol.lastSeen), 'MMM d')}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default SymbolPatternDashboard;
