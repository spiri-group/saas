/**
 * Tarot Card Symbol Mappings
 *
 * Maps tarot cards to their associated symbols for automatic extraction.
 * Used when users log a reading to auto-tag relevant symbols.
 */

import { symbol_category } from './types';

export interface CardSymbolMapping {
  symbols: string[];
  element?: string;
  suit?: string;
}

// Major Arcana symbol mappings
export const MAJOR_ARCANA_SYMBOLS: Record<string, CardSymbolMapping> = {
  'The Fool': {
    symbols: ['journey', 'new beginnings', 'leap of faith', 'innocence', 'freedom'],
  },
  'The Magician': {
    symbols: ['manifestation', 'power', 'skill', 'willpower', 'action'],
  },
  'The High Priestess': {
    symbols: ['intuition', 'mystery', 'subconscious', 'moon', 'secrets', 'inner voice'],
  },
  'The Empress': {
    symbols: ['abundance', 'fertility', 'nurturing', 'nature', 'mother', 'creativity'],
  },
  'The Emperor': {
    symbols: ['authority', 'structure', 'father', 'control', 'stability', 'leadership'],
  },
  'The Hierophant': {
    symbols: ['tradition', 'teaching', 'institution', 'conformity', 'spiritual guidance'],
  },
  'The Lovers': {
    symbols: ['love', 'choice', 'union', 'partnership', 'harmony', 'relationships'],
  },
  'The Chariot': {
    symbols: ['willpower', 'victory', 'determination', 'journey', 'control', 'movement'],
  },
  'Strength': {
    symbols: ['courage', 'patience', 'inner strength', 'lion', 'compassion', 'gentle power'],
  },
  'The Hermit': {
    symbols: ['solitude', 'introspection', 'guidance', 'light', 'wisdom', 'inner search'],
  },
  'Wheel of Fortune': {
    symbols: ['cycles', 'fate', 'change', 'luck', 'destiny', 'turning point'],
  },
  'Justice': {
    symbols: ['truth', 'fairness', 'law', 'balance', 'karma', 'accountability'],
  },
  'The Hanged Man': {
    symbols: ['surrender', 'sacrifice', 'new perspective', 'waiting', 'letting go', 'suspension'],
  },
  'Death': {
    symbols: ['transformation', 'endings', 'change', 'rebirth', 'transition', 'release'],
  },
  'Temperance': {
    symbols: ['balance', 'patience', 'moderation', 'alchemy', 'harmony', 'middle path'],
  },
  'The Devil': {
    symbols: ['shadow', 'bondage', 'materialism', 'addiction', 'temptation', 'attachment'],
  },
  'The Tower': {
    symbols: ['destruction', 'sudden change', 'revelation', 'lightning', 'upheaval', 'breakthrough'],
  },
  'The Star': {
    symbols: ['hope', 'inspiration', 'healing', 'stars', 'renewal', 'faith', 'serenity'],
  },
  'The Moon': {
    symbols: ['moon', 'illusion', 'intuition', 'subconscious', 'water', 'fear', 'dreams', 'shadow'],
  },
  'The Sun': {
    symbols: ['sun', 'joy', 'success', 'vitality', 'clarity', 'optimism', 'achievement'],
  },
  'Judgement': {
    symbols: ['rebirth', 'calling', 'reckoning', 'awakening', 'absolution', 'renewal'],
  },
  'The World': {
    symbols: ['completion', 'integration', 'accomplishment', 'wholeness', 'fulfillment', 'travel'],
  },
};

// Suit element mappings
export const SUIT_ELEMENTS: Record<string, { element: string; domain: string; symbols: string[] }> = {
  'Cups': {
    element: 'water',
    domain: 'emotions',
    symbols: ['water', 'emotions', 'relationships', 'intuition', 'love', 'feelings'],
  },
  'Swords': {
    element: 'air',
    domain: 'mind',
    symbols: ['air', 'thoughts', 'communication', 'conflict', 'truth', 'intellect'],
  },
  'Wands': {
    element: 'fire',
    domain: 'action',
    symbols: ['fire', 'passion', 'creativity', 'ambition', 'energy', 'inspiration'],
  },
  'Pentacles': {
    element: 'earth',
    domain: 'material',
    symbols: ['earth', 'money', 'work', 'health', 'stability', 'manifestation'],
  },
};

// Minor Arcana number meanings (applied to all suits)
export const NUMBER_MEANINGS: Record<string, string[]> = {
  'Ace': ['new beginnings', 'potential', 'opportunity', 'seed'],
  'Two': ['balance', 'partnership', 'decision', 'duality'],
  'Three': ['growth', 'creativity', 'collaboration', 'expansion'],
  'Four': ['stability', 'foundation', 'structure', 'rest'],
  'Five': ['conflict', 'challenge', 'change', 'instability'],
  'Six': ['harmony', 'cooperation', 'nostalgia', 'balance'],
  'Seven': ['reflection', 'assessment', 'patience', 'perseverance'],
  'Eight': ['movement', 'power', 'mastery', 'change'],
  'Nine': ['fulfillment', 'attainment', 'near completion', 'wisdom'],
  'Ten': ['completion', 'ending', 'culmination', 'legacy'],
  'Page': ['curiosity', 'new messages', 'student', 'exploration'],
  'Knight': ['action', 'movement', 'pursuit', 'adventure'],
  'Queen': ['mastery', 'nurturing', 'intuition', 'maturity'],
  'King': ['authority', 'control', 'leadership', 'experience'],
};

/**
 * Extract symbols from a card name
 */
export function extractSymbolsFromCard(cardName: string): string[] {
  const normalizedName = cardName.trim();
  const symbols: Set<string> = new Set();

  // Check Major Arcana
  const majorArcana = MAJOR_ARCANA_SYMBOLS[normalizedName];
  if (majorArcana) {
    majorArcana.symbols.forEach(s => symbols.add(s));
    return Array.from(symbols);
  }

  // Check Minor Arcana (e.g., "Ace of Cups", "Queen of Swords")
  const minorMatch = normalizedName.match(/^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King)\s+of\s+(Cups|Swords|Wands|Pentacles)$/i);

  if (minorMatch) {
    const [, rank, suit] = minorMatch;
    const normalizedRank = rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
    const normalizedSuit = suit.charAt(0).toUpperCase() + suit.slice(1).toLowerCase();

    // Add suit symbols
    const suitInfo = SUIT_ELEMENTS[normalizedSuit];
    if (suitInfo) {
      suitInfo.symbols.forEach(s => symbols.add(s));
    }

    // Add number/court meanings
    const numberMeanings = NUMBER_MEANINGS[normalizedRank];
    if (numberMeanings) {
      numberMeanings.forEach(s => symbols.add(s));
    }
  }

  return Array.from(symbols);
}

/**
 * Extract symbols from multiple cards
 */
export function extractSymbolsFromCards(cardNames: string[]): string[] {
  const allSymbols: Set<string> = new Set();

  for (const cardName of cardNames) {
    const cardSymbols = extractSymbolsFromCard(cardName);
    cardSymbols.forEach(s => allSymbols.add(s));
  }

  return Array.from(allSymbols);
}

/**
 * Get the category for a symbol
 */
export function getSymbolCategory(symbolName: string): symbol_category {
  const normalized = symbolName.toLowerCase();

  // Elements
  if (['water', 'fire', 'air', 'earth'].includes(normalized)) {
    return 'ELEMENT';
  }

  // Animals
  if (['lion', 'snake', 'owl', 'wolf', 'raven', 'crow', 'spider', 'dog', 'cat', 'horse'].includes(normalized)) {
    return 'ANIMAL';
  }

  // Celestial
  if (['moon', 'sun', 'stars', 'star', 'lightning'].includes(normalized)) {
    return 'CELESTIAL';
  }

  // Places
  if (['forest', 'ocean', 'house', 'tower', 'river', 'mountain', 'cave', 'garden'].includes(normalized)) {
    return 'PLACE';
  }

  // Actions
  if (['flying', 'falling', 'running', 'journey', 'movement', 'travel', 'surrender', 'waiting'].includes(normalized)) {
    return 'ACTION';
  }

  // Archetypes
  if (['mother', 'father', 'trickster', 'sage', 'hero', 'shadow', 'child', 'guide'].includes(normalized)) {
    return 'ARCHETYPE';
  }

  // Person
  if (['stranger', 'lover', 'teacher', 'student', 'leader'].includes(normalized)) {
    return 'PERSON';
  }

  // Objects
  if (['key', 'mirror', 'door', 'bridge', 'sword', 'cup', 'wand', 'coin', 'wheel'].includes(normalized)) {
    return 'OBJECT';
  }

  return 'OTHER';
}

/**
 * Common dream symbols with suggested meanings
 */
export const DREAM_SYMBOL_SUGGESTIONS: Record<string, { meanings: string[]; category: symbol_category }> = {
  // Water symbols
  'water': { meanings: ['emotions', 'subconscious', 'cleansing', 'depth', 'flow'], category: 'ELEMENT' },
  'ocean': { meanings: ['vastness', 'emotions', 'subconscious', 'mother'], category: 'PLACE' },
  'river': { meanings: ['flow', 'journey', 'time', 'emotions', 'change'], category: 'PLACE' },
  'rain': { meanings: ['cleansing', 'renewal', 'emotions', 'release'], category: 'ELEMENT' },
  'flood': { meanings: ['overwhelm', 'emotions', 'loss of control', 'change'], category: 'ELEMENT' },

  // Animal symbols
  'snake': { meanings: ['transformation', 'healing', 'hidden fears', 'kundalini', 'wisdom'], category: 'ANIMAL' },
  'spider': { meanings: ['creativity', 'patience', 'fate', 'feminine power'], category: 'ANIMAL' },
  'wolf': { meanings: ['instinct', 'freedom', 'social connection', 'loyalty'], category: 'ANIMAL' },
  'owl': { meanings: ['wisdom', 'death', 'transition', 'seeing truth'], category: 'ANIMAL' },
  'crow': { meanings: ['magic', 'transformation', 'messages', 'death'], category: 'ANIMAL' },
  'raven': { meanings: ['magic', 'transformation', 'messages', 'death'], category: 'ANIMAL' },
  'cat': { meanings: ['independence', 'intuition', 'mystery', 'feminine'], category: 'ANIMAL' },
  'dog': { meanings: ['loyalty', 'protection', 'friendship', 'instinct'], category: 'ANIMAL' },
  'lion': { meanings: ['courage', 'strength', 'pride', 'leadership'], category: 'ANIMAL' },
  'bird': { meanings: ['freedom', 'spirit', 'perspective', 'messages'], category: 'ANIMAL' },

  // Place symbols
  'house': { meanings: ['self', 'psyche', 'family', 'security'], category: 'PLACE' },
  'room': { meanings: ['aspect of self', 'hidden parts', 'potential'], category: 'PLACE' },
  'forest': { meanings: ['unconscious', 'unknown', 'growth', 'nature'], category: 'PLACE' },
  'mountain': { meanings: ['achievement', 'obstacle', 'perspective', 'challenge'], category: 'PLACE' },
  'cave': { meanings: ['unconscious', 'hidden knowledge', 'retreat', 'womb'], category: 'PLACE' },

  // Object symbols
  'door': { meanings: ['opportunity', 'transition', 'choice', 'new phase'], category: 'OBJECT' },
  'stairs': { meanings: ['transition', 'progress', 'levels of consciousness'], category: 'OBJECT' },
  'bridge': { meanings: ['transition', 'connection', 'crossing over'], category: 'OBJECT' },
  'mirror': { meanings: ['self-reflection', 'truth', 'illusion', 'identity'], category: 'OBJECT' },
  'key': { meanings: ['solution', 'access', 'knowledge', 'secrets'], category: 'OBJECT' },

  // Action symbols
  'flying': { meanings: ['freedom', 'transcendence', 'ambition', 'perspective'], category: 'ACTION' },
  'falling': { meanings: ['loss of control', 'anxiety', 'letting go', 'failure fears'], category: 'ACTION' },
  'running': { meanings: ['escape', 'pursuit', 'avoidance', 'urgency'], category: 'ACTION' },
  'being chased': { meanings: ['avoidance', 'fear', 'running from self'], category: 'ACTION' },
  'drowning': { meanings: ['overwhelm', 'emotions', 'helplessness', 'transformation'], category: 'ACTION' },

  // Celestial symbols
  'moon': { meanings: ['intuition', 'feminine', 'cycles', 'subconscious', 'illusion'], category: 'CELESTIAL' },
  'sun': { meanings: ['consciousness', 'vitality', 'clarity', 'masculine', 'success'], category: 'CELESTIAL' },
  'stars': { meanings: ['hope', 'guidance', 'destiny', 'aspiration'], category: 'CELESTIAL' },

  // Body/death symbols
  'teeth falling out': { meanings: ['anxiety', 'loss', 'powerlessness', 'change'], category: 'OTHER' },
  'death': { meanings: ['transformation', 'ending', 'change', 'rebirth'], category: 'OTHER' },
  'naked': { meanings: ['vulnerability', 'exposure', 'authenticity', 'shame'], category: 'OTHER' },

  // Archetypal symbols
  'shadow': { meanings: ['hidden self', 'repressed aspects', 'fear', 'unknown'], category: 'ARCHETYPE' },
  'guide': { meanings: ['wisdom', 'higher self', 'direction', 'mentor'], category: 'ARCHETYPE' },
  'child': { meanings: ['innocence', 'potential', 'inner child', 'vulnerability'], category: 'ARCHETYPE' },
};

/**
 * Search for matching dream symbols based on user input
 */
export function searchDreamSymbols(query: string, limit: number = 10): Array<{ name: string; meanings: string[]; category: symbol_category }> {
  const normalizedQuery = query.toLowerCase().trim();
  const results: Array<{ name: string; meanings: string[]; category: symbol_category }> = [];

  for (const [name, data] of Object.entries(DREAM_SYMBOL_SUGGESTIONS)) {
    if (name.toLowerCase().includes(normalizedQuery)) {
      results.push({ name, ...data });
    }
    if (results.length >= limit) break;
  }

  return results;
}

// ============================================
// Card Classification Helpers
// ============================================

// List of Major Arcana card names
export const MAJOR_ARCANA_NAMES = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World'
];

/**
 * Check if a card is Major Arcana
 */
export function isMajorArcana(cardName: string): boolean {
  const normalized = cardName.trim();
  return MAJOR_ARCANA_NAMES.some(major =>
    major.toLowerCase() === normalized.toLowerCase()
  );
}

/**
 * Get the suit of a card (returns null for Major Arcana)
 */
export function getCardSuit(cardName: string): string | null {
  const normalized = cardName.trim();

  // Check if it's a Minor Arcana card
  const minorMatch = normalized.match(/of\s+(Cups|Swords|Wands|Pentacles)/i);
  if (minorMatch) {
    return minorMatch[1].charAt(0).toUpperCase() + minorMatch[1].slice(1).toLowerCase();
  }

  return null;
}

/**
 * Get the rank of a card (e.g., "Ace", "Two", "Queen")
 */
export function getCardRank(cardName: string): string | null {
  const normalized = cardName.trim();

  // Major Arcana don't have ranks
  if (isMajorArcana(normalized)) {
    return null;
  }

  // Minor Arcana rank
  const minorMatch = normalized.match(/^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King)\s+of/i);
  if (minorMatch) {
    return minorMatch[1].charAt(0).toUpperCase() + minorMatch[1].slice(1).toLowerCase();
  }

  return null;
}

/**
 * Check if a card is a Court Card (Page, Knight, Queen, King)
 */
export function isCourtCard(cardName: string): boolean {
  const rank = getCardRank(cardName);
  return rank !== null && ['Page', 'Knight', 'Queen', 'King'].includes(rank);
}

/**
 * Normalize a card name for comparison
 */
export function normalizeCardName(cardName: string): string {
  return cardName.trim().toLowerCase();
}
