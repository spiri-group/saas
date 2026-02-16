'use client';

import { useState, useMemo } from 'react';
import { Dumbbell, Plus, Target, Clock, Flame, Zap, Award, ChevronRight, RefreshCw, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, differenceInDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import useDevelopmentExercises, { DevelopmentExercise } from '../hooks/useDevelopmentExercises';
import { ExerciseForm } from './components/ExerciseForm';
import { ExerciseHistory } from './components/ExerciseHistory';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<DevelopmentExercise | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<DevelopmentExercise | null>(null);

  const { data: exercises, isLoading } = useDevelopmentExercises(userId);

  const handleEdit = (exercise: DevelopmentExercise) => {
    setEditingExercise(exercise);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingExercise(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExercise(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!exercises || exercises.length === 0) return null;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const thisWeek = exercises.filter(e =>
      isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
    ).length;

    const withAccuracy = exercises.filter(e => e.accuracy !== undefined && e.accuracy !== null);
    const avgAccuracy = withAccuracy.length
      ? Math.round(withAccuracy.reduce((sum, e) => sum + (e.accuracy || 0), 0) / withAccuracy.length)
      : 0;

    const totalMinutes = exercises.reduce((sum, e) => sum + (e.duration || 0), 0);
    const favoriteExercises = exercises.filter(e => e.willRepeat);

    // Calculate streak (consecutive days with exercises)
    let streak = 0;
    const sortedDates = [...new Set(exercises.map(e => format(new Date(e.date), 'yyyy-MM-dd')))].sort().reverse();
    if (sortedDates.length > 0) {
      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd');
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = differenceInDays(new Date(sortedDates[i-1]), new Date(sortedDates[i]));
          if (diff === 1) streak++;
          else break;
        }
      }
    }

    // Most practiced exercise type
    const typeCounts: Record<string, number> = {};
    exercises.forEach(e => {
      typeCounts[e.exerciseType] = (typeCounts[e.exerciseType] || 0) + 1;
    });
    const mostPracticed = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: exercises.length,
      thisWeek,
      avgAccuracy,
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60,
      favorites: favoriteExercises.length,
      streak,
      mostPracticed: mostPracticed ? { type: mostPracticed[0], count: mostPracticed[1] } : null,
    };
  }, [exercises]);

  // Most recent exercise
  const mostRecent = exercises?.[0];

  // Exercises marked to repeat
  const toRepeat = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter(e => e.willRepeat).slice(0, 3);
  }, [exercises]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Energetic Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-cyan-500/20">
            <Dumbbell className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Development Practice</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Track your exercises, measure your progress, and strengthen your abilities
          </p>
        </div>

        {/* Empty State */}
        {!isLoading && (!exercises || exercises.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-cyan-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-4 mb-3">
                  <Target className="w-8 h-8 text-cyan-400/40" />
                  <Zap className="w-8 h-8 text-teal-400/40" />
                  <Flame className="w-8 h-8 text-emerald-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Begin Your Training</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Like any skill, mediumship develops through consistent practice. Log your exercises,
              track your accuracy, and watch your abilities grow.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:scale-105"
              data-testid="new-exercise-button"
            >
              <Dumbbell className="w-5 h-5 mr-2" />
              Log Your First Exercise
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && exercises && exercises.length > 0 && (
          <>
            {/* Streak and Motivation Banner */}
            {stats && stats.streak >= 2 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 rounded-2xl border border-orange-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-xl">
                    <Flame className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-orange-400">{stats.streak}</span>
                      <span className="text-white font-medium">Day Streak!</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Consistency builds ability. Keep it going!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action + Last Session */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Log New */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-cyan-600/20 to-teal-600/20 rounded-2xl border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02] text-left"
                data-testid="new-exercise-button"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/30 rounded-lg group-hover:bg-cyan-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-cyan-300" />
                  </div>
                  <span className="text-white font-medium">Log Exercise</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Record a new practice session
                </p>
              </button>

              {/* Last Session Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedExercise(mostRecent)}
                  className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Last session: {format(new Date(mostRecent.date), 'MMM d')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h3 className="text-white font-medium mb-1">{mostRecent.exerciseName}</h3>
                  <div className="flex items-center gap-3 text-sm">
                    {mostRecent.duration && (
                      <span className="text-slate-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {mostRecent.duration} min
                      </span>
                    )}
                    {mostRecent.accuracy !== undefined && mostRecent.accuracy !== null && (
                      <span className="text-cyan-400">
                        <Target className="w-3 h-3 inline mr-1" />
                        {mostRecent.accuracy}% accuracy
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Dumbbell className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs">Total Sessions</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Zap className="w-4 h-4 text-teal-400" />
                    <span className="text-xs">This Week</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs">Avg Accuracy</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">{stats.avgAccuracy}%</div>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs">Practice Time</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalHours}h {stats.totalMinutes > 0 ? `${stats.totalMinutes}m` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Exercises to Repeat */}
            {toRepeat.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-2xl border border-teal-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-teal-400" />
                  </div>
                  <h3 className="text-white font-medium">Marked to Practice Again</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {toRepeat.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedExercise(e)}
                      className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-full text-sm transition-colors"
                    >
                      {e.exerciseName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exercise History */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Practice Log</h2>
              </div>
              <ExerciseHistory
                exercises={exercises}
                onEdit={handleEdit}
                onView={setSelectedExercise}
                isLoading={isLoading}
                userId={userId}
              />
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
              <Dumbbell className="relative w-12 h-12 text-cyan-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your practice log...</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="border-cyan-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-cyan-400" />
              {editingExercise ? 'Edit Exercise' : 'Log Practice Session'}
            </DialogTitle>
          </DialogHeader>

          <ExerciseForm
            userId={userId}
            existingExercise={editingExercise}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="border-cyan-500/20 sm:max-w-lg">
          {selectedExercise && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedExercise.date), 'MMMM d, yyyy')}
                  </div>
                  {selectedExercise.willRepeat && (
                    <Badge variant="secondary" className="bg-teal-500/20 text-teal-400">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Repeat
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedExercise.exerciseName}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Stats Row */}
                <div className="flex items-center gap-4 text-sm">
                  {selectedExercise.duration && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-4 h-4" />
                      {selectedExercise.duration} minutes
                    </div>
                  )}
                  {selectedExercise.accuracy !== undefined && selectedExercise.accuracy !== null && (
                    <div className="flex items-center gap-1 text-cyan-400 font-medium">
                      <Target className="w-4 h-4" />
                      {selectedExercise.accuracy}% accuracy
                    </div>
                  )}
                  {selectedExercise.difficulty && (
                    <Badge variant="outline" className={`text-xs ${
                      selectedExercise.difficulty === 'beginner' ? 'text-green-400 border-green-400/30' :
                      selectedExercise.difficulty === 'intermediate' ? 'text-yellow-400 border-yellow-400/30' :
                      'text-red-400 border-red-400/30'
                    }`}>
                      {selectedExercise.difficulty}
                    </Badge>
                  )}
                </div>

                {/* Results */}
                {selectedExercise.results && (
                  <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                    <div className="text-sm text-cyan-400 mb-1">Results</div>
                    <p className="text-slate-300 text-sm">{selectedExercise.results}</p>
                  </div>
                )}

                {/* Hits */}
                {selectedExercise.hits && selectedExercise.hits.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                      <Award className="w-3 h-3 text-green-400" />
                      Hits
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedExercise.hits.map((hit, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-500/10 text-green-300 rounded-full text-sm">
                          {hit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Misses */}
                {selectedExercise.misses && selectedExercise.misses.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-500 mb-2">Misses</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedExercise.misses.map((miss, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-700/50 text-slate-400 rounded-full text-sm">
                          {miss}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {selectedExercise.insights && (
                  <Panel dark className="p-4 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Insights
                    </div>
                    <p className="text-slate-300 text-sm italic">{selectedExercise.insights}</p>
                  </Panel>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedExercise(null);
                      handleEdit(selectedExercise);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedExercise(null)}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
