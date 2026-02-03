'use client';

import { Gem, MapPin, Sparkles, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CrystalCompanionLog } from '../types';

interface CompanionCardProps {
  companion: CrystalCompanionLog | null;
  isLoading: boolean;
  onSetCompanion: () => void;
  onEditCompanion: (companion: CrystalCompanionLog) => void;
}

const CompanionCard: React.FC<CompanionCardProps> = ({
  companion,
  isLoading,
  onSetCompanion,
  onEditCompanion,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl animate-pulse">
        <div className="h-5 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-white/10 rounded w-full mb-2"></div>
        <div className="h-4 bg-white/10 rounded w-2/3"></div>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Today&apos;s Companion</h3>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Which crystal is journeying with you today?
        </p>

        <Button
          onClick={onSetCompanion}
          className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/30"
          data-testid="set-companion-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Choose Today&apos;s Companion
        </Button>
      </div>
    );
  }

  return (
    <div
      className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl group"
      data-testid="companion-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Today&apos;s Companion</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditCompanion(companion)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white h-8 w-8 p-0"
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Crystal Icon */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <Gem className="w-7 h-7 text-purple-400" />
        </div>

        {/* Crystal Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-lg font-medium truncate">
            {companion.crystalName}
          </h4>
          {companion.location && (
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <MapPin className="w-3 h-3" />
              <span>{companion.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Intention */}
      {companion.intention && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Intention</p>
          <p className="text-slate-300 text-sm italic">&quot;{companion.intention}&quot;</p>
        </div>
      )}

      {/* Reason */}
      {companion.reason && (
        <div className="mt-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Why this crystal?</p>
          <p className="text-slate-400 text-sm">{companion.reason}</p>
        </div>
      )}

      {/* Change Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSetCompanion}
        className="w-full mt-4 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
      >
        Change Today&apos;s Companion
      </Button>
    </div>
  );
};

export default CompanionCard;
