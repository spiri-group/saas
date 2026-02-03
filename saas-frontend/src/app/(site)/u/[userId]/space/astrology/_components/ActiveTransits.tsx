'use client';

import { TransitToNatalAspect, ASPECT_COLORS, getTransitSignificance } from '../_hooks/useTransits';
import { getSignInfo, getBodyInfo, getAspectInfo } from '../_hooks/useBirthChart';

interface Props {
  transits: TransitToNatalAspect[];
  title?: string;
  showAll?: boolean;
}

export const ActiveTransits: React.FC<Props> = ({
  transits,
  title = 'Active Transits',
  showAll = false
}) => {
  if (!transits || transits.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-medium text-white mb-4">{title}</h3>
        <p className="text-slate-500 text-center py-8">
          No active transits to your natal chart
        </p>
      </div>
    );
  }

  // Sort by significance then by orb
  const sortedTransits = [...transits].sort((a, b) => {
    const sigA = getTransitSignificance(a.transitPlanet, a.natalPlanet);
    const sigB = getTransitSignificance(b.transitPlanet, b.natalPlanet);
    const sigOrder = { high: 0, medium: 1, low: 2 };
    const sigDiff = sigOrder[sigA] - sigOrder[sigB];
    if (sigDiff !== 0) return sigDiff;
    return a.orb - b.orb;
  });

  // Only show top transits unless showAll is true
  const displayTransits = showAll ? sortedTransits : sortedTransits.slice(0, 8);

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <div className="text-xs text-slate-500">
          {transits.length} transit{transits.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {displayTransits.map((transit, idx) => {
          const transitBodyInfo = getBodyInfo(transit.transitPlanet);
          const natalBodyInfo = getBodyInfo(transit.natalPlanet);
          const aspectInfo = getAspectInfo(transit.aspect);
          const transitSignInfo = getSignInfo(transit.transitSign);
          const natalSignInfo = getSignInfo(transit.natalSign);
          const colors = ASPECT_COLORS[transit.aspect];
          const significance = getTransitSignificance(transit.transitPlanet, transit.natalPlanet);

          return (
            <div
              key={`${transit.transitPlanet}-${transit.natalPlanet}-${idx}`}
              className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Transit planet */}
                  <div className="flex items-center gap-1">
                    <span className="text-xl">{transitBodyInfo?.symbol}</span>
                    <span className="text-sm text-slate-300">{transitBodyInfo?.name}</span>
                    <span className="text-sm text-slate-500">
                      {transitSignInfo?.symbol}
                    </span>
                  </div>

                  {/* Aspect symbol */}
                  <span className={`text-xl ${colors.text}`}>{aspectInfo?.symbol}</span>

                  {/* Natal planet */}
                  <div className="flex items-center gap-1">
                    <span className="text-xl">{natalBodyInfo?.symbol}</span>
                    <span className="text-sm text-slate-300">{natalBodyInfo?.name}</span>
                    <span className="text-sm text-slate-500">
                      {natalSignInfo?.symbol}
                    </span>
                  </div>
                </div>

                {/* Significance indicator */}
                {significance === 'high' && (
                  <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                    Major
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400">
                  <span className={colors.text}>
                    {aspectInfo?.name}
                  </span>
                  <span className="font-mono">
                    {transit.orb.toFixed(1)}° orb
                  </span>
                  <span>
                    {transit.applying ? '→ applying' : '← separating'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!showAll && transits.length > 8 && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          + {transits.length - 8} more transits
        </p>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-green-400">△</span>
            <span className="text-slate-500">Harmonious</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-400">□</span>
            <span className="text-slate-500">Challenging</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">☌</span>
            <span className="text-slate-500">Intensifying</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveTransits;
