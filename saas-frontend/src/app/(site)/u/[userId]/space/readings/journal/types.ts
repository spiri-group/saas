// Common tarot deck options
export const TAROT_DECKS = [
  { key: 'rider-waite-smith', label: 'Rider-Waite-Smith' },
  { key: 'thoth', label: 'Thoth' },
  { key: 'marseille', label: 'Tarot de Marseille' },
  { key: 'wild-unknown', label: 'The Wild Unknown' },
  { key: 'modern-witch', label: 'Modern Witch' },
  { key: 'light-seers', label: 'Light Seer\'s' },
  { key: 'other', label: 'Other Deck' },
] as const;

// Card input type for the form
export interface CardFormInput {
  id: string; // Temporary ID for form management
  name: string;
  reversed: boolean;
  interpretation?: string;
}

// Form state type
export interface CardPullFormState {
  date: string;
  deck: string;
  customDeck?: string;
  cards: CardFormInput[];
}

// Default form state
export const getDefaultFormState = (date?: string): CardPullFormState => ({
  date: date || new Date().toISOString().split('T')[0],
  deck: 'rider-waite-smith', // Default to most common deck
  customDeck: '',
  cards: [{ id: crypto.randomUUID(), name: '', reversed: false }],
});
