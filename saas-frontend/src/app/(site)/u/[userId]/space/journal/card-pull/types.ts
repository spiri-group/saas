// ============================================
// Reading Source Types
// ============================================

export type ReadingSourceType = 'SELF' | 'SPIRIVERSE' | 'EXTERNAL';

export type ExternalPlatform = 'TIKTOK' | 'YOUTUBE' | 'IN_PERSON' | 'PODCAST' | 'OTHER';

export interface ReadingSourceDetails {
  // SELF - pulled cards myself
  deck?: string;

  // SPIRIVERSE - reading from a practitioner on platform
  spiriReadingId?: string;
  practitionerName?: string;
  practitionerId?: string;

  // EXTERNAL - TikTok, YouTube, in-person reader, etc.
  platform?: ExternalPlatform;
  readerName?: string;
  sourceUrl?: string;
  channelName?: string;
}

// ============================================
// Symbol Types
// ============================================

export type SymbolCategory =
  | 'ELEMENT'
  | 'ANIMAL'
  | 'ARCHETYPE'
  | 'OBJECT'
  | 'PLACE'
  | 'PERSON'
  | 'ACTION'
  | 'CELESTIAL'
  | 'OTHER';

export interface SymbolTag {
  symbolId?: string;
  name: string;
  category?: SymbolCategory;
  context?: string;
  autoExtracted: boolean;
}

// ============================================
// Common tarot deck options
// ============================================

export const TAROT_DECKS = [
  { key: 'rider-waite-smith', label: 'Rider-Waite-Smith' },
  { key: 'thoth', label: 'Thoth' },
  { key: 'marseille', label: 'Tarot de Marseille' },
  { key: 'wild-unknown', label: 'The Wild Unknown' },
  { key: 'modern-witch', label: 'Modern Witch' },
  { key: 'light-seers', label: "Light Seer's" },
  { key: 'other', label: 'Other Deck' },
] as const;

export const SPREAD_TYPES = [
  { key: 'single', label: 'Single Card', cardCount: 1 },
  { key: 'three-card', label: '3-Card Spread', cardCount: 3 },
  { key: 'past-present-future', label: 'Past-Present-Future', cardCount: 3 },
  { key: 'celtic-cross', label: 'Celtic Cross', cardCount: 10 },
  { key: 'relationship', label: 'Relationship Spread', cardCount: 6 },
  { key: 'weekly', label: 'Weekly Spread', cardCount: 7 },
  { key: 'other', label: 'Other', cardCount: null },
] as const;

export const EXTERNAL_PLATFORMS = [
  { key: 'TIKTOK', label: 'TikTok', icon: '📱' },
  { key: 'YOUTUBE', label: 'YouTube', icon: '▶️' },
  { key: 'IN_PERSON', label: 'In Person', icon: '👤' },
  { key: 'PODCAST', label: 'Podcast', icon: '🎙️' },
  { key: 'OTHER', label: 'Other', icon: '✨' },
] as const;

// ============================================
// Card input type for the form
// ============================================

export interface CardFormInput {
  id: string; // Temporary ID for form management
  name: string;
  reversed: boolean;
  position?: string;
  interpretation?: string;
}

// ============================================
// Form state type - Enhanced with source tracking
// ============================================

export interface ReadingFormState {
  date: string;

  // Source selection
  sourceType: ReadingSourceType;

  // SELF source
  deck: string;
  customDeck?: string;

  // EXTERNAL source
  platform?: ExternalPlatform;
  readerName?: string;
  sourceUrl?: string;
  channelName?: string;

  // Cards
  cards: CardFormInput[];
  spreadType?: string;

  // Reflection
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;

  // Themes (manual tags)
  themes: string[];
}

// Legacy alias
export type CardPullFormState = ReadingFormState;

// Default form state
export const getDefaultFormState = (date?: string): ReadingFormState => ({
  date: date || new Date().toISOString().split('T')[0],
  sourceType: 'SELF',
  deck: 'rider-waite-smith',
  customDeck: '',
  cards: [{ id: crypto.randomUUID(), name: '', reversed: false }],
  themes: [],
});

// ============================================
// Source selection UI helpers
// ============================================

export const SOURCE_OPTIONS = [
  {
    key: 'SELF' as ReadingSourceType,
    label: 'I pulled the cards',
    description: 'Record a reading you did yourself with your physical deck',
    icon: '🃏',
  },
  {
    key: 'EXTERNAL' as ReadingSourceType,
    label: 'External reading',
    description: 'TikTok, YouTube, in-person reader, etc.',
    icon: '📱',
  },
] as const;

// Tip shown in the source selection UI
export const SPIRIVERSE_TIP = {
  title: 'Tip: SpiriVerse readings are auto-captured',
  description: 'When you receive a reading through SpiriVerse, it automatically appears here - no manual logging needed!',
};
