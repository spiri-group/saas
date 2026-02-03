'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card as CardUI } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Trash2, Edit, RotateCcw, Calendar, Layers, ExternalLink, Pencil, Sparkles } from 'lucide-react';
import { ReadingEntry, useDeleteCardPull } from '../hooks';
import { SOURCE_OPTIONS, EXTERNAL_PLATFORMS } from '../types';
import { format, parseISO } from 'date-fns';

// Support both old DailyCardPull and new ReadingEntry
type Entry = ReadingEntry;

interface CardPullHistoryProps {
  pulls: Entry[];
  onEdit?: (pull: Entry) => void;
  isLoading?: boolean;
}

interface CardPullCardProps {
  pull: Entry;
  onEdit?: (pull: Entry) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

// Helper to get source display info
const getSourceDisplay = (entry: Entry) => {
  const sourceType = entry.sourceType || 'SELF';
  const sourceOption = SOURCE_OPTIONS.find(o => o.key === sourceType);

  if (sourceType === 'SELF') {
    return {
      icon: sourceOption?.icon || '🃏',
      label: entry.sourceDetails?.deck || 'My deck',
      sublabel: null,
    };
  }

  if (sourceType === 'EXTERNAL') {
    const platform = EXTERNAL_PLATFORMS.find(p => p.key === entry.sourceDetails?.platform);
    return {
      icon: platform?.icon || '📱',
      label: platform?.label || 'External',
      sublabel: entry.sourceDetails?.readerName || entry.sourceDetails?.channelName || null,
    };
  }

  if (sourceType === 'SPIRIVERSE') {
    return {
      icon: sourceOption?.icon || '✨',
      label: 'SpiriVerse',
      sublabel: entry.sourceDetails?.practitionerName || null,
    };
  }

  return { icon: '🃏', label: 'Reading', sublabel: null };
};

const CardPullCard: React.FC<CardPullCardProps> = ({
  pull,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = pull.cards.some(c => c.interpretation) || pull.firstImpression || pull.question;
  const sourceDisplay = getSourceDisplay(pull);

  // Check if reading needs reflection (has cards but no interpretations/reflections)
  const hasAnyReflection = pull.cards.some(c => c.interpretation) || pull.firstImpression || pull.reflection || pull.question;
  const needsReflection = pull.cards.length > 0 && !hasAnyReflection;

  return (
    <CardUI className="bg-white/5 border-white/20 overflow-hidden" data-testid={`reading-entry-${pull.id}`}>
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(pull.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            {/* Source info */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <span>{sourceDisplay.icon}</span>
              <span>{sourceDisplay.label}</span>
              {sourceDisplay.sublabel && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-purple-400">{sourceDisplay.sublabel}</span>
                </>
              )}
              {pull.sourceDetails?.sourceUrl && (
                <a
                  href={pull.sourceDetails.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Question if present */}
            {pull.question && (
              <p className="text-sm text-slate-400 italic mb-2">&quot;{pull.question}&quot;</p>
            )}

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

            {/* Symbols preview */}
            {pull.symbols && pull.symbols.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {pull.symbols.slice(0, 5).map((symbol, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                  >
                    {symbol.name}
                  </span>
                ))}
                {pull.symbols.length > 5 && (
                  <span className="text-xs text-slate-500">+{pull.symbols.length - 5} more</span>
                )}
              </div>
            )}

            {/* Resonance score */}
            {pull.resonanceScore && (
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-2 h-2 rounded-full ${
                      n <= pull.resonanceScore! ? 'bg-purple-500' : 'bg-slate-700'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1">resonance</span>
              </div>
            )}

            {/* Reflection status badge */}
            {needsReflection ? (
              <div className="flex items-center gap-1.5 mt-2 text-amber-400/80" data-testid="needs-reflection-badge">
                <Pencil className="w-3 h-3" />
                <span className="text-xs">Add your reflections</span>
              </div>
            ) : hasAnyReflection && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" data-testid="reflected-badge">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Reflection Complete</span>
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
          {/* First impression */}
          {pull.firstImpression && (
            <div className="pl-3 border-l-2 border-purple-500/30">
              <span className="text-xs font-medium text-slate-500 uppercase">First Impression</span>
              <p className="text-slate-300 text-sm mt-1">{pull.firstImpression}</p>
            </div>
          )}

          {/* Per-card interpretations */}
          {pull.cards.filter(c => c.interpretation).map((card, idx) => (
            <div key={idx} className="pl-3 border-l-2 border-indigo-500/30">
              <span className="text-sm font-medium text-indigo-300">
                {card.name}
                {card.reversed && <span className="text-slate-500 ml-1">(reversed)</span>}
              </span>
              <p className="text-slate-300 text-sm mt-1">{card.interpretation}</p>
            </div>
          ))}

          {/* Reflection */}
          {pull.reflection && (
            <div className="pl-3 border-l-2 border-slate-500/30">
              <span className="text-xs font-medium text-slate-500 uppercase">Reflection</span>
              <p className="text-slate-300 text-sm mt-1">{pull.reflection}</p>
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
              onEdit(pull);
            }}
            className="text-slate-400 hover:text-white hover:bg-white/10"
            data-testid={`edit-entry-${pull.id}`}
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
            data-testid={`delete-entry-${pull.id}`}
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

  const handleDelete = async (pull: Entry) => {
    if (!confirm('Are you sure you want to delete this reading? This cannot be undone.')) {
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
        <p className="text-lg">No readings logged yet</p>
        <p className="text-sm mt-1">Record your first reading - from your deck, TikTok, or anywhere!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="reading-history">
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
