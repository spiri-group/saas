'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card as CardUI } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Trash2, Edit, RotateCcw, Calendar, Layers } from 'lucide-react';
import { DailyCardPull, useDeleteCardPull } from '../hooks';
import { format, parseISO } from 'date-fns';

interface CardPullHistoryProps {
  pulls: DailyCardPull[];
  onEdit?: (pull: DailyCardPull) => void;
  isLoading?: boolean;
}

interface CardPullCardProps {
  pull: DailyCardPull;
  onEdit?: (pull: DailyCardPull) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const CardPullCard: React.FC<CardPullCardProps> = ({
  pull,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [expanded, setExpanded] = useState(false);

  const hasCardInterpretations = pull.cards.some(c => c.interpretation);

  return (
    <CardUI className="bg-white/5 border-white/20 overflow-hidden" data-testid={`card-pull-${pull.id}`}>
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => hasCardInterpretations && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(pull.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <Layers className="w-4 h-4" />
              <span>{pull.deck}</span>
            </div>

            {/* Cards preview */}
            <div className="flex flex-wrap gap-2">
              {pull.cards.map((card, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded-md text-sm ${
                    card.reversed
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/10 text-slate-300 border border-white/20'
                  }`}
                >
                  {card.reversed && <RotateCcw className="w-3 h-3 inline mr-1" />}
                  {card.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {hasCardInterpretations && (
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

      {/* Expanded details - per-card interpretations */}
      {expanded && hasCardInterpretations && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-4">
          {pull.cards.filter(c => c.interpretation).map((card, idx) => (
            <div key={idx} className="pl-3 border-l-2 border-purple-500/30">
              <span className="text-sm font-medium text-purple-300">
                {card.name}
                {card.reversed && <span className="text-slate-500 ml-1">(reversed)</span>}
              </span>
              <p className="text-slate-300 text-sm mt-1">{card.interpretation}</p>
            </div>
          ))}
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
              onEdit(pull);
            }}
            className="text-slate-400 hover:text-white hover:bg-white/10"
            data-testid={`edit-pull-${pull.id}`}
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
            data-testid={`delete-pull-${pull.id}`}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>
    </CardUI>
  );
};

const CardPullHistory: React.FC<CardPullHistoryProps> = ({
  pulls,
  onEdit,
  isLoading,
}) => {
  const deleteMutation = useDeleteCardPull();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (pull: DailyCardPull) => {
    if (!confirm('Are you sure you want to delete this card pull? This cannot be undone.')) {
      return;
    }

    setDeletingId(pull.id);
    try {
      await deleteMutation.mutateAsync({ id: pull.id, userId: pull.userId });
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

  if (pulls.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No card pulls yet</p>
        <p className="text-sm mt-1">Record your first card pull above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="card-pull-history">
      {pulls.map((pull) => (
        <CardPullCard
          key={pull.id}
          pull={pull}
          onEdit={onEdit}
          onDelete={() => handleDelete(pull)}
          isDeleting={deletingId === pull.id}
        />
      ))}
    </div>
  );
};

export default CardPullHistory;
