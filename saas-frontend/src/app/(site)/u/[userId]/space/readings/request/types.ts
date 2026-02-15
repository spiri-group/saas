// ============================================
// Reading Categories
// ============================================

export type ReadingRequestCategory = 'TAROT' | 'ASTROLOGY';

// ============================================
// Spread Types
// ============================================

// Tarot spreads
export type TarotSpreadType = 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD';

// Astrology tiers
export type AstrologySpreadType = 'ASTRO_SNAPSHOT' | 'ASTRO_FOCUS' | 'ASTRO_DEEP_DIVE';

// Combined (backward-compatible)
export type SpreadType = TarotSpreadType | AstrologySpreadType;

// ============================================
// Astrology Focus Areas
// ============================================

export type AstrologyFocusArea =
  | 'birth_chart'
  | 'transit'
  | 'compatibility'
  | 'solar_return'
  | 'single_planet'
  | 'life_area';

export const ASTROLOGY_FOCUS_OPTIONS: { value: AstrologyFocusArea; label: string; description: string; requiresPartner?: boolean }[] = [
  { value: 'birth_chart', label: 'Birth Chart', description: 'What stands out in my chart?' },
  { value: 'transit', label: 'Current Transits', description: 'What&apos;s happening for me right now?' },
  { value: 'compatibility', label: 'Compatibility', description: 'How compatible are we?', requiresPartner: true },
  { value: 'solar_return', label: 'Solar Return', description: 'What does my year ahead look like?' },
  { value: 'single_planet', label: 'Planet Focus', description: 'Deep dive on a specific planet' },
  { value: 'life_area', label: 'Life Area', description: 'Career, love, or purpose in my chart' },
];

export const PLANET_OPTIONS = [
  { value: 'sun', label: 'Sun' },
  { value: 'moon', label: 'Moon' },
  { value: 'mercury', label: 'Mercury' },
  { value: 'venus', label: 'Venus' },
  { value: 'mars', label: 'Mars' },
  { value: 'jupiter', label: 'Jupiter' },
  { value: 'saturn', label: 'Saturn' },
  { value: 'uranus', label: 'Uranus' },
  { value: 'neptune', label: 'Neptune' },
  { value: 'pluto', label: 'Pluto' },
  { value: 'chiron', label: 'Chiron' },
  { value: 'northnode', label: 'North Node' },
];

export const LIFE_AREA_OPTIONS = [
  { value: 'career', label: 'Career & Vocation' },
  { value: 'love', label: 'Love & Relationships' },
  { value: 'purpose', label: 'Life Purpose' },
  { value: 'finances', label: 'Finances & Abundance' },
  { value: 'health', label: 'Health & Vitality' },
  { value: 'creativity', label: 'Creativity & Expression' },
];

// ============================================
// Astrology Data Types
// ============================================

export interface ReadingBirthLocation {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ReadingBirthData {
  birthDate: string;
  birthTimePrecision: 'exact' | 'approximate' | 'unknown';
  birthTime?: string;
  birthTimeApproximate?: 'morning' | 'afternoon' | 'evening' | 'night';
  birthLocation: ReadingBirthLocation;
}

export interface AstrologyRequestData {
  focusArea: AstrologyFocusArea;
  birthData: ReadingBirthData;
  partnerBirthData?: ReadingBirthData;
  specificPlanet?: string;
  specificLifeArea?: string;
}

// ============================================
// Astrology Fulfillment Types
// ============================================

export interface HighlightedAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  interpretation: string;
}

export interface AstrologyFulfillment {
  interpretation: string;
  highlightedAspects?: HighlightedAspect[];
  chartImageUrl?: string;
  practitionerRecommendation?: string;
}

// ============================================
// Status / Config
// ============================================

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
  category: ReadingRequestCategory;
  label: string;
  cardCount: number;
  price: number; // In cents
  description: string;
}

// ============================================
// Card / Review Types
// ============================================

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

// ============================================
// Reading Request
// ============================================

// Reading request type
export interface ReadingRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;

  readingCategory: ReadingRequestCategory;
  spreadType: SpreadType;
  topic: string;
  context?: string;

  // Astrology-specific request data
  astrologyData?: AstrologyRequestData;

  // Payment info (using setup intent like cart checkout)
  stripe?: ReadingRequestStripe;
  stripeCustomerId?: string;

  price: number;
  platformFee: number;
  readerPayout: number;

  requestStatus: ReadingRequestStatus;
  claimedBy?: string;
  claimedAt?: string;

  // Tarot fulfilled reading data
  photoUrl?: string;
  cards?: ReadingCard[];
  overallMessage?: string;

  // Astrology fulfilled reading data
  astrologyFulfillment?: AstrologyFulfillment;

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

// ============================================
// Input Types
// ============================================

// Form input for creating a reading request
export interface CreateReadingRequestInput {
  userId: string;
  readingCategory?: ReadingRequestCategory;
  spreadType: SpreadType;
  topic: string;
  context?: string;
  paymentMethodId?: string; // If provided, use existing saved card
  astrologyData?: AstrologyRequestData;
}

// Response types
export interface ReadingRequestResponse {
  success: boolean;
  message?: string;
  readingRequest?: ReadingRequest;
  checkoutUrl?: string;
}

// ============================================
// Helpers & Constants
// ============================================

// Helper to format price from cents to dollars
export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

// Check if a spread type is an astrology type
export const isAstrologySpread = (type: SpreadType): boolean => {
  return type.startsWith('ASTRO_');
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

// Topic options for reading requests (used for both tarot and astrology)
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
