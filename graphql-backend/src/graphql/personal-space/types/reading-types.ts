import { recordref_type } from "../../0_shared/types";

// ============================================
// Reading Source Types
// ============================================

// Where did this reading come from?
export type reading_source_type = 'SELF' | 'SPIRIVERSE' | 'EXTERNAL';

// External platform types
export type external_platform_type = 'TIKTOK' | 'YOUTUBE' | 'IN_PERSON' | 'PODCAST' | 'OTHER';

// Source details - varies based on source type
export interface reading_source_details {
  // SELF - pulled cards myself
  deck?: string;

  // SPIRIVERSE - reading from a practitioner on platform
  spiriReadingId?: string;
  practitionerName?: string;
  practitionerId?: string;

  // EXTERNAL - TikTok, YouTube, in-person reader, etc.
  platform?: external_platform_type;
  readerName?: string;
  sourceUrl?: string;
  channelName?: string; // For YouTube/TikTok creators
}

// ============================================
// Symbol Types (Shared across entries)
// ============================================

// Symbol category
export type symbol_category =
  | 'ELEMENT'    // water, fire, air, earth
  | 'ANIMAL'     // snake, owl, wolf, etc.
  | 'ARCHETYPE'  // mother, trickster, sage, etc.
  | 'OBJECT'     // key, mirror, tower, etc.
  | 'PLACE'      // forest, ocean, house, etc.
  | 'PERSON'     // stranger, child, guide, etc.
  | 'ACTION'     // flying, falling, running, etc.
  | 'CELESTIAL'  // moon, sun, stars, etc.
  | 'OTHER';

// Symbol tag attached to an entry
export interface symbol_tag {
  symbolId?: string;        // Reference to master Symbol (if exists)
  name: string;             // "water", "snake", "moon"
  category?: symbol_category;
  context?: string;         // "drowning in water" vs "calm lake"
  autoExtracted: boolean;   // true if from card mapping, false if manual
}

// Master Symbol (system-wide reference)
export interface symbol_type {
  id: string;
  docType: 'SYMBOL';
  name: string;
  normalizedName: string;   // lowercase, trimmed for matching
  category: symbol_category;
  systemMeanings: string[]; // ["emotions", "subconscious", "cleansing"]
  associatedCards: string[]; // ["The Moon", "Ace of Cups"]
  isSystemSymbol: boolean;  // true = provided by us
  createdAt: string;
}

// User's personal meaning for a symbol
export interface user_symbol_meaning_type {
  id: string;
  docType: 'USER_SYMBOL_MEANING';
  userId: string;
  symbolId: string;
  symbolName: string;
  personalMeaning: string;
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  firstSeen: string;
  lastSeen: string;
  commonContexts: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Card Types
// ============================================

// Journal card type for individual cards in a personal reading (renamed to avoid collision)
export interface journal_card_type {
  name: string;
  reversed: boolean;
  spreadPosition?: string; // e.g., "Past", "Present", "Future"
  interpretation?: string; // Per-card interpretation/reflection
}

// ============================================
// Reading Entry (Enhanced from Daily Card Pull)
// ============================================

// Reading Entry document type - the journal entry for any reading
export interface reading_entry_type {
  id: string;
  userId: string;
  docType: 'READING_ENTRY';

  // Required fields
  date: string; // ISO date string (YYYY-MM-DD)

  // SOURCE - Where did this reading come from?
  sourceType: reading_source_type;
  sourceDetails: reading_source_details;

  // CARDS
  cards: journal_card_type[];
  spreadType?: string; // "Single pull", "3-card", "Celtic Cross", etc.

  // REFLECTION
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number; // 1-5 how much did it resonate

  // SYMBOLS (extracted from cards + manual)
  symbols: symbol_tag[];
  themes: string[]; // User-defined themes/tags

  // TRACKING OVER TIME
  followUpDate?: string;
  outcome?: string; // What actually happened? (filled in later)

  // MEDIA
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Cosmos DB internal
  _id?: string;
  ref?: recordref_type;
}

// Legacy alias for backwards compatibility
export type daily_card_pull_type = reading_entry_type;

// Input types
export interface create_reading_entry_input {
  userId: string;
  date?: string; // Defaults to today if not provided

  // Source
  sourceType: reading_source_type;
  sourceDetails: reading_source_details;

  // Cards
  cards: card_input[];
  spreadType?: string;

  // Reflection
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;

  // Symbols
  symbols?: symbol_tag_input[];
  themes?: string[];

  // Tracking
  followUpDate?: string;

  // Media
  photoUrl?: string;
}

// Legacy input type for backwards compatibility with old API
export interface legacy_create_card_pull_input {
  userId: string;
  date?: string;
  deck: string;  // Legacy: deck at top level
  cards: card_input[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
}

// Legacy alias - use legacy type for old API
export type create_card_pull_input = legacy_create_card_pull_input;

export interface card_input {
  name: string;
  reversed: boolean;
  spreadPosition?: string;
  interpretation?: string;
}

export interface symbol_tag_input {
  symbolId?: string;
  name: string;
  category?: symbol_category;
  context?: string;
  autoExtracted?: boolean;
}

export interface update_reading_entry_input {
  id: string;
  userId: string;

  // Source (can update details but not type)
  sourceDetails?: reading_source_details;

  // Cards
  cards?: card_input[];
  spreadType?: string;

  // Reflection
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;

  // Symbols
  symbols?: symbol_tag_input[];
  themes?: string[];

  // Tracking
  followUpDate?: string;
  outcome?: string;

  // Media
  photoUrl?: string;
}

// Legacy input type for backwards compatibility with old API
export interface legacy_update_card_pull_input {
  id: string;
  userId: string;
  deck?: string;  // Legacy: deck at top level
  cards?: card_input[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
}

// Legacy alias - use legacy type for old API
export type update_card_pull_input = legacy_update_card_pull_input;

// Response types
export interface reading_entry_response {
  success: boolean;
  message?: string;
  readingEntry?: reading_entry_type;
}

// Legacy response type with cardPull field
export interface legacy_card_pull_response {
  success: boolean;
  message?: string;
  cardPull?: reading_entry_type;
}

// Legacy alias
export type card_pull_response = legacy_card_pull_response;

export interface delete_reading_entry_response {
  success: boolean;
  message?: string;
}

// Legacy alias
export type delete_card_pull_response = delete_reading_entry_response;

// Filter types for queries
export interface reading_entry_filters {
  startDate?: string;
  endDate?: string;
  sourceType?: reading_source_type;
  deck?: string; // For SELF source type
  hasQuestion?: boolean;
  hasSymbol?: string; // Filter by symbol name
  limit?: number;
  offset?: number;
}

// Legacy alias
export type card_pull_filters = reading_entry_filters;

// ============================================
// Card Pattern Statistics Types
// ============================================

export interface card_frequency {
  name: string;
  count: number;
  reversedCount: number;
  lastPulled: string;
}

export interface suit_distribution {
  suit: string;
  count: number;
  percentage: number;
}

export type PatternPeriod = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEAR' | 'ALL_TIME';

export interface card_pattern_stats {
  // Overall counts
  totalReadings: number;
  totalCards: number;
  uniqueCards: number;

  // Time-based
  readingsThisWeek: number;
  readingsThisMonth: number;

  // Card frequency
  topCards: card_frequency[];
  recentCards: card_frequency[];

  // Suit analysis
  suitDistribution: suit_distribution[];

  // Major vs Minor
  majorArcanaCount: number;
  minorArcanaCount: number;
  majorArcanaPercentage: number;

  // Reversed stats
  totalReversed: number;
  reversedPercentage: number;

  // Source breakdown
  selfReadings: number;
  externalReadings: number;
  spiriverseReadings: number;

  // Period info
  periodStart?: string;
  periodEnd?: string;

  // Comparison with previous period
  previousPeriodReadings?: number;
  readingsChange?: number;
  readingsChangePercent?: number;

  // Emerging patterns - cards appearing more frequently recently
  emergingCards?: card_frequency[];
  // Cards that appeared in previous period but not this one
  fadingCards?: card_frequency[];
}

// ============================================
// Symbol Pattern Statistics Types
// ============================================

export interface symbol_occurrence {
  symbolName: string;
  category?: symbol_category;
  totalCount: number;
  dreamCount: number;
  readingCount: number;
  lastSeen: string;
  personalMeaning?: string;
}

export interface symbol_pattern_stats {
  // Overall counts
  totalSymbols: number;
  totalOccurrences: number;

  // Top symbols by frequency
  topSymbols: symbol_occurrence[];

  // Symbols appearing in both dreams and readings
  crossEntrySymbols: symbol_occurrence[];

  // Category breakdown
  categoryBreakdown: { category: string; count: number; percentage: number }[];

  // Recent symbol activity
  recentSymbols: symbol_occurrence[];
}
