'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDreams } from '../journal/dreams/hooks/useDreams';
import useMeditations from '../journal/meditation/hooks/useMeditations';
import useCardPulls from '../readings/card-pulls/hooks/useCardPulls';
import { Moon, Wind, Layers, BookOpen, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JournalEntry {
  id: string;
  type: 'dream' | 'meditation' | 'card-pull';
  title: string;
  subtitle?: string;
  date: string;
  path: string;
}

interface Props {
  userId: string;
}

const JournalEntries: React.FC<Props> = ({ userId }) => {
  const router = useRouter();
  const { data: dreams, isLoading: dreamsLoading } = useDreams(userId);
  const { data: meditations, isLoading: meditationsLoading } = useMeditations(userId, { limit: 10 });
  const { data: cardPulls, isLoading: cardPullsLoading } = useCardPulls(userId, { limit: 10 });

  const isLoading = dreamsLoading || meditationsLoading || cardPullsLoading;

  // Combine and sort all entries by date
  const recentEntries = useMemo(() => {
    const entries: JournalEntry[] = [];

    // Add dreams
    dreams?.slice(0, 5).forEach(dream => {
      entries.push({
        id: dream.id,
        type: 'dream',
        title: dream.title || 'Untitled Dream',
        subtitle: dream.dreamType ? `${dream.dreamType} dream` : undefined,
        date: dream.date || dream.createdAt,
        path: `/u/${userId}/space/journal/dreams`
      });
    });

    // Add meditations
    meditations?.slice(0, 5).forEach(med => {
      entries.push({
        id: med.id,
        type: 'meditation',
        title: med.technique || 'Meditation Session',
        subtitle: med.duration ? `${med.duration} min` : undefined,
        date: med.date || med.createdAt,
        path: `/u/${userId}/space/journal/meditation`
      });
    });

    // Add card pulls
    cardPulls?.slice(0, 5).forEach(pull => {
      const cardNames = pull.cards?.slice(0, 2).map(c => c.name).join(', ') || '';
      entries.push({
        id: pull.id,
        type: 'card-pull',
        title: pull.question || 'Card Pull',
        subtitle: cardNames ? `${cardNames}${pull.cards?.length > 2 ? '...' : ''}` : pull.deck,
        date: pull.date || pull.createdAt,
        path: `/u/${userId}/space/readings/card-pulls`
      });
    });

    // Sort by date descending and take first 5
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [dreams, meditations, cardPulls, userId]);

  const getIcon = (type: JournalEntry['type']) => {
    switch (type) {
      case 'dream':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'meditation':
        return <Wind className="w-4 h-4 text-teal-400" />;
      case 'card-pull':
        return <Layers className="w-4 h-4 text-violet-400" />;
    }
  };

  const getTypeLabel = (type: JournalEntry['type']) => {
    switch (type) {
      case 'dream':
        return 'Dream';
      case 'meditation':
        return 'Meditation';
      case 'card-pull':
        return 'Card Pull';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-400">Recent Journal Entries</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">Recent Journal Entries</h2>
      </div>
      <div className="space-y-2">
        {recentEntries.map((entry) => (
          <button
            key={`${entry.type}-${entry.id}`}
            onClick={() => router.push(entry.path)}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group text-left"
            data-testid={`journal-entry-${entry.type}-${entry.id}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5">
                {getIcon(entry.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{getTypeLabel(entry.type)}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                {entry.subtitle && (
                  <p className="text-xs text-slate-400 truncate">{entry.subtitle}</p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default JournalEntries;
