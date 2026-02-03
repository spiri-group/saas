import { recordref_type } from "../../0_shared/types";
import { symbol_tag, symbol_tag_input } from "./reading-types";

// ============================================
// Mediumship Types
// ============================================

// Message source - who/what delivered the message
export type spirit_source =
  | 'guide'           // Spirit guide
  | 'loved_one'       // Deceased loved one
  | 'angel'           // Angelic being
  | 'ancestor'        // Ancestral spirit
  | 'higher_self'     // Higher self
  | 'unknown'         // Unknown source
  | 'collective'      // Collective consciousness
  | 'nature_spirit'   // Elemental/nature spirit
  | 'other';

// Method of receiving message
export type reception_method =
  | 'clairvoyance'    // Seeing
  | 'clairaudience'   // Hearing
  | 'clairsentience'  // Feeling
  | 'claircognizance' // Knowing
  | 'dreams'          // Dream visitation
  | 'meditation'      // During meditation
  | 'automatic_writing'
  | 'pendulum'
  | 'cards'           // Oracle/tarot
  | 'signs'           // Signs and synchronicities
  | 'other';

// ============================================
// Synchronicity Log (Core - day one, after 7 days active)
// ============================================

export interface synchronicity_type {
  id: string;
  userId: string;
  docType: 'SYNCHRONICITY';

  // Required
  date: string;
  title: string;               // Brief title
  description: string;         // What happened

  // Details
  time?: string;               // Time of occurrence
  location?: string;           // Where it happened
  witnesses?: string;          // Was anyone else there?

  // Interpretation
  possibleMeaning?: string;    // What you think it means
  relatedTo?: string;          // What situation/question it relates to
  confirmedMeaning?: string;   // What it turned out to mean (add later)

  // Patterns
  recurringTheme?: boolean;    // Is this part of a pattern?
  relatedSynchronicities?: string[]; // IDs of related entries
  symbols?: symbol_tag[];      // Symbols present

  // Rating
  significanceScore?: number;  // 1-5 how significant it felt

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Spirit Messages (Progressive - after first Reading Reflection entry)
// ============================================

export interface spirit_message_type {
  id: string;
  userId: string;
  docType: 'SPIRIT_MESSAGE';

  // Required
  date: string;
  messageContent: string;      // The actual message received

  // Source
  source: spirit_source;
  sourceName?: string;         // Name if known (e.g., "Grandma Rose")
  sourceDescription?: string;  // Description of how they appeared/felt

  // Reception
  receptionMethod: reception_method;
  receptionContext?: string;   // What were you doing when received?
  clarity?: number;            // 1-5 how clear was the message

  // Validation
  evidentialDetails?: string;  // Details that could be verified
  validated?: boolean;         // Was the message validated?
  validationNotes?: string;    // How it was validated

  // Interpretation
  interpretation?: string;     // Your interpretation
  actionTaken?: string;        // What you did with the message
  outcome?: string;            // What happened after

  // Emotions
  emotionsDuring?: string[];   // How you felt receiving it
  emotionsAfter?: string[];    // How you felt after

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Symbol Dictionary (Progressive - after 5 dream entries)
// ============================================

// Personal symbol meaning - built from dreams and readings
export interface personal_symbol_type {
  id: string;
  userId: string;
  docType: 'PERSONAL_SYMBOL';

  // Symbol info
  symbolName: string;          // "Water", "Snake", "Red car"
  normalizedName: string;      // Lowercase for matching
  category?: string;           // "animal", "element", "object", etc.

  // Meanings
  personalMeaning: string;     // What this symbol means to YOU
  contextualMeanings?: {       // Different meanings in different contexts
    context: string;
    meaning: string;
  }[];

  // Tracking
  firstEncountered: string;    // Date first seen
  lastEncountered: string;     // Date last seen
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  synchronicityOccurrences: number;

  // Examples
  notableExamples?: {
    entryType: 'dream' | 'reading' | 'synchronicity' | 'message';
    entryId: string;
    date: string;
    snippet: string;           // Brief excerpt
  }[];

  // Evolution
  meaningEvolution?: {         // How meaning has changed over time
    date: string;
    previousMeaning: string;
    newMeaning: string;
    reason?: string;
  }[];

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Loved Ones in Spirit (Progressive - optional prompt around holidays)
// ============================================

export interface loved_one_in_spirit_type {
  id: string;
  userId: string;
  docType: 'LOVED_ONE_SPIRIT';

  // Who they are
  name: string;
  relationship: string;        // "Grandmother", "Father", "Friend"
  nickname?: string;           // What you called them

  // Life details
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string; // Brief, if comfortable sharing

  // Connection
  personalMemory?: string;     // A cherished memory
  theirPersonality?: string;   // What they were like
  sharedInterests?: string[];  // Things you did together
  lessonsLearned?: string;     // What they taught you

  // Signs they send
  commonSigns?: string[];      // Signs you associate with them
  signExplanations?: {         // Why these signs
    sign: string;
    reason: string;
  }[];

  // Communication
  messageHistory?: {           // Messages received from them
    date: string;
    messageId?: string;        // Link to spirit_message
    summary: string;
  }[];

  // Anniversaries & remembrance
  importantDates?: {           // Dates to remember
    date: string;
    occasion: string;          // "Birthday", "Passing anniversary", "Wedding"
    reminderEnabled?: boolean;
  }[];

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Development Exercises (Progressive - after 30 days, they're committed)
// ============================================

export type exercise_type =
  | 'meditation'
  | 'visualization'
  | 'psychometry'      // Reading objects
  | 'remote_viewing'
  | 'aura_reading'
  | 'symbol_work'
  | 'automatic_writing'
  | 'pendulum'
  | 'card_practice'
  | 'sitting_in_power'
  | 'other';

export type exercise_difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface development_exercise_type {
  id: string;
  userId: string;
  docType: 'DEVELOPMENT_EXERCISE';

  // Exercise info
  date: string;
  exerciseType: exercise_type;
  exerciseName: string;        // Specific exercise name
  source?: string;             // Book, course, teacher who taught it
  difficulty?: exercise_difficulty;

  // Practice details
  duration?: number;           // Minutes
  environment?: string;        // Where you practiced
  preparation?: string;        // How you prepared

  // Results
  results?: string;            // What happened
  accuracy?: number;           // 1-5 if verifiable
  hits?: string[];             // Correct impressions
  misses?: string[];           // Incorrect impressions

  // Learning
  insights?: string;           // What you learned
  challengesFaced?: string;    // Difficulties encountered
  improvements?: string;       // What you'd do differently

  // Progress tracking
  confidenceLevel?: number;    // 1-5 confidence with this exercise
  willRepeat?: boolean;        // Will you do this again?
  nextSteps?: string;          // What to work on next

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Reading Reflection (Core - for mediums who get readings)
// ============================================

export interface reading_reflection_type {
  id: string;
  userId: string;
  docType: 'READING_REFLECTION';

  // Required
  date: string;
  readerName: string;

  // Reading details
  readingType?: string;        // "Mediumship", "Psychic", "Tarot"
  format?: string;             // "In-person", "Phone", "Video", "Text"
  duration?: number;           // Minutes
  bookingId?: string;          // SpiriVerse booking if applicable
  readerId?: string;           // SpiriVerse reader if applicable

  // Content
  mainMessages?: string;       // Key messages received
  evidentialInfo?: string;     // Evidence provided (for mediumship)
  predictions?: string;        // Any predictions made
  guidance?: string;           // Guidance given

  // Validation
  accuracyScore?: number;      // 1-5 how accurate
  resonatedWith?: string[];    // What resonated
  didntResonate?: string[];    // What didn't resonate
  validatedLater?: string;     // Things validated after the reading

  // Personal
  emotionalImpact?: string;    // How it affected you
  actionsTaken?: string;       // What you did with the information
  overallRating?: number;      // 1-5

  // Notes
  notes?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Mediumship Input Types
// ============================================

// Synchronicity inputs
export interface create_synchronicity_input {
  userId: string;
  date?: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: symbol_tag_input[];
  significanceScore?: number;
  photoUrl?: string;
}

export interface update_synchronicity_input {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  confirmedMeaning?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: symbol_tag_input[];
  significanceScore?: number;
  photoUrl?: string;
}

// Spirit Message inputs
export interface create_spirit_message_input {
  userId: string;
  date?: string;
  messageContent: string;
  source: spirit_source;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod: reception_method;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  interpretation?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
}

export interface update_spirit_message_input {
  id: string;
  userId: string;
  messageContent?: string;
  source?: spirit_source;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod?: reception_method;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  validated?: boolean;
  validationNotes?: string;
  interpretation?: string;
  actionTaken?: string;
  outcome?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
}

// Personal Symbol inputs
export interface create_personal_symbol_input {
  userId: string;
  symbolName: string;
  category?: string;
  personalMeaning: string;
  contextualMeanings?: { context: string; meaning: string }[];
  notes?: string;
}

export interface update_personal_symbol_input {
  id: string;
  userId: string;
  personalMeaning?: string;
  contextualMeanings?: { context: string; meaning: string }[];
  notes?: string;
}

// Loved One inputs
export interface create_loved_one_input {
  userId: string;
  name: string;
  relationship: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: { sign: string; reason: string }[];
  importantDates?: { date: string; occasion: string; reminderEnabled?: boolean }[];
  photoUrl?: string;
}

export interface update_loved_one_input {
  id: string;
  userId: string;
  name?: string;
  relationship?: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: { sign: string; reason: string }[];
  importantDates?: { date: string; occasion: string; reminderEnabled?: boolean }[];
  photoUrl?: string;
}

// Development Exercise inputs
export interface create_development_exercise_input {
  userId: string;
  date?: string;
  exerciseType: exercise_type;
  exerciseName: string;
  source?: string;
  difficulty?: exercise_difficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
}

export interface update_development_exercise_input {
  id: string;
  userId: string;
  exerciseType?: exercise_type;
  exerciseName?: string;
  source?: string;
  difficulty?: exercise_difficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
}

// Reading Reflection inputs
export interface create_reading_reflection_input {
  userId: string;
  date?: string;
  readerName: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
}

export interface update_reading_reflection_input {
  id: string;
  userId: string;
  readerName?: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  validatedLater?: string;
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
}

// ============================================
// Mediumship Response Types
// ============================================

export interface synchronicity_response {
  success: boolean;
  message?: string;
  synchronicity?: synchronicity_type;
}

export interface spirit_message_response {
  success: boolean;
  message?: string;
  spiritMessage?: spirit_message_type;
}

export interface personal_symbol_response {
  success: boolean;
  message?: string;
  symbol?: personal_symbol_type;
}

export interface loved_one_response {
  success: boolean;
  message?: string;
  lovedOne?: loved_one_in_spirit_type;
}

export interface development_exercise_response {
  success: boolean;
  message?: string;
  exercise?: development_exercise_type;
}

export interface reading_reflection_response {
  success: boolean;
  message?: string;
  reflection?: reading_reflection_type;
}

export interface delete_mediumship_response {
  success: boolean;
  message?: string;
}

// ============================================
// Mediumship Filter Types
// ============================================

export interface synchronicity_filters {
  startDate?: string;
  endDate?: string;
  recurringTheme?: boolean;
  hasSymbol?: string;
  minSignificance?: number;
  limit?: number;
  offset?: number;
}

export interface spirit_message_filters {
  startDate?: string;
  endDate?: string;
  source?: spirit_source;
  receptionMethod?: reception_method;
  validated?: boolean;
  limit?: number;
  offset?: number;
}

export interface personal_symbol_filters {
  category?: string;
  minOccurrences?: number;
  limit?: number;
  offset?: number;
}

export interface loved_one_filters {
  relationship?: string;
  limit?: number;
  offset?: number;
}

export interface development_exercise_filters {
  startDate?: string;
  endDate?: string;
  exerciseType?: exercise_type;
  difficulty?: exercise_difficulty;
  limit?: number;
  offset?: number;
}

export interface reading_reflection_filters {
  startDate?: string;
  endDate?: string;
  readingType?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// User Card Symbols (Personal tarot card meanings)
// ============================================

export interface user_card_symbols_type {
  id: string;
  userId: string;
  docType: 'USER_CARD_SYMBOLS';

  // Card identification
  cardName: string;              // "The Moon", "Ace of Cups"
  normalizedCardName: string;    // Lowercase for matching

  // Personal symbols
  personalSymbols: string[];     // User's symbols for this card
  usePersonalOnly: boolean;      // If true, skip default extraction

  // Notes
  notes?: string;                // Why these symbols

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// User Card Symbols inputs
export interface create_user_card_symbols_input {
  userId: string;
  cardName: string;
  personalSymbols: string[];
  usePersonalOnly?: boolean;
  notes?: string;
}

export interface update_user_card_symbols_input {
  id: string;
  userId: string;
  personalSymbols?: string[];
  usePersonalOnly?: boolean;
  notes?: string;
}

export interface user_card_symbols_response {
  success: boolean;
  message?: string;
  cardSymbols?: user_card_symbols_type;
}

// ============================================
// Mediumship Statistics
// ============================================

export interface mediumship_stats {
  // Activity
  totalSynchronicities: number;
  synchronicitiesThisMonth: number;
  totalSpiritMessages: number;
  messagesThisMonth: number;

  // Patterns
  symbolCount: number;
  topSymbols: { name: string; count: number }[];
  mostActiveSource: spirit_source | null;
  preferredReceptionMethod: reception_method | null;

  // Development
  exerciseCount: number;
  exercisesThisMonth: number;
  averageAccuracy: number;
  favoriteExercise: exercise_type | null;

  // Loved Ones
  lovedOnesCount: number;
  upcomingDates: { lovedOneId: string; name: string; date: string; occasion: string }[];

  // Readings
  readingReflectionCount: number;
  averageReadingRating: number;

  // Streaks
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
}
