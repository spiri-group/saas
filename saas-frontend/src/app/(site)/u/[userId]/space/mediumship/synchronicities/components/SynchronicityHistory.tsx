'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, MapPin, Star, RefreshCw, ChevronRight } from 'lucide-react';
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
import { Synchronicity, useDeleteSynchronicity } from '../../hooks';

interface Props {
  entries: Synchronicity[];
  onEdit: (entry: Synchronicity) => void;
  onView?: (entry: Synchronicity) => void;
  isLoading: boolean;
  userId: string;
}

export const SynchronicityHistory: React.FC<Props> = ({
  entries,
  onEdit,
  onView,
  isLoading,
  userId,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteSynchronicity();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync({ id: deleteId, userId });
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return null; // Parent handles loading state
  }

  if (entries.length === 0) {
    return null; // Parent handles empty state
  }

  // Group entries by month
  const groupedEntries = entries.reduce((acc, entry) => {
    const monthKey = format(new Date(entry.date), 'MMMM yyyy');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {} as Record<string, Synchronicity[]>);

  return (
    <>
      <div className="divide-y divide-white/5">
        {Object.entries(groupedEntries).map(([month, monthEntries]) => (
          <div key={month}>
            <div className="px-4 py-2 bg-slate-800/30 text-xs text-slate-500 font-medium">
              {month}
            </div>
            {monthEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onView?.(entry)}
                className="w-full p-4 hover:bg-white/5 transition-colors text-left group"
              >
                <div className="flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500/60 group-hover:bg-purple-400 transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{entry.title}</h3>
                          {entry.recurringTheme && (
                            <RefreshCw className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-1 mb-2">
                          {entry.description}
                        </p>
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

                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatDistanceToNow(new Date(entry.date), { addSuffix: true })}</span>
                      {entry.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entry.location}
                        </span>
                      )}
                      {entry.significanceScore && entry.significanceScore >= 7 && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-3 h-3 fill-current" />
                          High significance
                        </span>
                      )}
                    </div>

                    {/* Symbols */}
                    {entry.symbols && entry.symbols.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.symbols.slice(0, 4).map((symbol, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-purple-500/10 text-purple-300 text-xs">
                            {symbol.name}
                          </Badge>
                        ))}
                        {entry.symbols.length > 4 && (
                          <Badge variant="secondary" className="bg-slate-700 text-slate-400 text-xs">
                            +{entry.symbols.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this synchronicity?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This moment will be removed from your log. This cannot be undone.
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
