'use client';

import { useState, useMemo } from 'react';
import { BookMarked, Plus, Star, CheckCircle2, Clock, User, ChevronRight, Sparkles, Calendar, Heart, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import useReadingReflections, { ReadingReflection } from '../hooks/useReadingReflections';
import { ReflectionForm } from './components/ReflectionForm';
import { ReflectionHistory } from './components/ReflectionHistory';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingReflection, setEditingReflection] = useState<ReadingReflection | null>(null);
  const [selectedReflection, setSelectedReflection] = useState<ReadingReflection | null>(null);

  const { data: reflections, isLoading } = useReadingReflections(userId);

  const handleEdit = (reflection: ReadingReflection) => {
    setEditingReflection(reflection);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingReflection(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReflection(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!reflections || reflections.length === 0) return null;

    const withRating = reflections.filter(r => r.overallRating);
    const avgRating = withRating.length
      ? (withRating.reduce((sum, r) => sum + (r.overallRating || 0), 0) / withRating.length).toFixed(1)
      : '0';

    const validated = reflections.filter(r => r.validatedLater).length;

    const withAccuracy = reflections.filter(r => r.accuracyScore !== undefined && r.accuracyScore !== null);
    const avgAccuracy = withAccuracy.length
      ? Math.round(withAccuracy.reduce((sum, r) => sum + (r.accuracyScore || 0), 0) / withAccuracy.length)
      : null;

    // Favorite readers (those with highest ratings)
    const readerRatings: Record<string, { total: number; count: number }> = {};
    reflections.forEach(r => {
      if (r.readerName && r.overallRating) {
        if (!readerRatings[r.readerName]) readerRatings[r.readerName] = { total: 0, count: 0 };
        readerRatings[r.readerName].total += r.overallRating;
        readerRatings[r.readerName].count += 1;
      }
    });
    const topReaders = Object.entries(readerRatings)
      .map(([name, data]) => ({ name, avg: data.total / data.count, count: data.count }))
      .filter(r => r.count >= 1)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);

    return {
      total: reflections.length,
      avgRating,
      validated,
      avgAccuracy,
      topReaders,
    };
  }, [reflections]);

  // Most recent reflection
  const mostRecent = reflections?.[0];

  // Recently validated readings
  const recentlyValidated = useMemo(() => {
    if (!reflections) return [];
    return reflections.filter(r => r.validatedLater).slice(0, 3);
  }, [reflections]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Contemplative Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-fuchsia-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-violet-500/20">
            <BookMarked className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Session Reflections</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Reflect on readings you&apos;ve received and track what resonates over time
          </p>
        </div>

        {/* Empty State */}
        {!isLoading && (!reflections || reflections.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-2xl" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-violet-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-4 mb-3">
                  <Star className="w-8 h-8 text-violet-400/40" />
                  <Quote className="w-8 h-8 text-purple-400/40" />
                  <Heart className="w-8 h-8 text-fuchsia-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Your Reading Journal</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              After receiving readings from mediums or psychics, reflect on the experience here.
              Over time, you&apos;ll see which messages validated and which readers resonate with you.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 hover:scale-105"
              data-testid="new-reflection-button"
            >
              <BookMarked className="w-5 h-5 mr-2" />
              Add Your First Reflection
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && reflections && reflections.length > 0 && (
          <>
            {/* Validation Celebration */}
            {recentlyValidated.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 rounded-2xl border border-green-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Readings Validated</h3>
                    <p className="text-slate-400 text-sm">
                      {recentlyValidated.length === 1
                        ? `Your reading with ${recentlyValidated[0].readerName} has been validated by events.`
                        : `${recentlyValidated.length} of your readings have been validated over time.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action + Last Reading */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Add New */}
              <button
                onClick={() => setShowForm(true)}
                className="group p-6 bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-2xl border border-violet-500/30 hover:border-violet-500/50 transition-all hover:scale-[1.02] text-left"
                data-testid="new-reflection-button"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-violet-500/30 rounded-lg group-hover:bg-violet-500/40 transition-colors">
                    <Plus className="w-5 h-5 text-violet-300" />
                  </div>
                  <span className="text-white font-medium">Add Reflection</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Record a reading you&apos;ve received
                </p>
              </button>

              {/* Last Reading Card */}
              {mostRecent && (
                <button
                  onClick={() => setSelectedReflection(mostRecent)}
                  className="group p-6 bg-slate-800/50 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-all text-left col-span-1 md:col-span-2"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Last reading: {format(new Date(mostRecent.date), 'MMM d')}</span>
                      {mostRecent.validatedLater && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validated
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-violet-400" />
                    <span className="text-white font-medium">{mostRecent.readerName}</span>
                    {mostRecent.readingType && (
                      <Badge variant="outline" className="text-violet-400/80 border-violet-400/20 text-xs">
                        {mostRecent.readingType}
                      </Badge>
                    )}
                  </div>
                  {mostRecent.mainMessages && (
                    <p className="text-slate-400 text-sm line-clamp-1">
                      {mostRecent.mainMessages}
                    </p>
                  )}
                </button>
              )}
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <BookMarked className="w-4 h-4 text-violet-400" />
                    <span className="text-xs">Total Readings</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs">Avg Rating</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.avgRating}/5</div>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs">Validated</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{stats.validated}</div>
                </div>
                {stats.avgAccuracy !== null && (
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs">Avg Accuracy</span>
                    </div>
                    <div className="text-2xl font-bold text-violet-400">{stats.avgAccuracy}%</div>
                  </div>
                )}
              </div>
            )}

            {/* Top Readers */}
            {stats && stats.topReaders.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl border border-violet-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Star className="w-4 h-4 text-violet-400" />
                  </div>
                  <h3 className="text-white font-medium">Your Top Readers</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {stats.topReaders.map((reader) => (
                    <div
                      key={reader.name}
                      className="px-4 py-2 bg-violet-500/10 rounded-lg border border-violet-500/20"
                    >
                      <span className="text-white text-sm font-medium">{reader.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-400 text-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          {reader.avg.toFixed(1)}
                        </span>
                        <span className="text-slate-500 text-xs">
                          ({reader.count} {reader.count === 1 ? 'reading' : 'readings'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflection History */}
            <div className="bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-medium">Reading Journal</h2>
              </div>
              <ReflectionHistory
                reflections={reflections}
                onEdit={handleEdit}
                onView={setSelectedReflection}
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
              <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
              <BookMarked className="relative w-12 h-12 text-violet-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your reflections...</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="border-violet-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-violet-400" />
              {editingReflection ? 'Edit Reflection' : 'Reflect on a Reading'}
            </DialogTitle>
          </DialogHeader>

          <ReflectionForm
            userId={userId}
            existingReflection={editingReflection}
            onSuccess={handleFormSuccess}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedReflection} onOpenChange={(open) => !open && setSelectedReflection(null)}>
        <DialogContent className="border-violet-500/20 sm:max-w-lg">
          {selectedReflection && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedReflection.date), 'MMMM d, yyyy')}
                  </div>
                  {selectedReflection.validatedLater && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Validated
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-violet-400" />
                  <DialogTitle className="text-xl">{selectedReflection.readerName}</DialogTitle>
                </div>
                {selectedReflection.readingType && (
                  <Badge variant="outline" className="w-fit mt-1 text-violet-400 border-violet-400/30">
                    {selectedReflection.readingType}
                  </Badge>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Stats Row */}
                <div className="flex items-center gap-4 text-sm">
                  {selectedReflection.duration && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-4 h-4" />
                      {selectedReflection.duration} min
                    </div>
                  )}
                  {selectedReflection.overallRating && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      {selectedReflection.overallRating}/5
                    </div>
                  )}
                  {selectedReflection.accuracyScore !== undefined && selectedReflection.accuracyScore !== null && (
                    <div className="flex items-center gap-1 text-violet-400">
                      <Sparkles className="w-4 h-4" />
                      {selectedReflection.accuracyScore}% accuracy
                    </div>
                  )}
                </div>

                {/* Main Messages */}
                {selectedReflection.mainMessages && (
                  <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <div className="text-sm text-violet-400 mb-1">Key Messages</div>
                    <p className="text-slate-300 text-sm">{selectedReflection.mainMessages}</p>
                  </div>
                )}

                {/* What Resonated */}
                {selectedReflection.resonatedWith && selectedReflection.resonatedWith.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                      <Heart className="w-3 h-3 text-green-400" />
                      What Resonated
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedReflection.resonatedWith.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-500/10 text-green-300 rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What Didn't Resonate */}
                {selectedReflection.didntResonate && selectedReflection.didntResonate.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-500 mb-2">Didn&apos;t Resonate</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedReflection.didntResonate.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-700/50 text-slate-400 rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotional Impact */}
                {selectedReflection.emotionalImpact && (
                  <Panel dark className="p-4 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">Emotional Impact</div>
                    <p className="text-slate-300 text-sm italic">{selectedReflection.emotionalImpact}</p>
                  </Panel>
                )}

                {/* Validation Notes */}
                {selectedReflection.validatedLater && (
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="text-sm text-green-400 mb-1">How It Validated</div>
                    <p className="text-slate-300 text-sm">{selectedReflection.validatedLater}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedReflection(null);
                      handleEdit(selectedReflection);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedReflection(null)}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
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
