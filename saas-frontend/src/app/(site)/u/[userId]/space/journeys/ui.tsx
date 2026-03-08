'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, Clock, Check, Music, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMyJourneys, JourneyProgress } from './_hooks/UseMyJourneys';

interface Props {
  userId: string;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getCompletionPercent(progress: JourneyProgress): number {
  if (!progress.trackProgress || progress.trackProgress.length === 0) return 0;
  const completed = progress.trackProgress.filter(tp => tp.completed).length;
  const total = progress.journey?.trackCount || progress.trackProgress.length;
  return Math.round((completed / total) * 100);
}

const UI: React.FC<Props> = ({ userId }) => {
  const router = useRouter();
  const { data: journeys, isLoading } = useMyJourneys(userId);

  const { activeJourneys, completedJourneys } = useMemo(() => {
    if (!journeys) return { activeJourneys: [], completedJourneys: [] };
    const active: JourneyProgress[] = [];
    const completed: JourneyProgress[] = [];
    for (const j of journeys) {
      if (j.completedDate) {
        completed.push(j);
      } else {
        active.push(j);
      }
    }
    return { activeJourneys: active, completedJourneys: completed };
  }, [journeys]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="journeys-loading">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!journeys || journeys.length === 0) {
    return (
      <div className="p-6 md:p-10">
        <h1 className="text-2xl font-semibold text-white mb-2">My Journeys</h1>
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-testid="journeys-empty"
        >
          <Headphones className="w-16 h-16 text-slate-600 mb-4" />
          <h2 className="text-xl font-medium text-slate-300 mb-2">No journeys yet</h2>
          <p className="text-slate-500 max-w-md">
            When you purchase a journey from a practitioner, it will appear here for you to listen and track your progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10" data-testid="journeys-list-page">
      <h1 className="text-2xl font-semibold text-white mb-6">My Journeys</h1>

      {activeJourneys.length > 0 && (
        <section className="mb-10" data-testid="active-journeys-section">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400 mb-4">
            In Progress
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJourneys.map((jp) => (
              <JourneyCard
                key={jp.id}
                progress={jp}
                userId={userId}
                onClick={() => router.push(`/u/${userId}/space/journeys/${jp.journeyId}`)}
              />
            ))}
          </div>
        </section>
      )}

      {completedJourneys.length > 0 && (
        <section data-testid="completed-journeys-section">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400 mb-4">
            Completed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedJourneys.map((jp) => (
              <JourneyCard
                key={jp.id}
                progress={jp}
                userId={userId}
                onClick={() => router.push(`/u/${userId}/space/journeys/${jp.journeyId}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ── Journey Card ───────────────────────────────────────────

interface JourneyCardProps {
  progress: JourneyProgress;
  userId: string;
  onClick: () => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({ progress, onClick }) => {
  const journey = progress.journey;
  const percent = getCompletionPercent(progress);
  const isCompleted = !!progress.completedDate;
  const thumbnailUrl = journey?.thumbnail?.image?.media?.url;

  return (
    <button
      className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-left transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      onClick={onClick}
      data-testid={`journey-card-${progress.journeyId}`}
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={journey?.name || 'Journey'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: journey?.thumbnail?.backgroundColor || '#1e1b4b' }}
          >
            <Music className="w-12 h-12 text-purple-400/40" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          {isCompleted ? (
            <Badge className="bg-emerald-500/90 text-white border-0 text-xs" data-testid="journey-completed-badge">
              <Check className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Badge className="bg-purple-500/90 text-white border-0 text-xs" data-testid="journey-progress-badge">
              {percent}%
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-medium text-sm mb-1 line-clamp-1 group-hover:text-purple-300 transition-colors">
          {journey?.name || 'Untitled Journey'}
        </h3>
        <p className="text-slate-400 text-xs mb-3">
          {journey?.vendor?.name || 'Unknown practitioner'}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-purple-500'}`}
            style={{ width: `${percent}%` }}
            data-testid="journey-progress-bar"
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-slate-500 text-xs flex items-center gap-1">
            <Music className="w-3 h-3" />
            {journey?.trackCount || 0} tracks
          </span>
          <span className="text-slate-500 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(journey?.totalDurationSeconds || 0)}
          </span>
        </div>
      </div>
    </button>
  );
};

export default UI;
