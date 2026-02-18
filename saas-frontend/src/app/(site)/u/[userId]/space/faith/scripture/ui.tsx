'use client';

import { useState, useMemo } from 'react';
import { BookOpen, History, Plus, Clock, Bookmark, Sparkles, Heart, Cross, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import useScriptureReflections, { ScriptureReflection } from '../hooks/useScriptureReflections';
import { ScriptureReflectionForm } from './components/ScriptureReflectionForm';
import { ScriptureReflectionHistory } from './components/ScriptureReflectionHistory';
import { format, formatDistanceToNow } from 'date-fns';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScriptureReflection | null>(null);
  const [viewingEntry, setViewingEntry] = useState<ScriptureReflection | null>(null);

  const { data: reflections, isLoading } = useScriptureReflections(userId);

  const handleEdit = (entry: ScriptureReflection) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleView = (entry: ScriptureReflection) => {
    setViewingEntry(entry);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  // Calculate stats
  const thisWeekEntries = reflections?.filter(e => {
    const entryDate = new Date(e.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  }).length || 0;

  const uniqueBooks = new Set(reflections?.map(r => r.book).filter(Boolean)).size;

  // Calculate insights
  const insights = useMemo(() => {
    if (!reflections || reflections.length === 0) return null;

    const totalReflections = reflections.length;

    // Most studied book
    const bookCounts: Record<string, number> = {};
    reflections.forEach(r => {
      if (r.book) {
        bookCounts[r.book] = (bookCounts[r.book] || 0) + 1;
      }
    });
    const topBook = Object.entries(bookCounts).sort((a, b) => b[1] - a[1])[0];

    // Recent activity
    const lastReflection = reflections[0];
    const daysSinceLastReflection = lastReflection
      ? Math.floor((Date.now() - new Date(lastReflection.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Milestone checks
    const milestones = [
      { count: 100, message: 'A hundred reflections deep in His word!' },
      { count: 50, message: 'Fifty reflections — a faithful student of scripture!' },
      { count: 25, message: 'Twenty-five reflections on your journey!' },
      { count: 10, message: 'Ten reflections — building a beautiful habit!' },
      { count: 5, message: 'Five reflections — you&apos;re on your way!' },
    ];
    const currentMilestone = milestones.find(m => totalReflections >= m.count);

    return {
      totalReflections,
      topBook: topBook ? { name: topBook[0], count: topBook[1] } : null,
      daysSinceLastReflection,
      currentMilestone,
      isActive: daysSinceLastReflection !== null && daysSinceLastReflection <= 7,
    };
  }, [reflections]);

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-teal-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-green-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-4xl mx-auto lg:max-w-none relative z-10">
        {/* Centered Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/20 rounded-2xl mb-4">
            <Cross className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Scripture Reflections</h1>
          <p className="text-slate-400">Treasures hidden in His word, revealed to your heart</p>

          <div className="mt-6">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg px-6"
              data-testid="new-scripture-reflection-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Reflection
            </Button>
          </div>
        </div>

        {/* Milestone Celebration Banner */}
        {insights?.currentMilestone && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-300 font-medium">{insights.currentMilestone.message}</p>
                {insights.topBook && (
                  <p className="text-emerald-200/70 text-sm">
                    You&apos;ve studied {insights.topBook.name} the most ({insights.topBook.count} reflections)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {reflections && reflections.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Total</span>
              </div>
              <div className="text-2xl font-bold text-white">{reflections.length}</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">This Week</span>
              </div>
              <div className="text-2xl font-bold text-white">{thisWeekEntries}</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                <Bookmark className="w-4 h-4" />
                <span className="text-sm">Books</span>
              </div>
              <div className="text-2xl font-bold text-white">{uniqueBooks}</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                <Heart className="w-4 h-4" />
                <span className="text-sm">Avg/Week</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {reflections.length > 0 ? Math.round(reflections.length / Math.max(1, Math.ceil((Date.now() - new Date(reflections[reflections.length - 1]?.createdAt || Date.now()).getTime()) / (7 * 24 * 60 * 60 * 1000)))) : 0}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!reflections || reflections.length === 0) && !isLoading && (
          <div className="mb-6 p-8 rounded-xl bg-white/5 border border-white/10 text-center">
            <BookOpen className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Begin Your Scripture Journey</h3>
            <p className="text-slate-400 mb-4 max-w-md mx-auto">
              Record the passages that speak to your heart. Over time, you&apos;ll build a personal collection of spiritual insights and growth.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Write Your First Reflection
            </Button>
          </div>
        )}

        {/* History Section */}
        {reflections && reflections.length > 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-medium text-white">Reflection History</h2>
              </div>
              {insights && insights.daysSinceLastReflection !== null && insights.daysSinceLastReflection > 0 && (
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  Last reflection {insights.daysSinceLastReflection} day{insights.daysSinceLastReflection !== 1 ? 's' : ''} ago
                </Badge>
              )}
            </div>

            <ScriptureReflectionHistory
              reflections={reflections || []}
              onEdit={handleEdit}
              onView={handleView}
              isLoading={isLoading}
              userId={userId}
            />
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent dark={false} glass className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              {editingEntry ? 'Edit Reflection' : 'New Scripture Reflection'}
            </DialogTitle>
          </DialogHeader>

          <ScriptureReflectionForm
            userId={userId}
            existingEntry={editingEntry}
            onSuccess={handleFormSuccess}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)}>
        <DialogContent dark={false} glass className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Scripture Reflection
            </DialogTitle>
          </DialogHeader>

          {viewingEntry && (
            <div className="space-y-4">
              {/* Reference */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-emerald-400 font-semibold text-lg">
                  {viewingEntry.reference}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 text-sm">
                    {format(new Date(viewingEntry.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  {viewingEntry.version && (
                    <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {viewingEntry.version}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Scripture Text */}
              {viewingEntry.text && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Scripture</h4>
                  <blockquote className="text-black/90 border-l-2 border-emerald-500/50 pl-4 italic">
                    &ldquo;{viewingEntry.text}&rdquo;
                  </blockquote>
                </div>
              )}

              {/* What Spoke to Me */}
              {viewingEntry.whatSpokeToMe && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">What Spoke to You</h4>
                  <p className="text-black/70 whitespace-pre-wrap">{viewingEntry.whatSpokeToMe}</p>
                </div>
              )}

              {/* Application */}
              {viewingEntry.personalApplication && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Personal Application</h4>
                  <p className="text-black/70 whitespace-pre-wrap">{viewingEntry.personalApplication}</p>
                </div>
              )}

              {/* Questions */}
              {viewingEntry.questions && viewingEntry.questions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Questions to Explore</h4>
                  <ul className="space-y-1">
                    {viewingEntry.questions.map((q, i) => (
                      <li key={i} className="text-black/70 text-sm flex items-start gap-2">
                        <span className="text-emerald-400">•</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cross References */}
              {viewingEntry.crossReferences && viewingEntry.crossReferences.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Cross References</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingEntry.crossReferences.map((ref, i) => (
                      <Badge key={i} variant="outline" className="bg-black/5 text-black/70">
                        {ref}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Prayer Response */}
              {viewingEntry.prayerResponse && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Prayer Response</h4>
                  <p className="text-black/70 whitespace-pre-wrap italic">{viewingEntry.prayerResponse}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-black/10 text-sm text-black/50">
                Recorded {formatDistanceToNow(new Date(viewingEntry.createdAt), { addSuffix: true })}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setViewingEntry(null);
                    handleEdit(viewingEntry);
                  }}
                  variant="outline"
                  className="flex-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                >
                  Edit Reflection
                </Button>
                <Button
                  onClick={() => setViewingEntry(null)}
                  variant="ghost"
                  className="text-slate-400"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
