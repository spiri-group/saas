'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Inbox, ListChecks, Loader2, AlertCircle, ChevronLeft, ChevronRight, Clock, DollarSign, Search, X, Filter } from 'lucide-react';
import {
  useAvailableReadingRequests,
  useClaimedReadingRequests,
  useClaimReadingRequest,
  useReleaseReadingRequest,
  ClaimedReadingRequest,
  ReadingRequest,
} from './_hooks';
import { ClaimedRequestCard, FulfillmentDialog, AstrologyFulfillmentDialog } from './_components';

interface UIProps {
  merchantId: string;
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

const isAstrologyRequest = (type: string): boolean => type.startsWith('ASTRO_');

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Table row component for Request Bank
const RequestBankRow: React.FC<{
  request: ReadingRequest;
  onClaim: () => void;
  isClaiming: boolean;
}> = ({ request, onClaim, isClaiming }) => {
  return (
    <tr
      className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
      data-testid={`available-request-${request.id}`}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {isAstrologyRequest(request.spreadType) ? (
            <Star className="w-4 h-4 text-purple-400 flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )}
          <span className="text-white font-medium">{getSpreadLabel(request.spreadType)}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="text-slate-300 text-sm line-clamp-2 max-w-xs">{request.topic}</p>
        {isAstrologyRequest(request.spreadType) && (request as any).astrologyData?.focusArea && (
          <p className="text-purple-400 text-xs capitalize mt-0.5">
            {(request as any).astrologyData.focusArea.replace(/_/g, ' ')}
          </p>
        )}
      </td>
      <td className="py-3 px-4 text-slate-400 text-sm">
        {request.userEmail && (
          <span className="block truncate max-w-[150px]" title={request.userEmail}>
            {request.userEmail}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(request.createdAt)}
        </span>
      </td>
      <td className="py-3 px-4 text-green-400 font-medium whitespace-nowrap">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {formatPrice(request.readerPayout)}
        </span>
      </td>
      <td className="py-3 px-4">
        <Button
          onClick={onClaim}
          disabled={isClaiming}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
          data-testid={`claim-request-${request.id}`}
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim'
          )}
        </Button>
      </td>
    </tr>
  );
};

export default function UI({ merchantId }: UIProps) {
  const [activeTab, setActiveTab] = useState('available');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [fulfillingRequest, setFulfillingRequest] = useState<ClaimedReadingRequest | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [spreadFilters, setSpreadFilters] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  const spreadTypes = [
    { value: 'SINGLE', label: 'Single Card' },
    { value: 'THREE_CARD', label: 'Three Card' },
    { value: 'FIVE_CARD', label: 'Five Card' },
    { value: 'ASTRO_SNAPSHOT', label: 'Chart Snapshot' },
    { value: 'ASTRO_FOCUS', label: 'Focused Reading' },
    { value: 'ASTRO_DEEP_DIVE', label: 'Full Reading' },
  ];

  const toggleSpreadFilter = (spreadType: string) => {
    setSpreadFilters(prev => {
      const next = new Set(prev);
      if (next.has(spreadType)) {
        next.delete(spreadType);
      } else {
        next.add(spreadType);
      }
      return next;
    });
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setSpreadFilters(new Set());
    setSearchQuery('');
    setCurrentPage(0);
  };

  // Queries - fetch more than page size to allow client-side filtering
  const { data: availableRequests, isLoading: loadingAvailable } = useAvailableReadingRequests(100, 0);
  const { data: claimedRequests, isLoading: loadingClaimed } = useClaimedReadingRequests(merchantId);

  // Mutations
  const claimMutation = useClaimReadingRequest();
  const releaseMutation = useReleaseReadingRequest();

  // Filter requests based on search query and spread type filters
  const filteredRequests = useMemo(() => {
    if (!availableRequests) return [];

    let filtered = availableRequests;

    // Apply spread type filter
    if (spreadFilters.size > 0) {
      filtered = filtered.filter(request => spreadFilters.has(request.spreadType));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(request =>
        request.userEmail?.toLowerCase().includes(query) ||
        request.topic.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [availableRequests, searchQuery, spreadFilters]);

  const hasActiveFilters = spreadFilters.size > 0 || searchQuery.trim() !== '';

  // Paginate filtered results
  const paginatedRequests = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
  };

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    setClaimError(null);
    try {
      const result = await claimMutation.mutateAsync({
        requestId,
        readerId: merchantId,
      });
      if (result.success) {
        setActiveTab('claimed');
      } else {
        setClaimError(result.message || 'Failed to claim request. The customer payment may have failed.');
      }
    } catch (error: any) {
      setClaimError(error?.message || 'An unexpected error occurred while claiming the request.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleRelease = async (requestId: string) => {
    setReleasingId(requestId);
    try {
      await releaseMutation.mutateAsync({
        requestId,
        readerId: merchantId,
      });
    } finally {
      setReleasingId(null);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if ((currentPage + 1) * pageSize < filteredRequests.length) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  return (
    <div className="min-h-screen p-4 md:p-6 bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            SpiriReadings
          </h1>
          <p className="text-slate-400 mt-1">
            Claim and fulfill reading requests from our community
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            onClick={() => setActiveTab('available')}
            data-testid="tab-request-bank"
            data-state={activeTab === 'available' ? 'active' : 'inactive'}
            className={cn(
              'flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all',
              activeTab === 'available'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
            )}
          >
            <Inbox className="w-4 h-4" />
            Request Bank
            {availableRequests && availableRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-300">
                {availableRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('claimed')}
            data-testid="tab-my-claims"
            data-state={activeTab === 'claimed' ? 'active' : 'inactive'}
            className={cn(
              'flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all',
              activeTab === 'claimed'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
            )}
          >
            <ListChecks className="w-4 h-4" />
            My Claims
            {claimedRequests && claimedRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-300">
                {claimedRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Available Requests (Request Bank) - Table View */}
        {activeTab === 'available' && (
          <>
            {/* Error Alert */}
            {claimError && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Claim Failed</p>
                  <p className="text-sm text-red-400/80">{claimError}</p>
                </div>
                <button
                  onClick={() => setClaimError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search and Filter */}
            <div className="mb-4 space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search by email, topic, or request ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500"
                  data-testid="request-bank-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Spread Type Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Filter by type:
                </span>
                {spreadTypes.map(type => (
                  <Badge
                    key={type.value}
                    variant={spreadFilters.has(type.value) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      spreadFilters.has(type.value)
                        ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                        : 'bg-transparent border-slate-600 text-slate-400 hover:border-purple-500 hover:text-purple-400'
                    }`}
                    onClick={() => toggleSpreadFilter(type.value)}
                    data-testid={`filter-${type.value.toLowerCase()}`}
                  >
                    {type.label}
                  </Badge>
                ))}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-slate-500 hover:text-purple-400 underline ml-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {loadingAvailable ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : !availableRequests || availableRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500" data-testid="empty-request-bank">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No reading requests available</p>
                <p className="text-sm">Check back soon for new requests!</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No requests match your search</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Topic
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Requested
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          You Earn
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map((request) => (
                        <RequestBankRow
                          key={request.id}
                          request={request}
                          onClaim={() => handleClaim(request.id)}
                          isClaiming={claimingId === request.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/30">
                  <p className="text-sm text-slate-500">
                    {searchQuery ? (
                      <>Showing {paginatedRequests.length} of {filteredRequests.length} matching requests</>
                    ) : (
                      <>Showing {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, filteredRequests.length)} of {filteredRequests.length}</>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                      className="border-slate-700 text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-slate-500">
                      Page {currentPage + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className="border-slate-700 text-slate-400 hover:text-white"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Claimed Requests */}
        {activeTab === 'claimed' && (
          <>
            {loadingClaimed ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : !claimedRequests || claimedRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500" data-testid="empty-claimed-requests">
                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No claimed requests</p>
                <p className="text-sm">Claim a request from the Request Bank to get started!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {claimedRequests.map((request) => (
                  <ClaimedRequestCard
                    key={request.id}
                    request={request}
                    onRelease={() => handleRelease(request.id)}
                    onFulfill={() => setFulfillingRequest(request)}
                    isReleasing={releasingId === request.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Info Section */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-2">How SpiriReadings works</h3>
          <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
            <li>Browse the Request Bank for reading requests from users</li>
            <li>Claim a request to lock it - you have 24 hours to fulfill</li>
            <li>Perform the reading and photograph your spread</li>
            <li>Submit your reading - the customer is charged when you fulfill</li>
            <li>Your payout is deposited to your connected Stripe account</li>
          </ol>
          <p className="text-xs text-slate-500 mt-3">
            A platform fee is deducted from each reading. See your payout amount on each request.
          </p>
        </div>
      </div>

      {/* Fulfillment Dialog — route based on reading category */}
      {fulfillingRequest && isAstrologyRequest(fulfillingRequest.spreadType) ? (
        <AstrologyFulfillmentDialog
          request={fulfillingRequest}
          readerId={merchantId}
          open={!!fulfillingRequest}
          onOpenChange={(open) => !open && setFulfillingRequest(null)}
          onSuccess={() => setFulfillingRequest(null)}
        />
      ) : fulfillingRequest ? (
        <FulfillmentDialog
          request={fulfillingRequest}
          readerId={merchantId}
          open={!!fulfillingRequest}
          onOpenChange={(open) => !open && setFulfillingRequest(null)}
          onSuccess={() => setFulfillingRequest(null)}
        />
      ) : null}
    </div>
  );
}
