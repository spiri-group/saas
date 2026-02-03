'use client';

import { Droplets, Zap, Moon, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CrystalCleansingLog, CLEANSING_METHODS, CHARGING_METHODS } from '../types';

interface CleansingHistoryProps {
  logs: CrystalCleansingLog[];
  isLoading: boolean;
  onDelete: (log: CrystalCleansingLog) => void;
}

const CleansingHistory: React.FC<CleansingHistoryProps> = ({
  logs,
  isLoading,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
        <p className="text-slate-400 text-sm">Loading cleansing history...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
          <Droplets className="w-6 h-6 text-blue-400/50" />
        </div>
        <h3 className="text-white font-medium mb-1">No Cleansing Sessions</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Log your first crystal cleansing session to start tracking.
        </p>
      </div>
    );
  }

  const getMethodLabel = (method: string) => {
    return CLEANSING_METHODS.find(m => m.key === method)?.label || method;
  };

  const getChargingLabel = (method?: string) => {
    if (!method) return null;
    return CHARGING_METHODS.find(m => m.key === method)?.label || method;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
          data-testid={`cleansing-log-${log.id}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Droplets className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{getMethodLabel(log.method)}</p>
                <p className="text-slate-400 text-xs">{formatDate(log.date)}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(log)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Crystals */}
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-1">Crystals</p>
            <div className="flex flex-wrap gap-1">
              {log.crystalNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Details Row */}
          <div className="flex flex-wrap gap-3 text-sm">
            {log.duration && (
              <span className="text-slate-400">
                {log.duration} min
              </span>
            )}
            {log.moonPhase && (
              <span className="text-slate-400 flex items-center gap-1">
                <Moon className="w-3 h-3" />
                {log.moonPhase.replace('_', ' ')}
              </span>
            )}
            {log.didCharge && (
              <span className="text-yellow-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Charged
                {log.chargingMethod && ` (${getChargingLabel(log.chargingMethod)})`}
              </span>
            )}
          </div>

          {/* Intention */}
          {log.intention && (
            <div className="mt-3 p-2 bg-white/5 rounded">
              <p className="text-xs text-slate-400 mb-1">Intention</p>
              <p className="text-slate-300 text-sm italic">&quot;{log.intention}&quot;</p>
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-slate-400 text-sm">{log.notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CleansingHistory;
