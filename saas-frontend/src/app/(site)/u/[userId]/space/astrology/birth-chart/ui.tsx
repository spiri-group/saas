'use client';

import { useState } from 'react';
import { Sun, Edit, Calendar, MapPin, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBirthChart, getSignInfo } from '../_hooks/useBirthChart';
import { BirthChartForm, BigThree, PlanetPlacements, AspectsList } from '../_components';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { data: chart, isLoading } = useBirthChart(userId);

  const handleFormSuccess = () => {
    setShowEditDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen-minus-nav flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // No chart yet - show creation form
  if (!chart) {
    return (
      <div className="min-h-screen-minus-nav flex flex-col p-6">
        <div className="flex-grow min-h-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">My Birth Chart</h1>
              <p className="text-slate-400 text-sm">Calculate your natal chart</p>
            </div>
          </div>

          {/* Creation Form */}
          <div className="max-w-2xl mx-auto w-full">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-xl font-medium text-white mb-2">
                  Enter Your Birth Details
                </h2>
                <p className="text-slate-400 text-sm">
                  Your birth chart reveals the positions of the planets at the moment you were born.
                  This information is used across your astrology features.
                </p>
              </div>

              <BirthChartForm
                userId={userId}
                onSuccess={handleFormSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chart exists - show display
  const sunInfo = getSignInfo(chart.sunSign);

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">My Birth Chart</h1>
              <p className="text-slate-400 text-sm">
                {sunInfo?.symbol} {sunInfo?.name} Sun
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowEditDialog(true)}
            className="border-white/20 text-slate-300 hover:bg-white/10"
            data-testid="edit-chart-btn"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Birth Data
          </Button>
        </div>

        {/* Birth Info Summary */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(chart.birthDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span>
              {chart.birthTimePrecision === 'exact' && chart.birthTime
                ? chart.birthTime
                : chart.birthTimePrecision === 'approximate'
                ? `~${chart.birthTimeApproximate}`
                : 'Unknown time'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="w-4 h-4" />
            <span>{chart.birthLocation.city}, {chart.birthLocation.country}</span>
          </div>
        </div>

        {/* Chart Content */}
        <div className="space-y-6 overflow-y-auto flex-grow min-h-0 pb-6">
          {/* Big Three */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-medium text-white mb-4">Your Big Three</h2>
            <BigThree chart={chart} />
          </div>

          {/* Planet Placements */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <PlanetPlacements chart={chart} />
          </div>

          {/* Aspects */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <AspectsList chart={chart} />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              Edit Birth Chart Data
            </DialogTitle>
          </DialogHeader>

          <BirthChartForm
            userId={userId}
            existingChart={chart}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
