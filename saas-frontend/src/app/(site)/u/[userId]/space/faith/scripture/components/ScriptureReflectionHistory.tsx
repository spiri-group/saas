'use client';

import { format } from 'date-fns';
import { Edit2, Trash2, BookOpen, MessageSquare, HelpCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScriptureReflection, useDeleteScriptureReflection } from '../../hooks';

interface Props {
  reflections: ScriptureReflection[];
  onEdit: (reflection: ScriptureReflection) => void;
  onView?: (reflection: ScriptureReflection) => void;
  isLoading: boolean;
  userId: string;
}

const BOOK_TYPE_LABELS: Record<string, string> = {
  old_testament: 'Old Testament',
  new_testament: 'New Testament',
  psalms: 'Psalms',
  proverbs: 'Proverbs',
  gospels: 'Gospels',
  epistles: 'Epistles',
  prophets: 'Prophets',
  wisdom: 'Wisdom',
  other: 'Other',
};

export const ScriptureReflectionHistory: React.FC<Props> = ({ reflections, onEdit, onView, isLoading, userId }) => {
  const deleteMutation = useDeleteScriptureReflection();

  const handleDelete = async (reflection: ScriptureReflection) => {
    if (confirm('Are you sure you want to delete this reflection?')) {
      await deleteMutation.mutateAsync({ id: reflection.id, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/5 rounded-xl h-32" />
        ))}
      </div>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No scripture reflections yet.</p>
        <p className="text-sm mt-1">Start recording what you read and what speaks to you!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reflections.map((reflection) => (
        <div
          key={reflection.id}
          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
          data-testid={`scripture-reflection-${reflection.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  {reflection.reference}
                </Badge>
                {reflection.bookType && BOOK_TYPE_LABELS[reflection.bookType] && (
                  <Badge variant="outline" className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                    {BOOK_TYPE_LABELS[reflection.bookType]}
                  </Badge>
                )}
                {reflection.version && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {reflection.version}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                <span>{format(new Date(reflection.date), 'MMM d, yyyy')}</span>
                {reflection.readingContext && (
                  <span className="text-slate-500">{reflection.readingContext}</span>
                )}
              </div>

              {reflection.text && (
                <p className="text-slate-400 text-sm italic border-l-2 border-emerald-500/30 pl-3 mb-3 line-clamp-2">
                  &ldquo;{reflection.text}&rdquo;
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300 text-sm line-clamp-2">{reflection.whatSpokeToMe}</p>
                </div>

                {reflection.personalApplication && (
                  <p className="text-slate-400 text-sm">
                    <span className="text-slate-500">Apply:</span> {reflection.personalApplication}
                  </p>
                )}
              </div>

              {reflection.questions && reflection.questions.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <HelpCircle className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-500">
                    {reflection.questions.length} question{reflection.questions.length !== 1 ? 's' : ''} to explore
                  </span>
                </div>
              )}

              {reflection.crossReferences && reflection.crossReferences.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {reflection.crossReferences.map((ref, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-white/5">
                      {ref}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 ml-4">
              {onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(reflection)}
                  className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                  data-testid={`view-scripture-reflection-${reflection.id}`}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(reflection)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                data-testid={`edit-scripture-reflection-${reflection.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(reflection)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                data-testid={`delete-scripture-reflection-${reflection.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
