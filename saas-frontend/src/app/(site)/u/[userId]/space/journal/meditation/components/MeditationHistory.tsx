'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Trash2, Edit, Calendar, Clock, Wind } from 'lucide-react';
import { MeditationJournalEntry, useDeleteMeditation } from '../hooks';
import { MEDITATION_TECHNIQUES, MEDITATION_MOODS } from '../types';
import { format, parseISO } from 'date-fns';

interface MeditationHistoryProps {
  meditations: MeditationJournalEntry[];
  onEdit?: (meditation: MeditationJournalEntry) => void;
  isLoading?: boolean;
}

interface MeditationCardProps {
  meditation: MeditationJournalEntry;
  onEdit?: (meditation: MeditationJournalEntry) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const getTechniqueLabel = (key?: string) => {
  if (!key) return null;
  return MEDITATION_TECHNIQUES.find(t => t.key === key)?.label || key;
};

const getMoodLabel = (key?: string) => {
  if (!key) return null;
  return MEDITATION_MOODS.find(m => m.key === key)?.label || key;
};

const MeditationCard: React.FC<MeditationCardProps> = ({
  meditation,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = meditation.insights || meditation.experiences || meditation.intentions;

  return (
    <Card className="bg-white/5 border-white/20 overflow-hidden" data-testid={`meditation-${meditation.id}`}>
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(meditation.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="flex items-center gap-1 text-white">
                <Clock className="w-4 h-4 text-teal-400" />
                {meditation.duration} min
              </span>
              {meditation.technique && (
                <span className="px-2 py-1 rounded-md text-sm bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {getTechniqueLabel(meditation.technique)}
                </span>
              )}
            </div>

            {/* Mood indicators */}
            {(meditation.preSessionMood || meditation.postSessionMood) && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                {meditation.preSessionMood && (
                  <span className="px-2 py-0.5 rounded bg-slate-700/50">
                    Before: {getMoodLabel(meditation.preSessionMood)}
                  </span>
                )}
                {meditation.preSessionMood && meditation.postSessionMood && (
                  <span className="text-slate-500">→</span>
                )}
                {meditation.postSessionMood && (
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                    After: {getMoodLabel(meditation.postSessionMood)}
                  </span>
                )}
              </div>
            )}

            {/* Depth and Distraction */}
            {(meditation.depth || meditation.distractionLevel) && (
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                {meditation.depth && (
                  <span>Depth: {meditation.depth}/5</span>
                )}
                {meditation.distractionLevel && (
                  <span>Distraction: {meditation.distractionLevel}/5</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {hasDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white p-1 h-auto"
              >
                {expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-4">
          {meditation.insights && (
            <div className="pl-3 border-l-2 border-teal-500/30">
              <span className="text-sm font-medium text-teal-300">Insights</span>
              <p className="text-slate-300 text-sm mt-1">{meditation.insights}</p>
            </div>
          )}
          {meditation.experiences && (
            <div className="pl-3 border-l-2 border-cyan-500/30">
              <span className="text-sm font-medium text-cyan-300">Experiences</span>
              <p className="text-slate-300 text-sm mt-1">{meditation.experiences}</p>
            </div>
          )}
          {meditation.intentions && (
            <div className="pl-3 border-l-2 border-purple-500/30">
              <span className="text-sm font-medium text-purple-300">Intentions</span>
              <p className="text-slate-300 text-sm mt-1">{meditation.intentions}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex justify-end gap-2">
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(meditation);
            }}
            className="text-slate-400 hover:text-white hover:bg-white/10"
            data-testid={`edit-meditation-${meditation.id}`}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
            data-testid={`delete-meditation-${meditation.id}`}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>
    </Card>
  );
};

const MeditationHistory: React.FC<MeditationHistoryProps> = ({
  meditations,
  onEdit,
  isLoading,
}) => {
  const deleteMutation = useDeleteMeditation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (meditation: MeditationJournalEntry) => {
    if (!confirm('Are you sure you want to delete this meditation session? This cannot be undone.')) {
      return;
    }

    setDeletingId(meditation.id);
    try {
      await deleteMutation.mutateAsync({ id: meditation.id, userId: meditation.userId });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-white/5 border border-white/20 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (meditations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Wind className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No meditation sessions yet</p>
        <p className="text-sm mt-1">Log your first session above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="meditation-history">
      {meditations.map((meditation) => (
        <MeditationCard
          key={meditation.id}
          meditation={meditation}
          onEdit={onEdit}
          onDelete={() => handleDelete(meditation)}
          isDeleting={deletingId === meditation.id}
        />
      ))}
    </div>
  );
};

export default MeditationHistory;
