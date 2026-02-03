'use client';

import { Sun, Moon, Sunrise, HelpCircle } from 'lucide-react';
import { BirthChart, getSignInfo } from '../_hooks/useBirthChart';

interface Props {
  chart: BirthChart;
}

export const BigThree: React.FC<Props> = ({ chart }) => {
  const sunInfo = getSignInfo(chart.sunSign);
  const moonInfo = getSignInfo(chart.moonSign);
  const risingInfo = chart.risingSign ? getSignInfo(chart.risingSign) : null;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Sun Sign */}
      <div className="p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-5 h-5 text-amber-400" />
          <span className="text-slate-400 text-sm font-medium">Sun</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl">{sunInfo?.symbol}</span>
          <span className="text-xl text-white font-medium">{sunInfo?.name}</span>
        </div>
        <p className="text-slate-400 text-xs mt-2">
          Your core identity and life purpose
        </p>
      </div>

      {/* Moon Sign */}
      <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-5 h-5 text-blue-400" />
          <span className="text-slate-400 text-sm font-medium">Moon</span>
          {chart.moonMayBeInaccurate && (
            <span title="May be inaccurate - birth time unknown">
              <HelpCircle className="w-4 h-4 text-orange-400" />
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl">{moonInfo?.symbol}</span>
          <span className="text-xl text-white font-medium">{moonInfo?.name}</span>
        </div>
        <p className="text-slate-400 text-xs mt-2">
          Your emotional nature and inner self
        </p>
        {chart.moonMayBeInaccurate && (
          <p className="text-orange-400/70 text-xs mt-1">
            May have changed signs that day
          </p>
        )}
      </div>

      {/* Rising Sign */}
      <div className={`p-4 border rounded-xl ${
        risingInfo
          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30'
          : 'bg-slate-800/50 border-white/10'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Sunrise className={`w-5 h-5 ${risingInfo ? 'text-purple-400' : 'text-slate-500'}`} />
          <span className="text-slate-400 text-sm font-medium">Rising</span>
          {chart.housesAreApproximate && risingInfo && (
            <span className="text-xs text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">~</span>
          )}
        </div>
        {risingInfo ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl">{risingInfo.symbol}</span>
              <span className="text-xl text-white font-medium">{risingInfo.name}</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              How others see you at first
            </p>
            {chart.housesAreApproximate && (
              <p className="text-amber-400/70 text-xs mt-1">
                Based on approximate birth time
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-slate-500 text-lg">Unknown</div>
            <p className="text-slate-500 text-xs mt-2">
              Requires birth time to calculate
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BigThree;
