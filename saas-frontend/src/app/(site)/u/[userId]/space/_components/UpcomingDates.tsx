'use client';

import { format, differenceInDays, parseISO } from 'date-fns';
import { Heart, Calendar } from 'lucide-react';
import type { MediumshipStats } from '../mediumship/hooks/useMediumshipStats';

interface Props {
  stats?: MediumshipStats;
  isLoading: boolean;
}

const UpcomingDates: React.FC<Props> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">Coming Up</h2>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 animate-pulse">
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-32 mb-1" />
                  <div className="h-3 bg-white/10 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upcomingDates = stats?.upcomingDates || [];

  if (upcomingDates.length === 0) {
    return null; // Don't render anything if there are no upcoming dates
  }

  const formatUpcomingDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const days = differenceInDays(date, new Date());

      if (days === 0) return 'Today';
      if (days === 1) return 'Tomorrow';
      if (days < 7) return `In ${days} days`;
      if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
      }
      return format(date, 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const getOccasionIcon = (occasion: string) => {
    const lowerOccasion = occasion.toLowerCase();
    if (lowerOccasion.includes('birthday')) {
      return <span className="text-lg">🎂</span>;
    }
    if (lowerOccasion.includes('anniversary')) {
      return <span className="text-lg">💕</span>;
    }
    if (lowerOccasion.includes('passing') || lowerOccasion.includes('death')) {
      return <span className="text-lg">🕯️</span>;
    }
    return <Heart className="w-4 h-4 text-pink-400" />;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-400">Coming Up</h2>
      <div data-testid="upcoming-dates-list" className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5 overflow-hidden">
        {upcomingDates.slice(0, 3).map((item) => (
          <div
            key={`${item.lovedOneId}-${item.occasion}`}
            data-testid={`upcoming-date-${item.lovedOneId}`}
            className="p-4 flex items-center gap-3"
          >
            <div className="p-2 rounded-lg bg-white/5 flex items-center justify-center">
              {getOccasionIcon(item.occasion)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {item.name}&apos;s {item.occasion.toLowerCase()}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{formatUpcomingDate(item.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingDates;
