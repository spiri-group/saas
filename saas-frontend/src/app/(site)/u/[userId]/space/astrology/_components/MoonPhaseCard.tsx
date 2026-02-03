'use client';

import { MoonPhaseInfo, getMoonPhaseInfo } from '../_hooks/useTransits';
import { getSignInfo } from '../_hooks/useBirthChart';

interface Props {
  moonPhase: MoonPhaseInfo;
  compact?: boolean;
}

export const MoonPhaseCard: React.FC<Props> = ({ moonPhase, compact = false }) => {
  const phaseInfo = getMoonPhaseInfo(moonPhase.phase);
  const signInfo = getSignInfo(moonPhase.sign);

  if (compact) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-4">
          {/* Moon visual */}
          <div className="text-4xl" title={phaseInfo?.name}>
            {phaseInfo?.symbol}
          </div>

          {/* Phase info */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg text-white font-medium">{phaseInfo?.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-300">{signInfo?.symbol} {signInfo?.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-400 text-sm">{moonPhase.illumination}%</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {phaseInfo?.description}
            </p>
          </div>

          {/* Next phase */}
          <div className="hidden sm:block text-right flex-shrink-0">
            <div className="text-xs text-slate-500">Next</div>
            <div className="text-sm text-slate-300">{getMoonPhaseInfo(moonPhase.nextPhase)?.symbol} {new Date(moonPhase.nextPhaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Moon Phase</h3>
        <div className="text-xs text-slate-400">
          {moonPhase.illumination}% illuminated
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Moon visual */}
        <div className="flex-shrink-0">
          <div className="text-6xl" title={phaseInfo?.name}>
            {phaseInfo?.symbol}
          </div>
        </div>

        {/* Phase info */}
        <div className="flex-grow">
          <div className="text-xl text-white font-medium mb-1">
            {phaseInfo?.name}
          </div>
          <div className="flex items-center gap-2 text-slate-300 mb-2">
            <span className="text-xl">{signInfo?.symbol}</span>
            <span>Moon in {signInfo?.name}</span>
          </div>
          <p className="text-sm text-slate-400">
            {phaseInfo?.description}
          </p>
        </div>
      </div>

      {/* Next phase */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Next: {getMoonPhaseInfo(moonPhase.nextPhase)?.name}</span>
          <span className="text-slate-500">
            {new Date(moonPhase.nextPhaseDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MoonPhaseCard;
