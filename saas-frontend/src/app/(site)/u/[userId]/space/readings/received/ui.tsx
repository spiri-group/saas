'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Eye, Loader2, Sparkles, BookMarked, Clock, XCircle, Star, Check, Store, Download, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { useMyReadingRequests } from '../request/hooks/useMyReadingRequests';
import { useMyPurchasedReadings, PurchasedReading } from '../request/hooks/useMyPurchasedReadings';
import { useReviewReadingRequest } from '../request/hooks/useReviewReadingRequest';
import { ReadingRequest, formatPrice, STATUS_CONFIG, ReadingRequestStatus, ASTROLOGY_FOCUS_OPTIONS, isAstrologySpread } from '../request/types';
import { ReflectionForm, ReflectionPrefillData } from '../../mediumship/reflections/components/ReflectionForm';
import { toast } from 'sonner';
import { gql } from '@/lib/services/gql';
import { useQueryClient } from '@tanstack/react-query';

type FilterOption = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Status mappings for SpiriReading requests
const FILTER_CONFIG: Record<FilterOption, { label: string; statuses: ReadingRequestStatus[] }> = {
  all: { label: 'All', statuses: [] },
  pending: { label: 'Pending', statuses: ['AWAITING_CLAIM', 'PENDING_PAYMENT'] },
  in_progress: { label: 'In Progress', statuses: ['CLAIMED'] },
  completed: { label: 'Completed', statuses: ['FULFILLED'] },
  cancelled: { label: 'Cancelled', statuses: ['CANCELLED', 'EXPIRED'] },
};

// Status mappings for purchased services
const SERVICE_STATUS_MAP: Record<string, FilterOption> = {
  'PAID': 'pending',
  'IN_PROGRESS': 'in_progress',
  'DELIVERED': 'completed',
  'CANCELLED': 'cancelled',
};

// Unified reading type that can be either a SpiriReading request or a purchased service
type UnifiedReading = {
  id: string;
  type: 'spiri-reading' | 'purchased-service';
  title: string;
  description?: string;
  price: number;
  status: FilterOption;
  statusLabel: string;
  createdAt: string;
  completedAt?: string;
  isFulfilled: boolean;
  isPending: boolean;
  isInProgress: boolean;
  isCancelled: boolean;
  practitionerName?: string;
  practitionerSlug?: string;
  // Original data for detailed view
  originalSpiriReading?: ReadingRequest;
  originalPurchasedService?: PurchasedReading;
};

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const router = useRouter();
  const [selectedReading, setSelectedReading] = useState<ReadingRequest | null>(null);
  const [selectedPurchasedReading, setSelectedPurchasedReading] = useState<PurchasedReading | null>(null);
  const [reflectionPrefill, setReflectionPrefill] = useState<ReflectionPrefillData | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  // SpiriReading review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHeadline, setReviewHeadline] = useState('');
  const [reviewText, setReviewText] = useState('');

  // Service review state (for purchased reading services)
  const [showServiceReviewForm, setShowServiceReviewForm] = useState(false);
  const [serviceReviewRating, setServiceReviewRating] = useState(0);
  const [serviceReviewHeadline, setServiceReviewHeadline] = useState('');
  const [serviceReviewText, setServiceReviewText] = useState('');
  const [isSubmittingServiceReview, setIsSubmittingServiceReview] = useState(false);

  // Get SpiriReading requests
  const { data: spiriReadings, isLoading: isLoadingSpiri } = useMyReadingRequests(userId);
  // Get purchased reading services from merchants
  const { data: purchasedReadings, isLoading: isLoadingPurchased } = useMyPurchasedReadings(userId);
  const reviewMutation = useReviewReadingRequest();
  const queryClient = useQueryClient();

  const isLoading = isLoadingSpiri || isLoadingPurchased;

  // Handle review submission for purchased services (uses existing create_review mutation)
  const handleSubmitServiceReview = async () => {
    if (!selectedPurchasedReading) return;
    if (serviceReviewRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!serviceReviewHeadline.trim()) {
      toast.error('Please enter a headline');
      return;
    }
    if (!serviceReviewText.trim()) {
      toast.error('Please enter your review');
      return;
    }

    setIsSubmittingServiceReview(true);
    try {
      // Use the existing create_review mutation - review is for the SERVICE listing
      const serviceId = selectedPurchasedReading.service.id;
      const vendorId = selectedPurchasedReading.vendorId;

      await gql<{ create_review: { success: boolean; review: unknown } }>(`
        mutation CreateReview($review: ReviewInput!, $objectId: String!, $objectPartition: String!) {
          create_review(review: $review, objectId: $objectId, objectPartition: $objectPartition) {
            code
            success
            message
            review {
              headline
              rating
              base {
                id
                text
              }
            }
          }
        }
      `, {
        review: {
          headline: serviceReviewHeadline.trim(),
          text: serviceReviewText.trim(),
          rating: serviceReviewRating
        },
        objectId: serviceId,
        objectPartition: vendorId
      });

      toast.success('Thank you for your review!');
      setShowServiceReviewForm(false);
      setServiceReviewRating(0);
      setServiceReviewHeadline('');
      setServiceReviewText('');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['my-purchased-readings'] });
      queryClient.invalidateQueries({ queryKey: ['reviews-for-listing', serviceId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmittingServiceReview(false);
    }
  };

  // Convert to unified format and merge both sources
  const unifiedReadings = useMemo((): UnifiedReading[] => {
    const unified: UnifiedReading[] = [];

    // Convert SpiriReading requests
    if (spiriReadings) {
      for (const reading of spiriReadings) {
        const isFulfilled = reading.requestStatus === 'FULFILLED';
        const isPending = reading.requestStatus === 'AWAITING_CLAIM' || reading.requestStatus === 'PENDING_PAYMENT';
        const isInProgress = reading.requestStatus === 'CLAIMED';
        const isCancelled = reading.requestStatus === 'CANCELLED' || reading.requestStatus === 'EXPIRED';

        let status: FilterOption = 'pending';
        if (isFulfilled) status = 'completed';
        else if (isInProgress) status = 'in_progress';
        else if (isCancelled) status = 'cancelled';

        // Build description with focus area for astrology
        let description = `${reading.spreadType.replace('_', ' ')} Spread`;
        if (isAstrologySpread(reading.spreadType) && reading.astrologyData?.focusArea) {
          const focusLabel = ASTROLOGY_FOCUS_OPTIONS.find(f => f.value === reading.astrologyData?.focusArea)?.label;
          if (focusLabel) description += ` · ${focusLabel}`;
        }

        unified.push({
          id: reading.id,
          type: 'spiri-reading',
          title: reading.topic,
          description,
          price: reading.price,
          status,
          statusLabel: STATUS_CONFIG[reading.requestStatus].label,
          createdAt: reading.createdAt,
          completedAt: reading.fulfilledAt,
          isFulfilled,
          isPending,
          isInProgress,
          isCancelled,
          practitionerName: 'SpiriVerse Reader',
          originalSpiriReading: reading,
        });
      }
    }

    // Convert purchased reading services
    if (purchasedReadings) {
      for (const purchase of purchasedReadings) {
        const status = SERVICE_STATUS_MAP[purchase.orderStatus] || 'pending';
        const isFulfilled = purchase.orderStatus === 'DELIVERED';
        const isPending = purchase.orderStatus === 'PAID';
        const isInProgress = purchase.orderStatus === 'IN_PROGRESS';
        const isCancelled = purchase.orderStatus === 'CANCELLED';

        const statusLabels: Record<string, string> = {
          'PAID': 'Awaiting Practitioner',
          'IN_PROGRESS': 'Being Prepared',
          'DELIVERED': 'Delivered',
          'CANCELLED': 'Cancelled',
        };

        unified.push({
          id: purchase.id,
          type: 'purchased-service',
          title: purchase.service.name,
          description: purchase.service.description,
          price: purchase.price?.amount ?? 0,
          status,
          statusLabel: statusLabels[purchase.orderStatus] || purchase.orderStatus,
          createdAt: purchase.purchaseDate,
          completedAt: purchase.deliverables?.deliveredAt,
          isFulfilled,
          isPending,
          isInProgress,
          isCancelled,
          practitionerName: purchase.service.vendor?.name,
          practitionerSlug: purchase.service.vendor?.slug,
          originalPurchasedService: purchase,
        });
      }
    }

    // Sort by date (newest first)
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return unified;
  }, [spiriReadings, purchasedReadings]);

  // Filter unified readings based on active filter
  const filteredReadings = useMemo(() => {
    if (activeFilter === 'all') return unifiedReadings;
    return unifiedReadings.filter(r => r.status === activeFilter);
  }, [unifiedReadings, activeFilter]);

  // Count readings per filter
  const filterCounts = useMemo(() => {
    return {
      all: unifiedReadings.length,
      pending: unifiedReadings.filter(r => r.status === 'pending').length,
      in_progress: unifiedReadings.filter(r => r.status === 'in_progress').length,
      completed: unifiedReadings.filter(r => r.status === 'completed').length,
      cancelled: unifiedReadings.filter(r => r.status === 'cancelled').length,
    };
  }, [unifiedReadings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Create prefill data for Session Reflection from a SpiriVerse reading
  const handleReflectOnReading = (reading: ReadingRequest) => {
    const isAstro = reading.readingCategory === 'ASTROLOGY';
    const prefillData: ReflectionPrefillData = {
      date: reading.fulfilledAt
        ? new Date(reading.fulfilledAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      readerName: 'SpiriVerse Reader',
      readingType: isAstro ? 'Astrology Reading' : 'Tarot Reading',
      format: 'Pre-recorded',
      mainMessages: isAstro
        ? (reading.astrologyFulfillment?.interpretation || '')
        : (reading.overallMessage || ''),
      sourceReadingId: reading.id,
    };
    setReflectionPrefill(prefillData);
    setSelectedReading(null); // Close the reading detail dialog
  };

  const handleReflectionSuccess = () => {
    setReflectionPrefill(null);
  };

  // Check if a purchased reading is a card-based reading (Tarot or Oracle)
  const isCardBasedReading = (reading: PurchasedReading): boolean => {
    const readingType = reading.service.readingOptions?.readingType?.toLowerCase() || '';
    return readingType === 'tarot' || readingType === 'oracle';
  };

  // Check if a purchased reading is a mediumship reading (reserved for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isMediumReading = (reading: PurchasedReading): boolean => {
    const readingType = reading.service.readingOptions?.readingType?.toLowerCase() || '';
    return readingType === 'medium' || readingType === 'mediumship' || readingType === 'mediumship reading';
  };

  // Check if a purchased reading is an astrology reading
  const isAstrologyReading = (reading: PurchasedReading): boolean => {
    const readingType = reading.service.readingOptions?.readingType?.toLowerCase() || '';
    return readingType === 'astrology';
  };

  // Handle journaling an astrology reading (navigates to astrology journal)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleJournalAstrologyReading = (_reading: PurchasedReading) => {
    setSelectedPurchasedReading(null);
    router.push(`/u/${userId}/space/astrology/journal`);
  };

  // Extract Tarot card names from text (simple pattern matching)
  const extractCardNamesFromText = (text: string): string[] => {
    if (!text) return [];

    // Match common Tarot card patterns: "The [CardName]", "[Number] of [Suit]", etc.
    const cardPatterns = [
      // Major Arcana: "The Fool", "The Magician", etc.
      /The\s+(Fool|Magician|High\s+Priestess|Empress|Emperor|Hierophant|Lovers|Chariot|Strength|Hermit|Wheel\s+of\s+Fortune|Justice|Hanged\s+Man|Death|Temperance|Devil|Tower|Star|Moon|Sun|Judgement|World)/gi,
      // Minor Arcana: "Ace of Cups", "Two of Wands", etc.
      /(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King)\s+of\s+(Cups|Wands|Swords|Pentacles)/gi,
    ];

    const foundCards: string[] = [];
    const seenCards = new Set<string>();

    for (const pattern of cardPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const cardName = match[0].trim();
        // Normalize spacing (e.g., "High  Priestess" -> "High Priestess")
        const normalized = cardName.replace(/\s+/g, ' ');
        if (!seenCards.has(normalized.toLowerCase())) {
          foundCards.push(normalized);
          seenCards.add(normalized.toLowerCase());
        }
      }
    }

    return foundCards;
  };

  // Extract loved ones' names from medium reading text (reserved for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _extractLovedOnesFromText = (text: string): Array<{ name: string; relationship?: string }> => {
    if (!text) return [];

    const lovedOnes: Array<{ name: string; relationship?: string }> = [];
    const seenNames = new Set<string>();

    // Pattern 1: "your [relationship] [Name]" (e.g., "your grandmother Mary", "your uncle Robert")
    const pattern1 = /your\s+(grandmother|grandfather|mother|father|sister|brother|aunt|uncle|cousin|friend|wife|husband|partner|son|daughter|child)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
    const matches1 = text.matchAll(pattern1);
    for (const match of matches1) {
      const relationship = match[1].charAt(0).toUpperCase() + match[1].slice(1); // Capitalize
      const name = match[2].trim();
      const normalized = name.toLowerCase();

      if (!seenNames.has(normalized) && name.length >= 2) {
        lovedOnes.push({ name, relationship });
        seenNames.add(normalized);
      }
    }

    // Pattern 2: Named people with strong indicators (e.g., "**Mary**", "spirit named John")
    const pattern2 = /(?:\*\*|spirit\s+named|connected\s+with|mentioned)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\**/gi;
    const matches2 = text.matchAll(pattern2);
    for (const match of matches2) {
      const name = match[1].replace(/\*\*/g, '').trim();
      const normalized = name.toLowerCase();

      if (!seenNames.has(normalized) && name.length >= 2) {
        // Check if we already have this person with relationship
        const existing = lovedOnes.find(lo => lo.name.toLowerCase() === normalized);
        if (!existing) {
          lovedOnes.push({ name });
          seenNames.add(normalized);
        }
      }
    }

    // Pattern 3: Numbered list format (e.g., "1. **Mary**", "2. **Uncle Robert**")
    const pattern3 = /\d+\.\s+\*\*([^*]+)\*\*/g;
    const matches3 = text.matchAll(pattern3);
    for (const match of matches3) {
      const fullText = match[1].trim();
      // Extract relationship and name if present
      const relationshipMatch = fullText.match(/^(Grandmother|Grandfather|Mother|Father|Sister|Brother|Aunt|Uncle|Cousin|Friend|Wife|Husband|Partner|Son|Daughter|Child|Your\s+\w+)\s+(.+)$/i);

      if (relationshipMatch) {
        const relationship = relationshipMatch[1].replace(/^Your\s+/i, '').charAt(0).toUpperCase() + relationshipMatch[1].replace(/^Your\s+/i, '').slice(1).toLowerCase();
        const name = relationshipMatch[2].trim();
        const normalized = name.toLowerCase();

        if (!seenNames.has(normalized) && name.length >= 2) {
          lovedOnes.push({ name, relationship });
          seenNames.add(normalized);
        }
      } else {
        // Just a name
        const name = fullText.trim();
        const normalized = name.toLowerCase();

        if (!seenNames.has(normalized) && name.length >= 2) {
          const existing = lovedOnes.find(lo => lo.name.toLowerCase() === normalized);
          if (!existing) {
            lovedOnes.push({ name });
            seenNames.add(normalized);
          }
        }
      }
    }

    return lovedOnes;
  };

  // Handle journaling a card-based purchased reading (navigates to tarot journal)
  const handleJournalPurchasedReading = (reading: PurchasedReading) => {
    // Extract card names from the delivery message
    const extractedCards = extractCardNamesFromText(reading.deliverables?.message || '');

    // Store prefill data in sessionStorage for the journal form to pick up
    const prefillData = {
      sourceType: 'SPIRIVERSE',
      spiriReadingId: reading.id,
      practitionerName: reading.service.vendor?.name || '',
      practitionerId: reading.service.vendor?.id || '',
      deckUsed: reading.service.readingOptions?.deckUsed || '',
      date: reading.deliverables?.deliveredAt
        ? new Date(reading.deliverables.deliveredAt).toISOString().split('T')[0]
        : new Date(reading.purchaseDate).toISOString().split('T')[0],
      // Include deliverable message as initial reflection
      reflection: reading.deliverables?.message || '',
      // Include extracted card names so the journal form can prefill them
      cards: extractedCards.map(name => ({ name })),
    };
    sessionStorage.setItem('journal-prefill', JSON.stringify(prefillData));
    setSelectedPurchasedReading(null);
    router.push(`/u/${userId}/space/journal/card-pull?prefill=true`);
  };

  // Handle reflecting on a non-card purchased reading (opens reflection form)
  const handleReflectOnPurchasedReading = (reading: PurchasedReading) => {
    const prefillData: ReflectionPrefillData = {
      date: reading.deliverables?.deliveredAt
        ? new Date(reading.deliverables.deliveredAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      readerName: reading.service.vendor?.name || '',
      readingType: reading.service.readingOptions?.readingType || 'Reading',
      format: 'Pre-recorded', // Async readings are pre-recorded
      mainMessages: reading.deliverables?.message || '',
      sourceReadingId: reading.id,
    };
    setReflectionPrefill(prefillData);
    setSelectedPurchasedReading(null);
  };

  const handleStartReview = () => {
    setReviewRating(0);
    setReviewHeadline('');
    setReviewText('');
    setShowReviewForm(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReading || reviewRating === 0 || !reviewHeadline.trim() || !reviewText.trim()) return;

    try {
      const result = await reviewMutation.mutateAsync({
        requestId: selectedReading.id,
        userId,
        rating: reviewRating,
        headline: reviewHeadline.trim(),
        text: reviewText.trim(),
      });

      if (result.success) {
        setShowReviewForm(false);
        // Update the selected reading to show the review
        setSelectedReading({
          ...selectedReading,
          review: result.review,
        });
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const renderStarRating = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setReviewRating(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500/20 rounded-xl">
            <Inbox className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white">My Readings</h1>
            <p className="text-slate-400 text-sm">Readings you have received from practitioners</p>
          </div>
        </div>

        {/* Filter Tabs */}
        {unifiedReadings.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {(Object.keys(FILTER_CONFIG) as FilterOption[]).map((filter) => {
              const count = filterCounts[filter] || 0;
              const isActive = activeFilter === filter;

              // Don't show filters with 0 count (except "all")
              if (filter !== 'all' && count === 0) return null;

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {FILTER_CONFIG[filter].label}
                  <span className={`ml-1.5 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Readings List */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : unifiedReadings.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No readings yet</p>
              <p className="text-slate-500 text-sm">
                When you request or purchase a reading, it will appear here
              </p>
            </div>
          ) : filteredReadings.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No {FILTER_CONFIG[activeFilter].label.toLowerCase()} readings</p>
              <button
                onClick={() => setActiveFilter('all')}
                className="text-emerald-400 text-sm hover:underline"
              >
                View all readings
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex-grow min-h-0 overflow-y-auto">
              {filteredReadings.map((reading) => {
                const isPurchasedService = reading.type === 'purchased-service';

                return (
                  <div
                    key={`${reading.type}-${reading.id}`}
                    data-testid={`reading-${reading.type}-${reading.id}`}
                    className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Show merchant icon for purchased services */}
                          {isPurchasedService && (
                            <Store className="w-4 h-4 text-purple-400" />
                          )}
                          <h3 className="text-white font-medium">{reading.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            reading.isFulfilled ? 'bg-emerald-500/20 text-emerald-300' :
                            reading.isPending ? 'bg-blue-500/20 text-blue-300' :
                            reading.isInProgress ? 'bg-purple-500/20 text-purple-300' :
                            'bg-slate-500/20 text-slate-300'
                          }`}>
                            {reading.statusLabel}
                          </span>
                          {/* Show review rating if exists */}
                          {reading.originalSpiriReading?.review && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {reading.originalSpiriReading.review.rating}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          {reading.description && (
                            <>
                              <span>{reading.description}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatPrice(reading.price)}</span>
                          {reading.practitionerName && (
                            <>
                              <span>•</span>
                              <span>by {reading.practitionerName}</span>
                            </>
                          )}
                          {reading.completedAt ? (
                            <>
                              <span>•</span>
                              <span>Completed {formatDate(reading.completedAt)}</span>
                            </>
                          ) : (
                            <>
                              <span>•</span>
                              <span>{isPurchasedService ? 'Purchased' : 'Requested'} {formatDate(reading.createdAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {reading.isFulfilled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (reading.originalSpiriReading) {
                              setSelectedReading(reading.originalSpiriReading);
                            } else if (reading.originalPurchasedService) {
                              setSelectedPurchasedReading(reading.originalPurchasedService);
                            }
                          }}
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          data-testid="view-reading-button"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Reading
                        </Button>
                      ) : reading.isPending ? (
                        <div className="flex items-center gap-2 text-blue-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{isPurchasedService ? 'Awaiting practitioner' : 'Awaiting reader'}</span>
                        </div>
                      ) : reading.isInProgress ? (
                        <div className="flex items-center gap-2 text-purple-400 text-sm">
                          <Sparkles className="w-4 h-4" />
                          <span>Being prepared</span>
                        </div>
                      ) : reading.isCancelled ? (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Cancelled</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reading Detail Dialog */}
      <Dialog open={!!selectedReading} onOpenChange={(open) => !open && setSelectedReading(null)}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReading?.readingCategory === 'ASTROLOGY' ? (
                <Star className="w-5 h-5 text-purple-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-emerald-400" />
              )}
              Your {selectedReading?.readingCategory === 'ASTROLOGY' ? 'Astrology' : ''} Reading
            </DialogTitle>
          </DialogHeader>

          {selectedReading && (
            <div className="space-y-6">
              {/* Topic & Spread Info */}
              <Panel dark className="rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">{selectedReading.topic}</h3>
                <p className="text-slate-400 text-sm">
                  {selectedReading.spreadType.replace('_', ' ')} Spread • {formatPrice(selectedReading.price)}
                </p>
                {/* Focus area for astrology */}
                {isAstrologySpread(selectedReading.spreadType) && selectedReading.astrologyData?.focusArea && (
                  <p className="text-purple-400 text-sm mt-1 capitalize">
                    {ASTROLOGY_FOCUS_OPTIONS.find(f => f.value === selectedReading.astrologyData?.focusArea)?.label || selectedReading.astrologyData.focusArea.replaceAll('_', ' ')}
                  </p>
                )}
                {selectedReading.context && (
                  <p className="text-slate-500 text-sm mt-2 italic">
                    Context: {selectedReading.context}
                  </p>
                )}
              </Panel>

              {/* Photo */}
              {selectedReading.photoUrl && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Spread Photo</h4>
                  <img
                    src={selectedReading.photoUrl}
                    alt="Reading spread"
                    className="w-full rounded-lg border border-slate-700"
                  />
                </div>
              )}

              {/* Cards */}
              {selectedReading.cards && selectedReading.cards.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">The Cards</h4>
                  <div className="space-y-3">
                    {selectedReading.cards.map((card, index) => (
                      <div
                        key={index}
                        className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-purple-400 font-medium">{card.position}</span>
                          <span className="text-white">—</span>
                          <span className="text-white">
                            {card.name}
                            {card.reversed && (
                              <span className="text-amber-400 text-sm ml-2">(Reversed)</span>
                            )}
                          </span>
                        </div>
                        {card.interpretation && (
                          <p className="text-slate-400 text-sm">{card.interpretation}</p>
                        )}
                        {card.symbols && card.symbols.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-xs text-slate-500 mb-2">Symbols in this card</p>
                            <div className="flex flex-wrap gap-1.5">
                              {card.symbols.map((symbol, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full"
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
                </div>
              )}

              {/* Overall Message (tarot) */}
              {selectedReading.overallMessage && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Reader&apos;s Message</h4>
                  <div className="bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 rounded-lg p-4">
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedReading.overallMessage}</p>
                  </div>
                </div>
              )}

              {/* Astrology Fulfillment */}
              {selectedReading.astrologyFulfillment && (
                <div className="space-y-4">
                  {/* Chart Image */}
                  {selectedReading.astrologyFulfillment.chartImageUrl && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Your Chart</h4>
                      <img
                        src={selectedReading.astrologyFulfillment.chartImageUrl}
                        alt="Birth chart"
                        className="w-full rounded-lg border border-slate-700"
                      />
                    </div>
                  )}

                  {/* Interpretation */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Interpretation</h4>
                    <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-4">
                      <p className="text-slate-300 whitespace-pre-wrap">{selectedReading.astrologyFulfillment.interpretation}</p>
                    </div>
                  </div>

                  {/* Highlighted Aspects */}
                  {selectedReading.astrologyFulfillment.highlightedAspects && selectedReading.astrologyFulfillment.highlightedAspects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3">Key Aspects</h4>
                      <div className="space-y-3">
                        {selectedReading.astrologyFulfillment.highlightedAspects.map((aspect, index) => (
                          <div
                            key={index}
                            className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4"
                          >
                            <p className="text-purple-300 font-medium mb-1 capitalize">
                              {aspect.planet1} {aspect.aspect} {aspect.planet2}
                            </p>
                            <p className="text-slate-400 text-sm">{aspect.interpretation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practitioner Recommendation */}
                  {selectedReading.astrologyFulfillment.practitionerRecommendation && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-xs text-amber-400 font-medium mb-1">Practitioner Recommendation</p>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedReading.astrologyFulfillment.practitionerRecommendation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Completion Info */}
              {selectedReading.fulfilledAt && (
                <p className="text-slate-500 text-xs text-center">
                  Reading completed on {formatDate(selectedReading.fulfilledAt)}
                </p>
              )}

              {/* Review Section */}
              <div className="pt-4 border-t border-slate-700">
                {selectedReading.review ? (
                  // Display existing review
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-medium text-emerald-400">Your Review</h4>
                    </div>
                    <Panel dark className="rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        {renderStarRating(selectedReading.review.rating)}
                        <span className="text-slate-400 text-sm ml-2">
                          {formatDate(selectedReading.review.createdAt)}
                        </span>
                      </div>
                      <h5 className="text-white font-medium">{selectedReading.review.headline}</h5>
                      <p className="text-slate-400 text-sm">{selectedReading.review.text}</p>
                    </Panel>
                  </div>
                ) : showReviewForm ? (
                  // Review form
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-300">Leave a Review</h4>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="text-slate-500 text-sm hover:text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-2">
                      <Label dark className="text-sm">Rating</Label>
                      {renderStarRating(reviewRating, true)}
                    </div>

                    <div className="space-y-2">
                      <Label dark className="text-sm">Headline</Label>
                      <Input
                        value={reviewHeadline}
                        onChange={(e) => setReviewHeadline(e.target.value)}
                        placeholder="What&apos;s most important to know?"
                        dark
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label dark className="text-sm">Your Review</Label>
                      <Textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this reading..."
                        dark
                        className="min-h-[80px]"
                        maxLength={500}
                      />
                    </div>

                    <Button
                      onClick={handleSubmitReview}
                      disabled={
                        reviewRating === 0 ||
                        !reviewHeadline.trim() ||
                        !reviewText.trim() ||
                        reviewMutation.isPending
                      }
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {reviewMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>

                    {reviewMutation.isError && (
                      <p className="text-red-400 text-sm text-center">
                        Failed to submit review. Please try again.
                      </p>
                    )}
                  </div>
                ) : (
                  // Leave review button
                  <div className="space-y-3">
                    <Button
                      onClick={handleStartReview}
                      variant="outline"
                      className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Leave a Review
                    </Button>
                    <p className="text-slate-500 text-xs text-center">
                      Help other seekers by sharing your experience
                    </p>
                  </div>
                )}
              </div>

              {/* Reflect on this reading button */}
              <div className="pt-4 border-t border-slate-700">
                <Button
                  onClick={() => handleReflectOnReading(selectedReading)}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  data-testid="reflect-on-reading-button"
                >
                  <BookMarked className="w-4 h-4 mr-2" />
                  Reflect on this Reading
                </Button>
                <p className="text-slate-500 text-xs text-center mt-2">
                  Record your thoughts and track how this reading resonates over time
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Reflection Form Dialog */}
      <Dialog open={!!reflectionPrefill} onOpenChange={(open) => !open && setReflectionPrefill(null)}>
        <DialogContent className="border-violet-500/20 sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-violet-400" />
              Reflect on Your Reading
            </DialogTitle>
          </DialogHeader>

          {reflectionPrefill && (
            <ReflectionForm
              userId={userId}
              prefillData={reflectionPrefill}
              onSuccess={handleReflectionSuccess}
            />
          )}
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Purchased Reading Detail Dialog */}
      <Dialog open={!!selectedPurchasedReading} onOpenChange={(open) => !open && setSelectedPurchasedReading(null)}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="reading-detail-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-400" />
              Your Reading
            </DialogTitle>
          </DialogHeader>

          {selectedPurchasedReading && (
            <div className="space-y-6">
              {/* Service Info */}
              <Panel dark className="rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">{selectedPurchasedReading.service.name}</h3>
                <p className="text-slate-400 text-sm">
                  by {selectedPurchasedReading.service.vendor?.name} • {formatPrice(selectedPurchasedReading.price?.amount ?? 0)}
                </p>
                {selectedPurchasedReading.service.description && (
                  <p className="text-slate-500 text-sm mt-2">
                    {selectedPurchasedReading.service.description}
                  </p>
                )}
              </Panel>

              {/* Questionnaire Responses */}
              {selectedPurchasedReading.questionnaireResponses && selectedPurchasedReading.questionnaireResponses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Your Responses</h4>
                  <div className="space-y-3">
                    {selectedPurchasedReading.questionnaireResponses.map((response, idx) => (
                      <div key={response.questionId || idx} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                        <p className="text-slate-400 text-sm mb-1">{response.question}</p>
                        <p className="text-white">{response.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {selectedPurchasedReading.deliverables && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Your Reading</h4>

                  {/* Message from practitioner */}
                  {selectedPurchasedReading.deliverables.message && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                      <p className="text-slate-300 whitespace-pre-wrap">{selectedPurchasedReading.deliverables.message}</p>
                    </div>
                  )}

                  {/* Deliverable files */}
                  {selectedPurchasedReading.deliverables.files && selectedPurchasedReading.deliverables.files.length > 0 && (
                    <div className="space-y-2">
                      {selectedPurchasedReading.deliverables.files.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-emerald-500/30 transition-colors"
                        >
                          <Download className="w-5 h-5 text-emerald-400" />
                          <div className="flex-1">
                            <p className="text-white text-sm">{file.name}</p>
                            <p className="text-slate-500 text-xs">{file.type}</p>
                          </div>
                          <span className="text-emerald-400 text-sm">Download</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Completion Info */}
              {selectedPurchasedReading.deliverables?.deliveredAt && (
                <p className="text-slate-500 text-xs text-center">
                  Reading delivered on {formatDate(selectedPurchasedReading.deliverables.deliveredAt)}
                </p>
              )}

              {/* Review Section - For reviewing the SERVICE */}
              <div className="pt-4 border-t border-slate-700">
                {showServiceReviewForm ? (
                  // Show review form
                  <div className="space-y-4">
                    <div>
                      <Label dark className="text-sm">Your Rating</Label>
                      <div className="flex gap-1 mt-1" data-testid="review-rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setServiceReviewRating(star)}
                            className="p-1 hover:scale-110 transition-transform"
                            data-testid={`review-star-${star}`}
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= serviceReviewRating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="review-headline" dark className="text-sm">
                        Headline
                      </Label>
                      <Input
                        id="review-headline"
                        data-testid="review-headline-input"
                        placeholder="Sum up your experience in a few words"
                        value={serviceReviewHeadline}
                        onChange={(e) => setServiceReviewHeadline(e.target.value)}
                        maxLength={100}
                        dark
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="review-text" dark className="text-sm">
                        Your Review
                      </Label>
                      <Textarea
                        id="review-text"
                        data-testid="review-text-input"
                        placeholder="Share your experience with this service..."
                        value={serviceReviewText}
                        onChange={(e) => setServiceReviewText(e.target.value)}
                        maxLength={500}
                        rows={4}
                        dark
                        className="mt-1"
                      />
                      <p className="text-slate-500 text-xs mt-1">{serviceReviewText.length}/500 characters</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowServiceReviewForm(false);
                          setServiceReviewRating(0);
                          setServiceReviewHeadline('');
                          setServiceReviewText('');
                        }}
                        className="flex-1 border-slate-600 hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitServiceReview}
                        disabled={isSubmittingServiceReview}
                        className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                        data-testid="submit-review-btn"
                      >
                        {isSubmittingServiceReview ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Review'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Show button to open form
                  <Button
                    onClick={() => setShowServiceReviewForm(true)}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                    data-testid="leave-review-btn"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Leave a Review
                  </Button>
                )}
              </div>

              {/* Smart Journal/Reflect Button - Only show for delivered readings */}
              {selectedPurchasedReading.orderStatus === 'DELIVERED' && (
                <div className="pt-4 border-t border-slate-700">
                  {isCardBasedReading(selectedPurchasedReading) ? (
                    // Tarot/Oracle readings → Journal the Cards
                    <>
                      <Button
                        onClick={() => handleJournalPurchasedReading(selectedPurchasedReading)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      >
                        <NotebookPen className="w-4 h-4 mr-2" />
                        Journal the Cards
                      </Button>
                      <p className="text-slate-500 text-xs text-center mt-2">
                        Record the cards pulled and track your insights over time
                      </p>
                    </>
                  ) : isAstrologyReading(selectedPurchasedReading) ? (
                    // Astrology readings → Journal about this
                    <>
                      <Button
                        onClick={() => handleJournalAstrologyReading(selectedPurchasedReading)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        data-testid="journal-astrology-button"
                      >
                        <NotebookPen className="w-4 h-4 mr-2" />
                        Journal About This
                      </Button>
                      <p className="text-slate-500 text-xs text-center mt-2">
                        Record your insights in your astrology journal
                      </p>
                    </>
                  ) : (
                    // Other readings → Reflect on this Reading
                    <>
                      <Button
                        onClick={() => handleReflectOnPurchasedReading(selectedPurchasedReading)}
                        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        data-testid="reflect-on-reading-button"
                      >
                        <BookMarked className="w-4 h-4 mr-2" />
                        Reflect on this Reading
                      </Button>
                      <p className="text-slate-500 text-xs text-center mt-2">
                        Record your thoughts and track how this reading resonates over time
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
