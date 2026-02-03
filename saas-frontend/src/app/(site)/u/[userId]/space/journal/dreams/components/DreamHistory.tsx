'use client';

import { useState } from 'react';
import { Edit2, Trash2, Moon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDeleteDream } from '../hooks/useDeleteDream';
import {
  DreamJournalEntry,
  formatDate,
  getMoodEmoji,
  getClarityLabel,
  getDreamTypeLabel,
  getCategoryColor,
} from '../types';

interface DreamHistoryProps {
  dreams: DreamJournalEntry[];
  onEdit: (dream: DreamJournalEntry) => void;
  isLoading: boolean;
  userId: string;
}

const DreamHistory: React.FC<DreamHistoryProps> = ({ dreams, onEdit, isLoading, userId }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteMutation = useDeleteDream();

  const handleDelete = async (dream: DreamJournalEntry) => {
    if (!confirm('Are you sure you want to delete this dream entry?')) return;

    try {
      const result = await deleteMutation.mutateAsync({ id: dream.id, userId });
      if (result.success) {
        toast.success('Dream deleted');
      } else {
        toast.error(result.message || 'Failed to delete dream');
      }
    } catch (error) {
      toast.error('Failed to delete dream');
      console.error(error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (dreams.length === 0) {
    return (
      <div className="text-center py-12">
        <Moon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">No dreams recorded yet</p>
        <p className="text-slate-500 text-sm">
          Start journaling your dreams to discover patterns and insights
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dreams.map((dream) => {
        const isExpanded = expandedId === dream.id;

        return (
          <div
            key={dream.id}
            className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden hover:border-purple-500/30 transition-colors"
          >
            {/* Header - Always Visible */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleExpand(dream.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getMoodEmoji(dream.mood)}</span>
                    <h3 className="text-white font-medium truncate">{dream.title}</h3>
                    {dream.isLucid && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        Lucid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span>{formatDate(dream.date)}</span>
                    {dream.dreamType && (
                      <>
                        <span>•</span>
                        <span>{getDreamTypeLabel(dream.dreamType)}</span>
                      </>
                    )}
                    {dream.clarity && (
                      <>
                        <span>•</span>
                        <span>{getClarityLabel(dream.clarity)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(dream);
                    }}
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dream);
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Tags Preview */}
              {dream.themes && dream.themes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dream.themes.slice(0, 4).map((theme) => (
                    <span
                      key={theme}
                      className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded"
                    >
                      {theme}
                    </span>
                  ))}
                  {dream.themes.length > 4 && (
                    <span className="px-2 py-0.5 text-slate-500 text-xs">
                      +{dream.themes.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-700/50 pt-4 space-y-4">
                {/* Dream Content */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Dream</h4>
                  <p className="text-slate-400 whitespace-pre-wrap">{dream.content}</p>
                </div>

                {/* Symbols - Enhanced with categories */}
                {dream.symbols && dream.symbols.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Symbols</h4>
                    <div className="flex flex-wrap gap-2">
                      {dream.symbols.map((symbol) => (
                        <span
                          key={symbol.name}
                          className={`px-2 py-1 text-sm rounded border ${getCategoryColor(symbol.category)}`}
                        >
                          {symbol.name}
                          {symbol.category && (
                            <span className="text-xs opacity-70 ml-1">
                              ({symbol.category.toLowerCase()})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interpretation */}
                {dream.interpretation && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Interpretation</h4>
                    <p className="text-slate-400 whitespace-pre-wrap">{dream.interpretation}</p>
                  </div>
                )}

                {/* Additional Details */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  {dream.sleepQuality && (
                    <span>Sleep Quality: {dream.sleepQuality}/5</span>
                  )}
                  {dream.wakeTime && (
                    <span>Woke at: {dream.wakeTime}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DreamHistory;
