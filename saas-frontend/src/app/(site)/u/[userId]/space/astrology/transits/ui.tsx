'use client';

import { Orbit, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCurrentTransits } from '../_hooks/useTransits';
import {
  MoonPhaseCard,
  CurrentPositions,
  ActiveTransits,
  UpcomingTransits,
  GeneralTransits
} from '../_components';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const { data: transitData, isLoading, error, refetch, isFetching } = useCurrentTransits({
    userId,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen-minus-nav flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen-minus-nav flex flex-col p-6">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl text-white mb-2">Failed to Load Transits</h2>
            <p className="text-slate-400 mb-4">Unable to calculate current planetary positions</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const transits = transitData?.transits;
  const hasBirthChart = transitData?.hasBirthChart;

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Orbit className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Transit Tracker</h1>
              <p className="text-slate-400 text-sm">
                {transits?.calculatedFor
                  ? `Planetary positions for ${new Date(transits.calculatedFor).toLocaleDateString(undefined, { dateStyle: 'long' })}`
                  : 'Track current planetary transits'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* No birth chart prompt */}
        {!hasBirthChart && (
          <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-amber-300 font-medium mb-1">
                  Add Your Birth Chart for Personalized Transits
                </h3>
                <p className="text-amber-200/70 text-sm mb-3">
                  Without your birth chart, we can only show general planetary positions.
                  Add your birth details to see how current transits affect your personal chart.
                </p>
                <Link href={`/u/${userId}/space/astrology/birth-chart`}>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
                    Create Birth Chart
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {transits && (
          <div className="space-y-6 overflow-y-auto flex-grow min-h-0 pb-6">
            {/* Layout differs based on whether user has birth chart */}
            {hasBirthChart ? (
              <>
                {/* WITH BIRTH CHART: 2-column grid layout */}
                {/* Top row: Moon Phase + Active Transits */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MoonPhaseCard moonPhase={transits.moonPhase} />
                  {transits.activeTransits && transits.activeTransits.length > 0 && (
                    <ActiveTransits
                      transits={transits.activeTransits}
                      title="Active Now"
                    />
                  )}
                </div>

                {/* Second row: Current Sky + Upcoming */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CurrentPositions planets={transits.planets} />
                  {transits.upcomingTransits && (
                    <UpcomingTransits transits={transits.upcomingTransits} />
                  )}
                </div>

                {/* All Transits to Natal */}
                {transits.transitsToNatal && transits.transitsToNatal.length > 0 && (
                  <ActiveTransits
                    transits={transits.transitsToNatal}
                    title="All Transits to Your Chart"
                    showAll
                  />
                )}

                {/* General transits at bottom */}
                {transits.generalTransits && transits.generalTransits.length > 0 && (
                  <GeneralTransits transits={transits.generalTransits} />
                )}
              </>
            ) : (
              <>
                {/* NO BIRTH CHART: Compact moon + 2-column layout */}
                {/* Compact Moon Phase banner at top */}
                <MoonPhaseCard moonPhase={transits.moonPhase} compact />

                {/* World Transits + Current Sky side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* World Transits - the main content for beginners */}
                  {transits.generalTransits && transits.generalTransits.length > 0 && (
                    <GeneralTransits transits={transits.generalTransits} />
                  )}

                  {/* Current Sky - reference info */}
                  <CurrentPositions planets={transits.planets} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UI;
