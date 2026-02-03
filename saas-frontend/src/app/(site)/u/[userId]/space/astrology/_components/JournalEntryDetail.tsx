'use client';

import { useState } from 'react';
import { ArrowLeft, Edit, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AstrologyJournalEntry,
  getMoodInfo,
} from '../_hooks/useAstrologyJournal';
import { getSignInfo, getBodyInfo, getAspectInfo } from '../_hooks/useBirthChart';
import { getMoonPhaseInfo } from '../_hooks/useTransits';

interface Props {
  entry: AstrologyJournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export const JournalEntryDetail: React.FC<Props> = ({
  entry,
  onBack,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const moonSignInfo = getSignInfo(entry.transitSnapshot.moonSign);
  const moonPhaseInfo = getMoonPhaseInfo(entry.transitSnapshot.moonPhase);
  const moodInfo = entry.mood ? getMoodInfo(entry.mood) : null;

  const handleDelete = async () => {
    await onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          data-testid="back-to-list-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to entries</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-slate-400 hover:text-white"
            data-testid="edit-entry-btn"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            data-testid="delete-entry-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Entry metadata */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          {new Date(entry.createdAt).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        {moodInfo && (
          <span className="px-3 py-1 bg-slate-800 rounded-full text-slate-300 flex items-center gap-1">
            <span>{moodInfo.emoji}</span>
            <span>{moodInfo.name}</span>
          </span>
        )}
      </div>

      {/* Transit Snapshot Card */}
      <div className="backdrop-blur-xl bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Sky at time of writing</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Moon */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <span className="text-2xl">{moonPhaseInfo?.symbol}</span>
            </div>
            <div>
              <div className="text-white font-medium">{entry.transitSnapshot.moonPhaseName}</div>
              <div className="text-sm text-slate-400">
                {moonSignInfo?.symbol} Moon in {moonSignInfo?.name}
              </div>
            </div>
          </div>

          {/* Retrograde Planets */}
          {entry.transitSnapshot.retrogradePlanets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <RotateCcw className="w-4 h-4" />
                <span>Retrograde</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.transitSnapshot.retrogradePlanets.map(planet => {
                  const info = getBodyInfo(planet);
                  return (
                    <span key={planet} className="text-slate-300 text-sm">
                      {info?.symbol} {info?.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Active Transits */}
        {entry.transitSnapshot.activeTransits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Active Transits</div>
            <div className="space-y-1">
              {entry.transitSnapshot.activeTransits.map((transit, idx) => {
                const transitInfo = getBodyInfo(transit.transitingBody);
                const natalInfo = getBodyInfo(transit.natalBody);
                const aspectInfo = getAspectInfo(transit.aspect);
                return (
                  <div key={idx} className="text-sm text-slate-300">
                    {transitInfo?.symbol} {transitInfo?.name} {aspectInfo?.symbol}{' '}
                    {natalInfo?.symbol} {natalInfo?.name}
                    <span className="text-slate-500 ml-2">({transit.orb.toFixed(1)}° orb)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Entry Content */}
      <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">
            {entry.content}
          </p>
        </div>
      </div>

      {/* Planetary Themes */}
      {entry.planetaryThemes.length > 0 && (
        <div>
          <h3 className="text-sm text-slate-400 mb-2">Tagged Themes</h3>
          <div className="flex flex-wrap gap-2">
            {entry.planetaryThemes.map(planet => {
              const info = getBodyInfo(planet);
              return (
                <span
                  key={planet}
                  className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-purple-300"
                >
                  {info?.symbol} {info?.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Prompt shown */}
      {entry.promptShown && (
        <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
          <div className="text-xs text-purple-400 mb-1">Prompt</div>
          <p className="text-sm text-purple-300 italic">{entry.promptShown}</p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Journal Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JournalEntryDetail;
