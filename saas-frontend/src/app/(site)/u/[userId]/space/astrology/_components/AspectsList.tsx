'use client';

import { BirthChart, getBodyInfo, getAspectInfo, AspectType } from '../_hooks/useBirthChart';

interface Props {
  chart: BirthChart;
}

// Aspect colors for visual distinction
const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'text-amber-400',
  sextile: 'text-blue-400',
  square: 'text-red-400',
  trine: 'text-green-400',
  opposition: 'text-purple-400',
};

const ASPECT_BG_COLORS: Record<AspectType, string> = {
  conjunction: 'bg-amber-500/10 border-amber-500/20',
  sextile: 'bg-blue-500/10 border-blue-500/20',
  square: 'bg-red-500/10 border-red-500/20',
  trine: 'bg-green-500/10 border-green-500/20',
  opposition: 'bg-purple-500/10 border-purple-500/20',
};

export const AspectsList: React.FC<Props> = ({ chart }) => {
  if (!chart.aspects || chart.aspects.length === 0) {
    return (
      <div className="text-slate-500 text-center py-8">
        No major aspects found
      </div>
    );
  }

  // Group aspects by type
  const groupedAspects = chart.aspects.reduce((acc, aspect) => {
    if (!acc[aspect.aspect]) {
      acc[aspect.aspect] = [];
    }
    acc[aspect.aspect].push(aspect);
    return acc;
  }, {} as Record<AspectType, typeof chart.aspects>);

  // Sort aspect types by "harmony" - trines and sextiles first, then conjunctions, then squares and oppositions
  const sortedTypes: AspectType[] = ['trine', 'sextile', 'conjunction', 'square', 'opposition'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Major Aspects</h3>
        <div className="text-xs text-slate-500">
          {chart.aspects.length} aspect{chart.aspects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Aspect Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {sortedTypes.map(type => {
          const info = getAspectInfo(type);
          const count = groupedAspects[type]?.length || 0;
          if (count === 0) return null;
          return (
            <div key={type} className={`flex items-center gap-1.5 px-2 py-1 rounded border ${ASPECT_BG_COLORS[type]}`}>
              <span className={`text-sm ${ASPECT_COLORS[type]}`}>{info?.symbol}</span>
              <span className="text-slate-400">{info?.name}</span>
              <span className="text-slate-500">({count})</span>
            </div>
          );
        })}
      </div>

      {/* Aspects List */}
      <div className="bg-slate-800/30 rounded-lg p-4">
        <div className="space-y-4">
          {sortedTypes.map(aspectType => {
            const aspects = groupedAspects[aspectType];
            if (!aspects || aspects.length === 0) return null;

            const aspectInfo = getAspectInfo(aspectType);

            return (
              <div key={aspectType}>
                <h4 className={`text-sm font-medium mb-2 ${ASPECT_COLORS[aspectType]}`}>
                  {aspectInfo?.symbol} {aspectInfo?.name}s ({aspectInfo?.angle}°)
                </h4>
                <div className="space-y-1">
                  {aspects
                    .sort((a, b) => a.orb - b.orb) // Sort by tightest orb first
                    .map((aspect, idx) => {
                      const body1Info = getBodyInfo(aspect.body1);
                      const body2Info = getBodyInfo(aspect.body2);

                      return (
                        <div
                          key={`${aspect.body1}-${aspect.body2}-${idx}`}
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-[100px]">
                            <span className="text-lg">{body1Info?.symbol}</span>
                            <span className="text-slate-300 text-sm">{body1Info?.name}</span>
                          </div>
                          <span className={`text-lg ${ASPECT_COLORS[aspectType]}`}>
                            {aspectInfo?.symbol}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-[100px]">
                            <span className="text-lg">{body2Info?.symbol}</span>
                            <span className="text-slate-300 text-sm">{body2Info?.name}</span>
                          </div>
                          <span className="text-slate-500 text-xs ml-auto font-mono">
                            {aspect.orb.toFixed(1)}° orb
                          </span>
                          {aspect.applying && (
                            <span className="text-xs text-slate-600" title="Applying aspect">
                              →
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aspect Meanings Legend */}
      <div className="text-xs text-slate-500 space-y-1">
        <p><span className="text-green-400">△ Trines</span> and <span className="text-blue-400">⚹ Sextiles</span> are harmonious, flowing aspects</p>
        <p><span className="text-amber-400">☌ Conjunctions</span> blend energies - can be harmonious or challenging</p>
        <p><span className="text-red-400">□ Squares</span> and <span className="text-purple-400">☍ Oppositions</span> create tension that drives growth</p>
      </div>
    </div>
  );
};

export default AspectsList;
