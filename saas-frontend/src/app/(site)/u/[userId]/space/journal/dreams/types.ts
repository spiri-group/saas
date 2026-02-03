// Dream mood options
export type DreamMood =
  | 'peaceful'
  | 'joyful'
  | 'anxious'
  | 'fearful'
  | 'confused'
  | 'sad'
  | 'excited'
  | 'neutral'
  | 'mysterious'
  | 'empowered';

export const DREAM_MOODS: { key: DreamMood; label: string; emoji: string }[] = [
  { key: 'peaceful', label: 'Peaceful', emoji: '😌' },
  { key: 'joyful', label: 'Joyful', emoji: '😊' },
  { key: 'anxious', label: 'Anxious', emoji: '😰' },
  { key: 'fearful', label: 'Fearful', emoji: '😨' },
  { key: 'confused', label: 'Confused', emoji: '😵' },
  { key: 'sad', label: 'Sad', emoji: '😢' },
  { key: 'excited', label: 'Excited', emoji: '🤩' },
  { key: 'neutral', label: 'Neutral', emoji: '😐' },
  { key: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  { key: 'empowered', label: 'Empowered', emoji: '💪' },
];

// Dream clarity options
export type DreamClarity =
  | 'vivid'
  | 'clear'
  | 'moderate'
  | 'hazy'
  | 'minimal';

export const DREAM_CLARITY: { key: DreamClarity; label: string; description: string }[] = [
  { key: 'vivid', label: 'Vivid', description: 'Very clear, detailed memory' },
  { key: 'clear', label: 'Clear', description: 'Good recall' },
  { key: 'moderate', label: 'Moderate', description: 'Some details remembered' },
  { key: 'hazy', label: 'Hazy', description: 'Fragmented/unclear' },
  { key: 'minimal', label: 'Minimal', description: 'Barely remembered' },
];

// Dream type options
export type DreamType =
  | 'normal'
  | 'lucid'
  | 'recurring'
  | 'nightmare'
  | 'prophetic'
  | 'visitation'
  | 'flying'
  | 'falling'
  | 'spiritual';

export const DREAM_TYPES: { key: DreamType; label: string; description: string }[] = [
  { key: 'normal', label: 'Normal', description: 'Regular dream' },
  { key: 'lucid', label: 'Lucid', description: 'Aware you were dreaming' },
  { key: 'recurring', label: 'Recurring', description: 'A dream you have had before' },
  { key: 'nightmare', label: 'Nightmare', description: 'Disturbing or scary dream' },
  { key: 'prophetic', label: 'Prophetic', description: 'Felt predictive or meaningful' },
  { key: 'visitation', label: 'Visitation', description: 'Visit from a spirit or loved one' },
  { key: 'flying', label: 'Flying', description: 'Flying or floating in the dream' },
  { key: 'falling', label: 'Falling', description: 'Falling sensation in the dream' },
  { key: 'spiritual', label: 'Spiritual', description: 'Deep spiritual experience' },
];

// Common dream themes for suggestions
export const COMMON_THEMES = [
  'water', 'flying', 'falling', 'chase', 'death', 'birth',
  'animals', 'family', 'love', 'travel', 'lost', 'house',
  'school', 'work', 'nature', 'fire', 'transformation', 'healing',
  'message', 'guidance', 'warning', 'past life', 'future',
] as const;

// ============================================
// Symbol Types (Shared with Reading Journal)
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

// Suggested dream symbols with categories
export const DREAM_SYMBOL_SUGGESTIONS: { name: string; category: SymbolCategory }[] = [
  // Elements
  { name: 'water', category: 'ELEMENT' },
  { name: 'fire', category: 'ELEMENT' },
  { name: 'earth', category: 'ELEMENT' },
  { name: 'air', category: 'ELEMENT' },
  // Animals
  { name: 'snake', category: 'ANIMAL' },
  { name: 'wolf', category: 'ANIMAL' },
  { name: 'cat', category: 'ANIMAL' },
  { name: 'bird', category: 'ANIMAL' },
  { name: 'spider', category: 'ANIMAL' },
  { name: 'horse', category: 'ANIMAL' },
  // Archetypes
  { name: 'mother', category: 'ARCHETYPE' },
  { name: 'father', category: 'ARCHETYPE' },
  { name: 'child', category: 'ARCHETYPE' },
  { name: 'shadow', category: 'ARCHETYPE' },
  { name: 'guide', category: 'ARCHETYPE' },
  { name: 'stranger', category: 'ARCHETYPE' },
  // Objects
  { name: 'key', category: 'OBJECT' },
  { name: 'mirror', category: 'OBJECT' },
  { name: 'door', category: 'OBJECT' },
  { name: 'car', category: 'OBJECT' },
  { name: 'book', category: 'OBJECT' },
  { name: 'phone', category: 'OBJECT' },
  // Places
  { name: 'house', category: 'PLACE' },
  { name: 'forest', category: 'PLACE' },
  { name: 'ocean', category: 'PLACE' },
  { name: 'school', category: 'PLACE' },
  { name: 'road', category: 'PLACE' },
  { name: 'bridge', category: 'PLACE' },
  // Actions
  { name: 'flying', category: 'ACTION' },
  { name: 'falling', category: 'ACTION' },
  { name: 'running', category: 'ACTION' },
  { name: 'swimming', category: 'ACTION' },
  { name: 'searching', category: 'ACTION' },
  // Celestial
  { name: 'moon', category: 'CELESTIAL' },
  { name: 'sun', category: 'CELESTIAL' },
  { name: 'stars', category: 'CELESTIAL' },
];

// Dream Journal Entry type (matches GraphQL)
export interface DreamJournalEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  dreamType?: DreamType;
  mood?: DreamMood;
  clarity?: DreamClarity;
  isLucid?: boolean;
  themes?: string[];
  symbols: SymbolTag[];  // Enhanced symbol tags (shared with readings)
  interpretation?: string;
  emotions?: string[];
  sleepQuality?: number;
  wakeTime?: string;
  photoUrl?: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Form input type for creating/editing
export interface DreamFormInput {
  date: string;
  title: string;
  content: string;
  dreamType?: DreamType;
  mood?: DreamMood;
  clarity?: DreamClarity;
  isLucid?: boolean;
  themes?: string[];
  symbols: SymbolTag[];  // Enhanced symbol tags
  interpretation?: string;
  emotions?: string[];
  sleepQuality?: number;
  wakeTime?: string;
  photoUrl?: string;
}

// Get default form state
export const getDefaultFormState = (date?: string): DreamFormInput => ({
  date: date || new Date().toISOString().split('T')[0],
  title: '',
  content: '',
  dreamType: undefined,
  mood: undefined,
  clarity: undefined,
  isLucid: false,
  themes: [],
  symbols: [],  // Enhanced symbol tags (empty by default)
  interpretation: '',
  emotions: [],
  sleepQuality: undefined,
  wakeTime: '',
  photoUrl: '',
});

// Helper to get category color classes for display
export const getCategoryColor = (category?: SymbolCategory): string => {
  switch (category) {
    case 'ELEMENT': return 'bg-blue-500/20 text-blue-300 border-blue-500/20';
    case 'ANIMAL': return 'bg-amber-500/20 text-amber-300 border-amber-500/20';
    case 'ARCHETYPE': return 'bg-violet-500/20 text-violet-300 border-violet-500/20';
    case 'OBJECT': return 'bg-slate-500/20 text-slate-300 border-slate-500/20';
    case 'PLACE': return 'bg-green-500/20 text-green-300 border-green-500/20';
    case 'PERSON': return 'bg-pink-500/20 text-pink-300 border-pink-500/20';
    case 'ACTION': return 'bg-orange-500/20 text-orange-300 border-orange-500/20';
    case 'CELESTIAL': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
    default: return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20';
  }
};

// Helper to format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper to get mood emoji
export const getMoodEmoji = (mood?: DreamMood): string => {
  const moodConfig = DREAM_MOODS.find(m => m.key === mood);
  return moodConfig?.emoji || '💭';
};

// Helper to get clarity label
export const getClarityLabel = (clarity?: DreamClarity): string => {
  const clarityConfig = DREAM_CLARITY.find(c => c.key === clarity);
  return clarityConfig?.label || 'Unknown';
};

// Helper to get dream type label
export const getDreamTypeLabel = (dreamType?: DreamType): string => {
  const typeConfig = DREAM_TYPES.find(t => t.key === dreamType);
  return typeConfig?.label || 'Dream';
};
