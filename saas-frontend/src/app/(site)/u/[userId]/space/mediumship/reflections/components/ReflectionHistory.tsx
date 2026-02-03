'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Star, Clock, CheckCircle2, BookMarked, User, ChevronRight } from 'lucide-react';
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
import { ReadingReflection, useDeleteReadingReflection } from '../../hooks';

interface Props {
  reflections: ReadingReflection[];
  onEdit: (reflection: ReadingReflection) => void;
  onView?: (reflection: ReadingReflection) => void;
  isLoading: boolean;
  userId: string;
}

export const ReflectionHistory: React.FC<Props> = ({
  reflections,
  onEdit,
  onView,
  isLoading,
  userId,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteReadingReflection();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync({ id: deleteId, userId });
      setDeleteId(null);
    }
  };

  // Group reflections by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, ReadingReflection[]> = {};
    reflections.forEach(reflection => {
      const monthKey = format(new Date(reflection.date), 'MMMM yyyy');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(reflection);
    });
    return groups;
  }, [reflections]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
          <BookMarked className="relative w-8 h-8 text-violet-400 animate-pulse" />
        </div>
      </div>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <BookMarked className="w-10 h-10 text-violet-400/30 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          No reflections yet. Add your first reading experience!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-white/5">
        {Object.entries(groupedByMonth).map(([month, monthReflections]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="px-4 py-2 bg-slate-800/30">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{month}</span>
            </div>

            {/* Reflections for this month */}
            {monthReflections.map((reflection) => (
              <button
                key={reflection.id}
                onClick={() => onView?.(reflection)}
                className="group w-full text-left px-4 py-4 hover:bg-violet-500/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Reader Icon */}
                  <div className="flex-shrink-0 p-2 bg-violet-500/10 rounded-lg text-violet-400">
                    <User className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{reflection.readerName}</span>
                      {reflection.readingType && (
                        <Badge variant="outline" className="text-violet-400/80 border-violet-400/20 text-xs py-0">
                          {reflection.readingType}
                        </Badge>
                      )}
                      {reflection.validatedLater && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-xs py-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validated
                        </Badge>
                      )}
                    </div>

                    {reflection.mainMessages && (
                      <p className="text-slate-400 text-sm line-clamp-1 mb-2">
                        {reflection.mainMessages}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{format(new Date(reflection.date), 'MMM d')}</span>
                      {reflection.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {reflection.duration} min
                        </span>
                      )}
                      {reflection.overallRating && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          {reflection.overallRating}/5
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
                        onEdit(reflection);
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
                        setDeleteId(reflection.id);
                      }}
                      className="text-slate-400 hover:text-red-400 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-violet-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove this reflection?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the reading reflection from your journal. This action cannot be undone.
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
