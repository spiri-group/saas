'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  userId: string;
}

const SpiriReadingsBanner: React.FC<Props> = ({ userId }) => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/u/${userId}/space/readings/request`)}
      data-testid="spirreadings-banner"
      className="w-full p-5 rounded-2xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 border border-purple-500/30 hover:border-purple-400/50 transition-all group cursor-pointer text-left mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white group-hover:text-purple-200 transition-colors">
              SpiriReadings
            </h2>
            <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
              Get a tarot reading from a gifted practitioner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
          <span className="text-sm font-medium hidden sm:block">Request Reading</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
};

export default SpiriReadingsBanner;
