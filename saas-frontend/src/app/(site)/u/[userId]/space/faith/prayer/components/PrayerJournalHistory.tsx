'use client';

import { format } from 'date-fns';
import { Edit2, Trash2, BookHeart, CheckCircle2, User, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PrayerJournalEntry, useDeletePrayerEntry, useMarkPrayerAnswered } from '../../hooks';

interface Props {
  entries: PrayerJournalEntry[];
  onEdit: (entry: PrayerJournalEntry) => void;
  isLoading: boolean;
  userId: string;
}

const PRAYER_TYPE_LABELS: Record<string, string> = {
  praise: 'Praise',
  thanksgiving: 'Thanksgiving',
  petition: 'Petition',
  intercession: 'Intercession',
  confession: 'Confession',
  meditation: 'Meditation',
  contemplation: 'Contemplation',
  devotional: 'Devotional',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  waiting: { label: 'Waiting', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ongoing: { label: 'Ongoing', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  answered: { label: 'Answered', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  answered_differently: { label: 'Answered Differently', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
};

export const PrayerJournalHistory: React.FC<Props> = ({ entries, onEdit, isLoading, userId }) => {
  const deleteMutation = useDeletePrayerEntry();
  const markAnsweredMutation = useMarkPrayerAnswered();

  const handleDelete = async (entry: PrayerJournalEntry) => {
    if (confirm('Are you sure you want to delete this prayer entry?')) {
      await deleteMutation.mutateAsync({ id: entry.id, userId });
    }
  };

  const handleMarkAnswered = async (entry: PrayerJournalEntry) => {
    const description = prompt('How was this prayer answered? (optional)');
    await markAnsweredMutation.mutateAsync({
      id: entry.id,
      userId,
      answeredDate: new Date().toISOString().split('T')[0],
      answerDescription: description || undefined,
    });
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

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <BookHeart className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No prayer entries yet.</p>
        <p className="text-sm mt-1">Start recording your conversations with God!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
          data-testid={`prayer-entry-${entry.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {PRAYER_TYPE_LABELS[entry.prayerType] || entry.prayerType}
                </Badge>
                {entry.status && STATUS_LABELS[entry.status] && (
                  <Badge variant="outline" className={STATUS_LABELS[entry.status].color}>
                    {entry.status === 'answered' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {STATUS_LABELS[entry.status].label}
                  </Badge>
                )}
                {entry.isPrivate && (
                  <Badge variant="outline" className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                    Private
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                <span>{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                {entry.prayingFor && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.prayingFor}
                  </span>
                )}
                {entry.scriptureReference && (
                  <span className="flex items-center gap-1">
                    <Book className="w-3 h-3" />
                    {entry.scriptureReference}
                  </span>
                )}
              </div>

              {entry.title && (
                <h3 className="text-white font-medium mb-1">{entry.title}</h3>
              )}

              <p className="text-slate-300 text-sm line-clamp-2 mb-2">{entry.content}</p>

              {entry.requests && entry.requests.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {entry.requests.slice(0, 3).map((request, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-white/5">
                      {request}
                    </Badge>
                  ))}
                  {entry.requests.length > 3 && (
                    <Badge variant="outline" className="text-xs bg-white/5">
                      +{entry.requests.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {entry.insights && (
                <p className="text-slate-400 text-sm italic">
                  <span className="text-slate-500">Insights:</span> {entry.insights}
                </p>
              )}

              {entry.answerDescription && (
                <p className="text-green-400/80 text-sm mt-2">
                  <span className="text-green-500">Answer:</span> {entry.answerDescription}
                </p>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entry.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs text-slate-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 ml-4">
              {entry.status !== 'answered' && entry.status !== 'answered_differently' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMarkAnswered(entry)}
                  disabled={markAnsweredMutation.isPending}
                  className="h-8 w-8 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                  title="Mark as answered"
                  data-testid={`mark-answered-${entry.id}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(entry)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                data-testid={`edit-prayer-entry-${entry.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(entry)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                data-testid={`delete-prayer-entry-${entry.id}`}
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
