import { recordref_type } from "../../0_shared/types";

// ============================================
// Prayer & Faith Types
// ============================================
// Help people of faith deepen their walk with God,
// track their prayer life and spiritual growth

// Prayer types/categories
export type prayer_type =
  | 'praise'
  | 'thanksgiving'
  | 'petition'
  | 'intercession'
  | 'confession'
  | 'meditation'
  | 'contemplation'
  | 'devotional';

// Prayer status for tracking answered prayers
export type prayer_status =
  | 'active'
  | 'answered'
  | 'answered_differently'
  | 'waiting'
  | 'ongoing';

// Scripture book categories
export type scripture_book_type =
  | 'old_testament'
  | 'new_testament'
  | 'psalms'
  | 'proverbs'
  | 'gospels'
  | 'epistles'
  | 'prophets'
  | 'wisdom'
  | 'other';

// ============================================
// Prayer Journal Entry (Core)
// ============================================

export interface prayer_journal_type {
  id: string;
  userId: string;
  docType: 'PRAYER_JOURNAL';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  title?: string;            // Optional title for the prayer

  // Prayer details
  prayerType: prayer_type;
  content: string;           // The prayer text
  status?: prayer_status;    // For petition/intercession tracking

  // For intercession prayers
  prayingFor?: string;       // Who/what you're praying for (e.g., "Mom's health")

  // Requests and gratitude (can be combined)
  requests?: string[];       // Specific prayer requests
  gratitude?: string[];      // Things you're grateful for

  // Scripture integration
  scriptureReference?: string; // e.g., "Psalm 23:1-4"
  scriptureText?: string;     // The verse text

  // Reflection
  insights?: string;         // What God revealed during prayer
  feelingBefore?: string;    // How you felt before praying
  feelingAfter?: string;     // How you felt after praying

  // For answered prayers
  answeredDate?: string;     // When prayer was answered
  answerDescription?: string; // How it was answered

  // Tags for organization
  tags?: string[];           // Custom tags

  // Privacy
  isPrivate?: boolean;       // Default true - personal prayer life

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Scripture Reflection (Core)
// ============================================

export interface scripture_reflection_type {
  id: string;
  userId: string;
  docType: 'SCRIPTURE_REFLECTION';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  reference: string;         // e.g., "John 3:16" or "Psalm 23:1-6"

  // Scripture details
  book?: string;             // Book name
  chapter?: number;          // Chapter number
  verseStart?: number;       // Starting verse
  verseEnd?: number;         // Ending verse (if range)
  bookType?: scripture_book_type;

  // The text
  text?: string;             // The scripture text itself

  // Reflection
  whatSpokeToMe: string;     // What stood out/spoke to you
  personalApplication?: string; // How to apply it to life
  questions?: string[];      // Questions that arose
  crossReferences?: string[]; // Related scriptures

  // Context
  readingContext?: string;   // "Morning devotional", "Bible study", etc.
  version?: string;          // Bible version (NIV, KJV, ESV, etc.)

  // Response
  prayerResponse?: string;   // Prayer in response to scripture

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Daily Passage (Core - Easy Daily Habit)
// ============================================
// A passage is served to the user, they reflect on it

export interface daily_passage_type {
  id: string;
  userId: string;
  docType: 'DAILY_PASSAGE';

  // The passage served
  date: string;              // ISO date (YYYY-MM-DD)
  reference: string;         // e.g., "John 3:16-17"
  text: string;              // The scripture text
  book?: string;             // Book name
  chapter?: number;          // Chapter number
  verseStart?: number;       // Starting verse
  verseEnd?: number;         // Ending verse
  version?: string;          // Bible version (NIV, ESV, etc.)

  // User's reflection (optional - just reflecting is the habit)
  reflection?: string;       // What this passage means to them
  prayerResponse?: string;   // Prayer in response
  personalApplication?: string; // How to apply it

  // Engagement tracking
  isRead: boolean;           // Did they read it?
  readAt?: string;           // When they read it
  isReflected: boolean;      // Did they add a reflection?
  reflectedAt?: string;      // When they reflected

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Prayer & Faith Input Types
// ============================================

// Prayer Journal inputs
export interface create_prayer_journal_input {
  userId: string;
  date?: string;
  title?: string;
  prayerType: prayer_type;
  content: string;
  status?: prayer_status;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  tags?: string[];
  isPrivate?: boolean;
}

export interface update_prayer_journal_input {
  id: string;
  userId: string;
  title?: string;
  prayerType?: prayer_type;
  content?: string;
  status?: prayer_status;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  answeredDate?: string;
  answerDescription?: string;
  tags?: string[];
  isPrivate?: boolean;
}

// Scripture Reflection inputs
export interface create_scripture_reflection_input {
  userId: string;
  date?: string;
  reference: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: scripture_book_type;
  text?: string;
  whatSpokeToMe: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

export interface update_scripture_reflection_input {
  id: string;
  userId: string;
  reference?: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: scripture_book_type;
  text?: string;
  whatSpokeToMe?: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

// Daily Passage inputs
export interface reflect_on_passage_input {
  id: string;
  userId: string;
  reflection?: string;
  prayerResponse?: string;
  personalApplication?: string;
}

export interface mark_passage_read_input {
  id: string;
  userId: string;
}

// ============================================
// Prayer & Faith Response Types
// ============================================

export interface prayer_journal_response {
  success: boolean;
  message?: string;
  prayer?: prayer_journal_type;
}

export interface scripture_reflection_response {
  success: boolean;
  message?: string;
  reflection?: scripture_reflection_type;
}

export interface daily_passage_response {
  success: boolean;
  message?: string;
  passage?: daily_passage_type;
}

export interface delete_faith_response {
  success: boolean;
  message?: string;
}

// ============================================
// Prayer & Faith Filter Types
// ============================================

export interface prayer_journal_filters {
  startDate?: string;
  endDate?: string;
  prayerType?: prayer_type;
  status?: prayer_status;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface scripture_reflection_filters {
  startDate?: string;
  endDate?: string;
  book?: string;
  bookType?: scripture_book_type;
  limit?: number;
  offset?: number;
}

export interface daily_passage_filters {
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
  isReflected?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Prayer & Faith Statistics
// ============================================

export interface faith_stats {
  // Daily Passage
  dailyPassageStreak: number;     // Consecutive days reading
  totalPassagesRead: number;
  totalPassagesReflected: number;
  passagesThisWeek: number;

  // Prayer Journal
  totalPrayers: number;
  prayersThisWeek: number;
  prayersThisMonth: number;
  prayerTypeBreakdown: { type: prayer_type; count: number }[];
  answeredPrayersCount: number;
  waitingPrayersCount: number;
  activePrayersCount: number;
  prayerStreak: number;           // Consecutive days praying

  // Scripture Reflections (own reading)
  totalScriptureReflections: number;
  reflectionsThisWeek: number;

  // Common themes
  commonTags: { tag: string; count: number }[];
  favoriteBooks: { book: string; count: number }[];
}
