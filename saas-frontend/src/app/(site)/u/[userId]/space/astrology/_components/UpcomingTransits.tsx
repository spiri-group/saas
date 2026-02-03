'use client';

import { Calendar } from 'lucide-react';
import { UpcomingTransit, ASPECT_COLORS, getTransitSignificance } from '../_hooks/useTransits';
import { getBodyInfo, getAspectInfo } from '../_hooks/useBirthChart';

interface Props {
  transits: UpcomingTransit[];
}

export const UpcomingTransits: React.FC<Props> = ({ transits }) => {
  if (!transits || transits.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-medium text-white mb-4">Upcoming Transits</h3>
        <p className="text-slate-500 text-center py-8">
          No major transits in the next 7 days
        </p>
      </div>
    );
  }

  // Sort by days until exact
  const sortedTransits = [...transits].sort((a, b) => a.daysUntilExact - b.daysUntilExact);

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-medium text-white">Upcoming Transits</h3>
        </div>
        <div className="text-xs text-slate-500">
          Next 7 days
        </div>
      </div>

      <div className="space-y-2">
        {sortedTransits.map((transit, idx) => {
          const transitBodyInfo = getBodyInfo(transit.transitPlanet);
          const natalBodyInfo = getBodyInfo(transit.natalPlanet);
          const aspectInfo = getAspectInfo(transit.aspect);
          const colors = ASPECT_COLORS[transit.aspect];
          const significance = getTransitSignificance(transit.transitPlanet, transit.natalPlanet);

          const exactDate = new Date(transit.exactDate);
          const isToday = transit.daysUntilExact < 1;
          const isTomorrow = transit.daysUntilExact >= 1 && transit.daysUntilExact < 2;

          return (
            <div
              key={`${transit.transitPlanet}-${transit.natalPlanet}-${idx}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {/* Date indicator */}
              <div className="flex-shrink-0 w-14 text-center">
                {isToday ? (
                  <span className="text-xs font-medium text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
                    Today
                  </span>
                ) : isTomorrow ? (
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                    Tomorrow
                  </span>
                ) : (
                  <div className="text-xs text-slate-400">
                    <div className="font-medium">
                      {exactDate.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className="text-slate-500">
                      {exactDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>

              {/* Transit info */}
              <div className="flex-grow flex items-center gap-2">
                <span className="text-lg">{transitBodyInfo?.symbol}</span>
                <span className={`text-lg ${colors.text}`}>{aspectInfo?.symbol}</span>
                <span className="text-lg">{natalBodyInfo?.symbol}</span>
                <span className="text-sm text-slate-400 ml-1">
                  {transitBodyInfo?.name} {aspectInfo?.name} {natalBodyInfo?.name}
                </span>
              </div>

              {/* Significance */}
              {significance === 'high' && (
                <span className="flex-shrink-0 text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                  Major
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Exact aspect dates when transits perfect to your natal positions
      </p>
    </div>
  );
};

export default UpcomingTransits;
