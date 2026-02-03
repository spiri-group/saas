'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Clock, Target, RefreshCw, Dumbbell, ChevronRight } from 'lucide-react';
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
import { DevelopmentExercise, useDeleteDevelopmentExercise, ExerciseType } from '../../hooks';

interface Props {
  exercises: DevelopmentExercise[];
  onEdit: (exercise: DevelopmentExercise) => void;
  onView?: (exercise: DevelopmentExercise) => void;
  isLoading: boolean;
  userId: string;
}

const TYPE_LABELS: Record<ExerciseType, string> = {
  meditation: 'Meditation',
  visualization: 'Visualization',
  psychometry: 'Psychometry',
  remote_viewing: 'Remote Viewing',
  aura_reading: 'Aura Reading',
  symbol_work: 'Symbol Work',
  automatic_writing: 'Auto Writing',
  pendulum: 'Pendulum',
  card_practice: 'Card Practice',
  sitting_in_power: 'Sitting in Power',
  other: 'Other',
};

const TYPE_ICONS: Record<ExerciseType, string> = {
  meditation: 'bg-purple-500/20 text-purple-400',
  visualization: 'bg-indigo-500/20 text-indigo-400',
  psychometry: 'bg-amber-500/20 text-amber-400',
  remote_viewing: 'bg-blue-500/20 text-blue-400',
  aura_reading: 'bg-rose-500/20 text-rose-400',
  symbol_work: 'bg-orange-500/20 text-orange-400',
  automatic_writing: 'bg-emerald-500/20 text-emerald-400',
  pendulum: 'bg-violet-500/20 text-violet-400',
  card_practice: 'bg-pink-500/20 text-pink-400',
  sitting_in_power: 'bg-cyan-500/20 text-cyan-400',
  other: 'bg-slate-500/20 text-slate-400',
};

export const ExerciseHistory: React.FC<Props> = ({
  exercises,
  onEdit,
  onView,
  isLoading,
  userId,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteDevelopmentExercise();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync({ id: deleteId, userId });
      setDeleteId(null);
    }
  };

  // Group exercises by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, DevelopmentExercise[]> = {};
    exercises.forEach(exercise => {
      const monthKey = format(new Date(exercise.date), 'MMMM yyyy');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(exercise);
    });
    return groups;
  }, [exercises]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
          <Dumbbell className="relative w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Dumbbell className="w-10 h-10 text-cyan-400/30 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          No exercises logged yet. Start building your practice!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-white/5">
        {Object.entries(groupedByMonth).map(([month, monthExercises]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="px-4 py-2 bg-slate-800/30">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{month}</span>
            </div>

            {/* Exercises for this month */}
            {monthExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => onView?.(exercise)}
                className="group w-full text-left px-4 py-4 hover:bg-cyan-500/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Type Icon */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${TYPE_ICONS[exercise.exerciseType]}`}>
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{exercise.exerciseName}</span>
                      {exercise.willRepeat && (
                        <Badge variant="secondary" className="bg-teal-500/10 text-teal-400 text-xs py-0">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Repeat
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mb-2">
                      {TYPE_LABELS[exercise.exerciseType]}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{format(new Date(exercise.date), 'MMM d')}</span>
                      {exercise.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {exercise.duration} min
                        </span>
                      )}
                      {exercise.accuracy !== undefined && exercise.accuracy !== null && (
                        <span className="flex items-center gap-1 text-cyan-400 font-medium">
                          <Target className="w-3 h-3" />
                          {exercise.accuracy}%
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
                        onEdit(exercise);
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
                        setDeleteId(exercise.id);
                      }}
                      className="text-slate-400 hover:text-red-400 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-cyan-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove this exercise?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the exercise from your practice log. This action cannot be undone.
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
