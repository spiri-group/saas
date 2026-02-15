import { recordref_type } from "../0_shared/types";

// ============================================
// Reading Categories
// ============================================

// Top-level category for reading requests
export type reading_request_category = 'TAROT' | 'ASTROLOGY';

// ============================================
// Spread Types
// ============================================

// Tarot spread types
export type tarot_spread_type = 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD';

// Astrology reading tiers
export type astrology_spread_type = 'ASTRO_SNAPSHOT' | 'ASTRO_FOCUS' | 'ASTRO_DEEP_DIVE';

// Combined spread type (backward-compatible)
export type spread_type = tarot_spread_type | astrology_spread_type;

// ============================================
// Astrology Focus Areas
// ============================================

export type astrology_focus_area =
  | 'birth_chart'       // "What stands out in my chart?"
  | 'transit'           // "What's happening for me right now?"
  | 'compatibility'     // "How compatible are we?" (requires partner data)
  | 'solar_return'      // "What does my year ahead look like?"
  | 'single_planet'     // "Tell me about my Venus/Mars/Saturn"
  | 'life_area';        // "Career/Love/Purpose in my chart"

// ============================================
// Astrology Birth Data (for reading requests)
// ============================================

export interface reading_birth_data_type {
  birthDate: string;                          // ISO date "1990-03-15"
  birthTimePrecision: 'exact' | 'approximate' | 'unknown';
  birthTime?: string;                         // "14:30" if exact
  birthTimeApproximate?: 'morning' | 'afternoon' | 'evening' | 'night';
  birthLocation: {
    city: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

// Astrology-specific request data
export interface astrology_request_data_type {
  focusArea: astrology_focus_area;
  birthData: reading_birth_data_type;
  partnerBirthData?: reading_birth_data_type;  // For compatibility readings
  specificPlanet?: string;                      // For single_planet focus (e.g., "venus", "saturn")
  specificLifeArea?: string;                    // For life_area focus (e.g., "career", "love")
}

// ============================================
// Astrology Fulfillment Data
// ============================================

// An aspect highlighted by the practitioner in their reading
export interface highlighted_aspect_type {
  planet1: string;
  planet2: string;
  aspect: string;         // e.g., "conjunction", "square", "trine"
  interpretation: string;
}

// Astrology-specific fulfillment data
export interface astrology_fulfillment_type {
  interpretation: string;                      // Main written interpretation
  highlightedAspects?: highlighted_aspect_type[];
  chartImageUrl?: string;                      // Chart screenshot/export
  practitionerRecommendation?: string;         // Upsell: "I'd recommend exploring X further"
}

// Status of a reading request
export type reading_request_status =
  | 'PENDING_PAYMENT'  // Created, waiting for payment method to be saved
  | 'AWAITING_CLAIM'   // Payment method saved, waiting for a reader to claim
  | 'CLAIMED'          // Reader has claimed it, working on fulfillment
  | 'FULFILLED'        // Reader has completed the reading, payment captured
  | 'CANCELLED'        // User cancelled (refund if paid)
  | 'EXPIRED';         // Not claimed within time limit

// ============================================
// Spread Configurations
// ============================================

// Spread type configuration with pricing
export interface spread_config {
  type: spread_type;
  category: reading_request_category;
  label: string;
  cardCount: number;  // For tarot; 0 for astrology
  price: number;      // In cents
  description: string;
}

// Tarot spread configs
export const TAROT_SPREAD_CONFIGS: spread_config[] = [
  {
    type: 'SINGLE',
    category: 'TAROT',
    label: 'Single Card',
    cardCount: 1,
    price: 500, // $5.00
    description: 'Quick guidance on a specific question'
  },
  {
    type: 'THREE_CARD',
    category: 'TAROT',
    label: 'Three Card',
    cardCount: 3,
    price: 1200, // $12.00
    description: 'Past, Present, Future or Situation, Action, Outcome'
  },
  {
    type: 'FIVE_CARD',
    category: 'TAROT',
    label: 'Five Card',
    cardCount: 5,
    price: 2000, // $20.00
    description: 'Deeper exploration with multiple perspectives'
  }
];

// Astrology spread configs
export const ASTROLOGY_SPREAD_CONFIGS: spread_config[] = [
  {
    type: 'ASTRO_SNAPSHOT',
    category: 'ASTROLOGY',
    label: 'Chart Snapshot',
    cardCount: 0,
    price: 800, // $8.00
    description: '1-2 key highlights from your chart or current transits'
  },
  {
    type: 'ASTRO_FOCUS',
    category: 'ASTROLOGY',
    label: 'Focused Reading',
    cardCount: 0,
    price: 1500, // $15.00
    description: 'Deep dive on one area: a planet, house, transit, or quick compatibility'
  },
  {
    type: 'ASTRO_DEEP_DIVE',
    category: 'ASTROLOGY',
    label: 'Full Reading',
    cardCount: 0,
    price: 2500, // $25.00
    description: 'Comprehensive birth chart, transit forecast, or full synastry analysis'
  }
];

// All spread configs combined (backward-compatible)
export const SPREAD_CONFIGS: spread_config[] = [
  ...TAROT_SPREAD_CONFIGS,
  ...ASTROLOGY_SPREAD_CONFIGS,
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
  readingCategory: reading_request_category; // 'TAROT' or 'ASTROLOGY'
  spreadType: spread_type;
  topic: string; // What they want guidance on
  context?: string; // Additional context (optional)

  // Astrology-specific request data (only for ASTROLOGY category)
  astrologyData?: astrology_request_data_type;

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

  // Tarot reading result (when fulfilled) — backward-compatible
  photoUrl?: string;
  cards?: reading_card_type[];
  overallMessage?: string; // Reader's overall message/summary

  // Astrology reading result (when fulfilled)
  astrologyFulfillment?: astrology_fulfillment_type;

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
  readingCategory?: reading_request_category; // Defaults to 'TAROT' for backward compatibility
  spreadType: spread_type;
  topic: string;
  context?: string;
  paymentMethodId?: string; // If provided, use existing saved card instead of creating setup intent
  // Astrology-specific input
  astrologyData?: astrology_request_data_type;
}

export interface claim_reading_request_input {
  requestId: string;
  readerId: string; // Merchant claiming it
}

// Tarot fulfillment input (backward-compatible)
export interface fulfill_reading_request_input {
  requestId: string;
  readerId: string;
  photoUrl: string;
  cards: reading_card_type[];
  overallMessage?: string;
}

// Astrology fulfillment input
export interface fulfill_astrology_reading_request_input {
  requestId: string;
  readerId: string;
  interpretation: string;
  highlightedAspects?: highlighted_aspect_type[];
  chartImageUrl?: string;
  practitionerRecommendation?: string;
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
