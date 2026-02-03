'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, CheckCircle2, MessageCircle, Eye, Ear, Heart, Brain, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { SpiritMessage, useDeleteSpiritMessage, ReceptionMethod, SpiritSource } from '../../hooks';

interface Props {
  entries: SpiritMessage[];
  onEdit: (entry: SpiritMessage) => void;
  onView?: (entry: SpiritMessage) => void;
  isLoading: boolean;
  userId: string;
}

const SOURCE_LABELS: Record<SpiritSource, string> = {
  guide: 'Spirit Guide',
  loved_one: 'Loved One',
  angel: 'Angel',
  ancestor: 'Ancestor',
  higher_self: 'Higher Self',
  unknown: 'Unknown',
  collective: 'Collective',
  nature_spirit: 'Nature Spirit',
  other: 'Other',
};

const METHOD_ICONS: Record<ReceptionMethod, React.ReactNode> = {
  clairvoyance: <Eye className="w-3.5 h-3.5" />,
  clairaudience: <Ear className="w-3.5 h-3.5" />,
  clairsentience: <Heart className="w-3.5 h-3.5" />,
  claircognizance: <Brain className="w-3.5 h-3.5" />,
  dreams: <Sparkles className="w-3.5 h-3.5" />,
  meditation: <Sparkles className="w-3.5 h-3.5" />,
  automatic_writing: <MessageCircle className="w-3.5 h-3.5" />,
  pendulum: <MessageCircle className="w-3.5 h-3.5" />,
  cards: <MessageCircle className="w-3.5 h-3.5" />,
  signs: <Sparkles className="w-3.5 h-3.5" />,
  other: <MessageCircle className="w-3.5 h-3.5" />,
};

const METHOD_LABELS: Record<ReceptionMethod, string> = {
  clairvoyance: 'Clairvoyance',
  clairaudience: 'Clairaudience',
  clairsentience: 'Clairsentience',
  claircognizance: 'Claircognizance',
  dreams: 'Dreams',
  meditation: 'Meditation',
  automatic_writing: 'Automatic Writing',
  pendulum: 'Pendulum',
  cards: 'Cards',
  signs: 'Signs',
  other: 'Other',
};

export const SpiritMessageHistory: React.FC<Props> = ({
  entries,
  onEdit,
  onView,
  isLoading,
  userId,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteSpiritMessage();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync({ id: deleteId, userId });
      setDeleteId(null);
    }
  };

  // Group messages by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, SpiritMessage[]> = {};
    entries.forEach(entry => {
      const monthKey = format(new Date(entry.date), 'MMMM yyyy');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(entry);
    });
    return groups;
  }, [entries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <MessageCircle className="relative w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <MessageCircle className="w-10 h-10 text-indigo-400/30 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          No messages recorded yet. Start by documenting your first spirit communication.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-white/5">
        {Object.entries(groupedByMonth).map(([month, monthEntries]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="px-4 py-2 bg-slate-800/30">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{month}</span>
            </div>

            {/* Entries for this month */}
            {monthEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onView?.(entry)}
                className="group w-full text-left px-4 py-4 hover:bg-indigo-500/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Method Icon */}
                  <div className="flex-shrink-0 p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    {METHOD_ICONS[entry.receptionMethod]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.sourceName ? (
                        <span className="text-rose-400 text-sm font-medium">
                          {entry.sourceName}
                        </span>
                      ) : (
                        <span className="text-indigo-400 text-sm font-medium">
                          {SOURCE_LABELS[entry.source]}
                        </span>
                      )}
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        {METHOD_LABELS[entry.receptionMethod]}
                      </span>
                      {entry.validated && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-xs py-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validated
                        </Badge>
                      )}
                    </div>

                    <p className="text-white text-sm line-clamp-2 mb-2">
                      &ldquo;{entry.messageContent}&rdquo;
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{format(new Date(entry.date), 'MMM d')}</span>
                      {entry.clarity && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/50" />
                          Clarity {entry.clarity}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(entry);
                      }}
                      className="text-slate-400 hover:text-white h-7 w-7"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(entry.id);
                      }}
                      className="text-slate-400 hover:text-red-400 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-indigo-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove this message?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the spirit message from your journal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
