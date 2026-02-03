'use client';

import { ReadingRequest } from '../_hooks';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, DollarSign, Loader2 } from 'lucide-react';

interface RequestBankCardProps {
  request: ReadingRequest;
  onClaim: () => void;
  isClaiming: boolean;
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

const getSpreadLabel = (type: string): string => {
  switch (type) {
    case 'SINGLE': return 'Single Card';
    case 'THREE_CARD': return 'Three Card';
    case 'FIVE_CARD': return 'Five Card';
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

const RequestBankCard: React.FC<RequestBankCardProps> = ({ request, onClaim, isClaiming }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const cardCount = getSpreadCardCount(request.spreadType);

  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-purple-500/30 transition-colors" data-testid={`available-request-${request.id}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-white font-medium">{getSpreadLabel(request.spreadType)}</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: cardCount }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-6 rounded border border-purple-400/30 bg-purple-500/10"
            />
          ))}
        </div>
      </div>

      {/* Topic */}
      <p className="text-slate-300 text-sm mb-2 line-clamp-2">{request.topic}</p>

      {/* Context if present */}
      {request.context && (
        <p className="text-slate-500 text-xs mb-3 italic line-clamp-2">{request.context}</p>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(request.createdAt)}
        </span>
        <span className="flex items-center gap-1 text-green-400 font-medium">
          <DollarSign className="w-3 h-3" />
          You earn {formatPrice(request.readerPayout)}
        </span>
      </div>

      {/* Claim Button */}
      <Button
        onClick={onClaim}
        disabled={isClaiming}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        data-testid={`claim-request-${request.id}`}
      >
        {isClaiming ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Claiming...
          </>
        ) : (
          'Claim Request'
        )}
      </Button>
      <p className="text-xs text-slate-500 text-center mt-2">
        You have 24 hours to fulfill after claiming
      </p>
    </div>
  );
};

export default RequestBankCard;
