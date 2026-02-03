// Spread types available for reading requests
export type SpreadType = 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD';

// Status of a reading request
export type ReadingRequestStatus =
  | 'PENDING_PAYMENT'  // Created, waiting for payment method to be saved
  | 'AWAITING_CLAIM'   // Payment method saved, waiting for reader to claim
  | 'CLAIMED'          // Reader has claimed, working on fulfillment
  | 'FULFILLED'        // Reading completed, payment captured
  | 'CANCELLED'
  | 'EXPIRED';

// Spread configuration with pricing
export interface SpreadConfig {
  type: SpreadType;
  label: string;
  cardCount: number;
  price: number; // In cents
  description: string;
}

// Card in a fulfilled reading
export interface ReadingCard {
  name: string;
  reversed: boolean;
  position: string;
  interpretation: string;
  symbols?: string[]; // Auto-extracted symbols from card name
}

// Review for a reading
export interface ReadingReview {
  id: string;
  rating: number;
  headline: string;
  text: string;
  createdAt: string;
  userId: string;
  userName?: string;
}

// Stripe payment details
export interface ReadingRequestStripe {
  setupIntentId?: string;
  setupIntentSecret?: string;
  paymentIntentId?: string;
}

// Reading request type
export interface ReadingRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;

  spreadType: SpreadType;
  topic: string;
  context?: string;

  // Payment info (using setup intent like cart checkout)
  stripe?: ReadingRequestStripe;
  stripeCustomerId?: string;

  price: number;
  platformFee: number;
  readerPayout: number;

  requestStatus: ReadingRequestStatus;
  claimedBy?: string;
  claimedAt?: string;

  // Fulfilled reading data
  photoUrl?: string;
  cards?: ReadingCard[];
  overallMessage?: string;
  fulfilledAt?: string;

  createdAt: string;
  updatedAt: string;
  expiresAt?: string;

  // User's review of the reading (only present after review submitted)
  review?: ReadingReview;

  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

// Form input for creating a reading request
export interface CreateReadingRequestInput {
  userId: string;
  spreadType: SpreadType;
  topic: string;
  context?: string;
  paymentMethodId?: string; // If provided, use existing saved card
}

// Response types
export interface ReadingRequestResponse {
  success: boolean;
  message?: string;
  readingRequest?: ReadingRequest;
  checkoutUrl?: string;
}

// Helper to format price from cents to dollars
export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

// Status display labels and colors
export const STATUS_CONFIG: Record<ReadingRequestStatus, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'text-yellow-400' },
  AWAITING_CLAIM: { label: 'Awaiting Reader', color: 'text-blue-400' },
  CLAIMED: { label: 'Being Prepared', color: 'text-purple-400' },
  FULFILLED: { label: 'Completed', color: 'text-green-400' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-400' },
  EXPIRED: { label: 'Expired', color: 'text-red-400' },
};

// Topic options for reading requests
export const READING_TOPICS = [
  { value: 'love', label: 'Love & Romance' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'career', label: 'Career & Work' },
  { value: 'finances', label: 'Finances & Money' },
  { value: 'health', label: 'Health & Wellbeing' },
  { value: 'family', label: 'Family' },
  { value: 'spiritual', label: 'Spiritual Growth' },
  { value: 'life-path', label: 'Life Path & Purpose' },
  { value: 'decisions', label: 'Decision Making' },
  { value: 'general', label: 'General Guidance' },
  { value: 'other', label: 'Other' },
] as const;

export type ReadingTopic = typeof READING_TOPICS[number]['value'];
