'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Sparkles, Moon, ChevronRight } from 'lucide-react';
import type { SpiritMessage } from '../mediumship/hooks/useSpiritMessages';
import type { Synchronicity } from '../mediumship/hooks/useSynchronicities';

interface Props {
  userId: string;
  spiritMessages?: SpiritMessage[];
  synchronicities?: Synchronicity[];
  isLoading: boolean;
}

type ActivityItem = {
  id: string;
  type: 'spirit-message' | 'synchronicity';
  title: string;
  date: string;
  path: string;
};

const RecentActivity: React.FC<Props> = ({
  userId,
  spiritMessages,
  synchronicities,
  isLoading,
}) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">Recent Activity</h2>
        <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-48 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Combine and sort recent items
  const items: ActivityItem[] = [];

  if (spiritMessages) {
    spiritMessages.forEach((msg) => {
      const sourceLabel = msg.sourceName || msg.source.replace('_', ' ');
      items.push({
        id: msg.id,
        type: 'spirit-message',
        title: `Spirit message from ${sourceLabel}`,
        date: msg.date,
        path: `/mediumship/spirit-messages/${msg.id}`,
      });
    });
  }

  if (synchronicities) {
    synchronicities.forEach((sync) => {
      items.push({
        id: sync.id,
        type: 'synchronicity',
        title: sync.title,
        date: sync.date,
        path: `/mediumship/synchronicities/${sync.id}`,
      });
    });
  }

  // Sort by date descending and take top 5
  const sortedItems = items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (sortedItems.length === 0) {
    return null;
  }

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'spirit-message':
        return <MessageCircle className="w-4 h-4 text-cyan-400" />;
      case 'synchronicity':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Moon className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'spirit-message':
        return 'Message';
      case 'synchronicity':
        return 'Synchronicity';
      default:
        return '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-400">Recent Activity</h2>
      <div data-testid="recent-activity-list" className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5 overflow-hidden">
        {sortedItems.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => router.push(`/u/${userId}/space${item.path}`)}
            data-testid={`recent-activity-${item.type}-${item.id}`}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <div className="p-2 rounded-lg bg-white/5">
              {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{item.title}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{getTypeLabel(item.type)}</span>
                <span>·</span>
                <span>{formatDate(item.date)}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
