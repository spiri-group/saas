'use client';

import { ClaimedReadingRequest } from '../_hooks';
import { Button } from '@/components/ui/button';
import { Sparkles, Star, Clock, DollarSign, Loader2, Undo2, Send, AlertTriangle } from 'lucide-react';

interface ClaimedRequestCardProps {
  request: ClaimedReadingRequest;
  onRelease: () => void;
  onFulfill: () => void;
  isReleasing: boolean;
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

const getSpreadLabel = (type: string): string => {
  switch (type) {
    case 'SINGLE': return 'Single Card';
    case 'THREE_CARD': return 'Three Card';
    case 'FIVE_CARD': return 'Five Card';
    case 'ASTRO_SNAPSHOT': return 'Chart Snapshot';
    case 'ASTRO_FOCUS': return 'Focused Reading';
    case 'ASTRO_DEEP_DIVE': return 'Full Reading';
    default: return type;
  }
};

const getSpreadCardCount = (type: string): number => {
  switch (type) {
    case 'SINGLE': return 1;
    case 'THREE_CARD': return 3;
    case 'FIVE_CARD': return 5;
    default: return 0;
  }
};

const isAstrologyRequest = (type: string): boolean => type.startsWith('ASTRO_');

const ClaimedRequestCard: React.FC<ClaimedRequestCardProps> = ({
  request,
  onRelease,
  onFulfill,
  isReleasing,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate hours remaining until deadline
  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs <= 0) return { expired: true, hours: 0, minutes: 0 };
    return { expired: false, hours: diffHours, minutes: diffMins };
  };

  const timeRemaining = getTimeRemaining(request.claimDeadline);
  const isUrgent = timeRemaining && !timeRemaining.expired && timeRemaining.hours < 4;

  const cardCount = getSpreadCardCount(request.spreadType);

  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-purple-500/30" data-testid={`claimed-request-${request.id}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isAstrologyRequest(request.spreadType) ? (
            <Star className="w-4 h-4 text-purple-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400" />
          )}
          <span className="text-white font-medium">{getSpreadLabel(request.spreadType)}</span>
        </div>
        <div className="flex items-center gap-1">
          {isAstrologyRequest(request.spreadType) ? (
            <span className="text-xs text-purple-400 font-medium px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">Astrology</span>
          ) : (
            Array.from({ length: cardCount }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-6 rounded border border-purple-400/50 bg-purple-500/20"
              />
            ))
          )}
        </div>
      </div>

      {/* Topic */}
      <div className="mb-3">
        <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Topic</h4>
        <p className="text-slate-200 text-sm">{request.topic}</p>
      </div>

      {/* Astrology details */}
      {isAstrologyRequest(request.spreadType) && (request as any).astrologyData && (
        <div className="mb-3 p-2 rounded bg-purple-500/5 border border-purple-500/20 space-y-1">
          <p className="text-purple-300 text-xs capitalize">
            {(request as any).astrologyData.focusArea?.replace(/_/g, ' ')}
          </p>
          {(request as any).astrologyData.birthData && (
            <p className="text-slate-400 text-xs">
              Born {(request as any).astrologyData.birthData.birthDate}
              {(request as any).astrologyData.birthData.birthTime && ` at ${(request as any).astrologyData.birthData.birthTime}`}
              {(request as any).astrologyData.birthData.birthLocation?.city && ` in ${(request as any).astrologyData.birthData.birthLocation.city}`}
            </p>
          )}
          {(request as any).astrologyData.partnerBirthData && (
            <p className="text-slate-400 text-xs">
              Partner: {(request as any).astrologyData.partnerBirthData.birthDate}
              {(request as any).astrologyData.partnerBirthData.birthTime && ` at ${(request as any).astrologyData.partnerBirthData.birthTime}`}
              {(request as any).astrologyData.partnerBirthData.birthLocation?.city && ` in ${(request as any).astrologyData.partnerBirthData.birthLocation.city}`}
            </p>
          )}
          {(request as any).astrologyData.specificPlanet && (
            <p className="text-slate-400 text-xs capitalize">Planet: {(request as any).astrologyData.specificPlanet}</p>
          )}
          {(request as any).astrologyData.specificLifeArea && (
            <p className="text-slate-400 text-xs capitalize">Life area: {(request as any).astrologyData.specificLifeArea}</p>
          )}
        </div>
      )}

      {/* Context if present */}
      {request.context && (
        <div className="mb-3">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Context</h4>
          <p className="text-slate-400 text-sm">{request.context}</p>
        </div>
      )}

      {/* Deadline Banner */}
      {timeRemaining && (
        <div className={`mb-3 p-2 rounded text-xs flex items-center justify-center gap-2 ${
          timeRemaining.expired
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : isUrgent
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-slate-700/50 text-slate-300'
        }`}>
          {timeRemaining.expired ? (
            <>
              <AlertTriangle className="w-3 h-3" />
              Deadline expired - please fulfill or release
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              {timeRemaining.hours > 0 ? `${timeRemaining.hours}h ${timeRemaining.minutes}m` : `${timeRemaining.minutes}m`} left to fulfill
            </>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pt-3 border-t border-slate-700">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Claimed {formatDate(request.claimedAt)}
        </span>
        <span className="flex items-center gap-1 text-green-400 font-medium">
          <DollarSign className="w-3 h-3" />
          You earn {formatPrice(request.readerPayout)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRelease}
          disabled={isReleasing}
          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
          data-testid={`release-request-${request.id}`}
        >
          {isReleasing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Undo2 className="w-4 h-4 mr-2" />
          )}
          Release
        </Button>
        <Button
          onClick={onFulfill}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          data-testid={`fulfill-request-${request.id}`}
        >
          <Send className="w-4 h-4 mr-2" />
          Fulfill
        </Button>
      </div>
    </div>
  );
};

export default ClaimedRequestCard;
