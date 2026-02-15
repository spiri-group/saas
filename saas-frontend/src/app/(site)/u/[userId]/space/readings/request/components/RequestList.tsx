'use client';

import { useMyReadingRequests, useCancelReadingRequest } from '../hooks';
import { ReadingRequest, formatPrice, STATUS_CONFIG, isAstrologySpread, ASTROLOGY_FOCUS_OPTIONS } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, X, Eye, Clock, Sparkles, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface RequestListProps {
  userId: string;
}

const RequestCard: React.FC<{ request: ReadingRequest; onCancel: () => void; isCancelling: boolean }> = ({
  request,
  onCancel,
  isCancelling,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const statusConfig = STATUS_CONFIG[request.requestStatus];
  const canCancel = request.requestStatus === 'PENDING_PAYMENT' || request.requestStatus === 'AWAITING_CLAIM';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700" data-testid={`reading-request-${request.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isAstrologySpread(request.spreadType) ? (
            <Star className="w-4 h-4 text-purple-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400" />
          )}
          <span className="text-white font-medium">
            {request.spreadType === 'SINGLE' ? 'Single Card' :
             request.spreadType === 'THREE_CARD' ? 'Three Card' :
             request.spreadType === 'FIVE_CARD' ? 'Five Card' :
             request.spreadType === 'ASTRO_SNAPSHOT' ? 'Chart Snapshot' :
             request.spreadType === 'ASTRO_FOCUS' ? 'Focused Reading' :
             request.spreadType === 'ASTRO_DEEP_DIVE' ? 'Full Reading' : request.spreadType}
          </span>
        </div>
        <span className={cn('text-sm', statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>

      {/* Focus area for astrology */}
      {isAstrologySpread(request.spreadType) && request.astrologyData?.focusArea && (
        <p className="text-purple-400 text-xs mb-2 capitalize">
          {ASTROLOGY_FOCUS_OPTIONS.find(f => f.value === request.astrologyData?.focusArea)?.label || request.astrologyData.focusArea.replace(/_/g, ' ')}
        </p>
      )}

      <p className="text-slate-300 text-sm mb-3 line-clamp-2">{request.topic}</p>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(request.createdAt)}
        </span>
        <span className="text-purple-400 font-medium">
          {formatPrice(request.price)}
        </span>
      </div>

      {/* Fulfilled Reading */}
      {request.requestStatus === 'FULFILLED' && (request.cards || request.astrologyFulfillment) && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              data-testid={`view-reading-${request.id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Your Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Your Reading</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Photo */}
              {request.photoUrl && (
                <img
                  src={request.photoUrl}
                  alt="Reading spread"
                  className="w-full rounded-lg"
                />
              )}

              {/* Cards */}
              <div className="space-y-3">
                {request.cards?.map((card, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-slate-800 border border-slate-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-purple-400 font-medium">
                        {card.position}
                      </span>
                      <span className="text-white font-medium">
                        {card.name}
                        {card.reversed && (
                          <span className="ml-1 text-xs text-slate-400">(Reversed)</span>
                        )}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm">{card.interpretation}</p>

                    {/* Auto-extracted symbols */}
                    {card.symbols && card.symbols.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500 mb-1">Symbols in this card:</p>
                        <div className="flex flex-wrap gap-1">
                          {card.symbols.map((symbol, symbolIndex) => (
                            <span
                              key={symbolIndex}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            >
                              {symbol}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Overall Message (Tarot) */}
              {request.overallMessage && (
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <h4 className="text-purple-400 font-medium mb-2">Overall Message</h4>
                  <p className="text-slate-300">{request.overallMessage}</p>
                </div>
              )}

              {/* Astrology Fulfillment */}
              {request.astrologyFulfillment && (
                <div className="space-y-4">
                  {/* Chart Image */}
                  {request.astrologyFulfillment.chartImageUrl && (
                    <img
                      src={request.astrologyFulfillment.chartImageUrl}
                      alt="Birth chart"
                      className="w-full rounded-lg"
                    />
                  )}

                  {/* Main Interpretation */}
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <h4 className="text-purple-400 font-medium mb-2">Interpretation</h4>
                    <p className="text-slate-300 whitespace-pre-wrap">{request.astrologyFulfillment.interpretation}</p>
                  </div>

                  {/* Highlighted Aspects */}
                  {request.astrologyFulfillment.highlightedAspects && request.astrologyFulfillment.highlightedAspects.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-slate-300 font-medium">Key Aspects</h4>
                      {request.astrologyFulfillment.highlightedAspects.map((aspect, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-purple-400 text-sm font-medium capitalize">
                              {aspect.planet1} {aspect.aspect} {aspect.planet2}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm">{aspect.interpretation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Practitioner Recommendation (funnel) */}
                  {request.astrologyFulfillment.practitionerRecommendation && (
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                      <h4 className="text-indigo-400 font-medium mb-2">Recommended Next Steps</h4>
                      <p className="text-slate-300">{request.astrologyFulfillment.practitionerRecommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isCancelling}
          className="w-full mt-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          data-testid={`cancel-request-${request.id}`}
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <X className="w-4 h-4 mr-2" />
          )}
          Cancel Request
        </Button>
      )}
    </div>
  );
};

const RequestList: React.FC<RequestListProps> = ({ userId }) => {
  const { data: requests, isLoading } = useMyReadingRequests(userId);
  const cancelMutation = useCancelReadingRequest();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      await cancelMutation.mutateAsync({ requestId, userId });
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No reading requests yet</p>
        <p className="text-sm">Request your first reading above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="reading-request-list">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onCancel={() => handleCancel(request.id)}
          isCancelling={cancellingId === request.id}
        />
      ))}
    </div>
  );
};

export default RequestList;
