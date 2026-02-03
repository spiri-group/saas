import { recordref_type } from "../0_shared/types";

// Spread types available for reading requests
export type spread_type = 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD';

// Status of a reading request
export type reading_request_status =
  | 'PENDING_PAYMENT'  // Created, waiting for payment method to be saved
  | 'AWAITING_CLAIM'   // Payment method saved, waiting for a reader to claim
  | 'CLAIMED'          // Reader has claimed it, working on fulfillment
  | 'FULFILLED'        // Reader has completed the reading, payment captured
  | 'CANCELLED'        // User cancelled (refund if paid)
  | 'EXPIRED';         // Not claimed within time limit

// Spread type configuration with pricing
export interface spread_config {
  type: spread_type;
  label: string;
  cardCount: number;
  price: number; // In cents
  description: string;
}

export const SPREAD_CONFIGS: spread_config[] = [
  {
    type: 'SINGLE',
    label: 'Single Card',
    cardCount: 1,
    price: 500, // $5.00
    description: 'Quick guidance on a specific question'
  },
  {
    type: 'THREE_CARD',
    label: 'Three Card',
    cardCount: 3,
    price: 1200, // $12.00
    description: 'Past, Present, Future or Situation, Action, Outcome'
  },
  {
    type: 'FIVE_CARD',
    label: 'Five Card',
    cardCount: 5,
    price: 2000, // $20.00
    description: 'Deeper exploration with multiple perspectives'
  }
];

// Card in a fulfilled reading
export interface reading_card_type {
  name: string;
  reversed: boolean;
  position: string; // e.g., "Past", "Present", "Future", "Card 1", etc.
  interpretation: string;
  symbols?: string[]; // Auto-extracted symbols from card name
}

// Review for a reading
export interface reading_review_type {
  id: string;
  rating: number; // 1-5 stars
  headline: string;
  text: string;
  createdAt: string;
  userId: string;
  userName?: string;
}

// Reading request document
export interface reading_request_type {
  id: string;
  docType: 'READING_REQUEST';

  // Requester info
  userId: string;
  userEmail?: string;
  userName?: string;

  // Request details
  spreadType: spread_type;
  topic: string; // What they want guidance on
  context?: string; // Additional context (optional)

  // Pricing
  price: number; // In cents
  platformFee: number; // Platform cut in cents
  readerPayout: number; // What the reader gets in cents

  // Payment - using setup intent like cart checkout
  stripe?: reading_request_stripe_type;
  stripeCustomerId?: string; // User's Stripe customer ID
  paidAt?: string;

  // Fulfillment
  requestStatus: reading_request_status; // Named to avoid conflict with Cosmos record-level 'status' field
  claimedBy?: string; // Merchant/reader userId
  claimedAt?: string;
  claimDeadline?: string; // Shotclock - reader must fulfill by this time

  // Reading result (when fulfilled)
  photoUrl?: string;
  cards?: reading_card_type[];
  overallMessage?: string; // Reader's overall message/summary
  fulfilledAt?: string;

  // User's review of the reading
  review?: reading_review_type;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // When unclaimed request expires

  // Cosmos
  _id?: string;
  ref?: recordref_type;
}

// Stripe details for payment
export interface reading_request_stripe_type {
  setupIntentId?: string;
  setupIntentSecret?: string;
  paymentMethodId?: string;    // Saved payment method from setup intent
  paymentIntentId?: string;    // Created when merchant claims
  chargeId?: string;           // From successful payment
  connectedAccountId?: string; // Reader's connected account
}

// Input types
export interface create_reading_request_input {
  userId: string;
  spreadType: spread_type;
  topic: string;
  context?: string;
  paymentMethodId?: string; // If provided, use existing saved card instead of creating setup intent
}

export interface claim_reading_request_input {
  requestId: string;
  readerId: string; // Merchant claiming it
}

export interface fulfill_reading_request_input {
  requestId: string;
  readerId: string;
  photoUrl: string;
  cards: reading_card_type[];
  overallMessage?: string;
}

// Response types
export interface reading_request_response {
  success: boolean;
  message?: string;
  readingRequest?: reading_request_type;
  checkoutUrl?: string; // Stripe checkout URL for payment
}

export interface reading_request_list_response {
  success: boolean;
  requests: reading_request_type[];
  total: number;
}

// Review input
export interface review_reading_request_input {
  requestId: string;
  userId: string;
  rating: number;
  headline: string;
  text: string;
}

// Review response
export interface review_reading_request_response {
  success: boolean;
  message?: string;
  review?: reading_review_type;
}
