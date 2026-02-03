'use client';

import { Globe } from 'lucide-react';
import { TransitToTransitAspect, ASPECT_COLORS, getWorldTransitDescription } from '../_hooks/useTransits';
import { getBodyInfo, getAspectInfo, getSignInfo } from '../_hooks/useBirthChart';

interface Props {
  transits: TransitToTransitAspect[];
}

export const GeneralTransits: React.FC<Props> = ({ transits }) => {
  if (!transits || transits.length === 0) {
    return null; // Don't show if no general transits
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-medium text-white">World Transits</h3>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Major aspects happening in the sky that affect everyone
      </p>

      <div className="space-y-3">
        {transits.map((transit, idx) => {
          const body1Info = getBodyInfo(transit.planet1);
          const body2Info = getBodyInfo(transit.planet2);
          const aspectInfo = getAspectInfo(transit.aspect);
          const sign1Info = getSignInfo(transit.planet1Sign);
          const sign2Info = getSignInfo(transit.planet2Sign);
          const colors = ASPECT_COLORS[transit.aspect];
          const description = getWorldTransitDescription(transit.planet1, transit.planet2, transit.aspect);

          return (
            <div
              key={`${transit.planet1}-${transit.planet2}-${idx}`}
              className={`rounded-lg border ${colors.bg} ${colors.border} p-3`}
            >
              {/* Planet row */}
              <div className="flex items-center gap-3 mb-2">
                {/* Planet 1 */}
                <div className="flex items-center gap-1">
                  <span className="text-xl">{body1Info?.symbol}</span>
                  <span className="text-sm text-slate-300 hidden sm:inline">{body1Info?.name}</span>
                  <span className="text-sm text-slate-500">{sign1Info?.symbol}</span>
                </div>

                {/* Aspect */}
                <span className={`text-xl ${colors.text}`}>{aspectInfo?.symbol}</span>

                {/* Planet 2 */}
                <div className="flex items-center gap-1">
                  <span className="text-xl">{body2Info?.symbol}</span>
                  <span className="text-sm text-slate-300 hidden sm:inline">{body2Info?.name}</span>
                  <span className="text-sm text-slate-500">{sign2Info?.symbol}</span>
                </div>

                {/* Orb */}
                <span className="ml-auto text-xs text-slate-500 font-mono">
                  {transit.orb.toFixed(1)}°
                </span>
              </div>

              {/* Description - always visible */}
              <p className="text-sm text-slate-300 leading-relaxed">
                {description}
              </p>

              {/* Exact date if available */}
              {transit.exactDate && (
                <p className="text-xs text-slate-500 mt-2">
                  {transit.applying ? 'Exact: ' : 'Was exact: '}
                  {new Date(transit.exactDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GeneralTransits;
