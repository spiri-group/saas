// Meditation technique options
export const MEDITATION_TECHNIQUES = [
  { key: 'mindfulness', label: 'Mindfulness' },
  { key: 'breathing', label: 'Breathing' },
  { key: 'guided', label: 'Guided' },
  { key: 'mantra', label: 'Mantra' },
  { key: 'visualization', label: 'Visualization' },
  { key: 'body_scan', label: 'Body Scan' },
  { key: 'loving_kindness', label: 'Loving Kindness' },
  { key: 'transcendental', label: 'Transcendental' },
  { key: 'walking', label: 'Walking' },
  { key: 'chakra', label: 'Chakra' },
  { key: 'sound', label: 'Sound/Music' },
  { key: 'other', label: 'Other' },
] as const;

// Meditation mood options
export const MEDITATION_MOODS = [
  { key: 'peaceful', label: 'Peaceful' },
  { key: 'calm', label: 'Calm' },
  { key: 'refreshed', label: 'Refreshed' },
  { key: 'energized', label: 'Energized' },
  { key: 'grounded', label: 'Grounded' },
  { key: 'clear', label: 'Clear' },
  { key: 'relaxed', label: 'Relaxed' },
  { key: 'sleepy', label: 'Sleepy' },
  { key: 'restless', label: 'Restless' },
  { key: 'neutral', label: 'Neutral' },
] as const;

export type MeditationTechnique = typeof MEDITATION_TECHNIQUES[number]['key'];
export type MeditationMood = typeof MEDITATION_MOODS[number]['key'];

// Form state type
export interface MeditationFormState {
  date: string;
  duration: number;
  technique?: MeditationTechnique;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: MeditationMood;
  postSessionMood?: MeditationMood;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
}

// Default form state
export const getDefaultFormState = (date?: string): MeditationFormState => ({
  date: date || new Date().toISOString().split('T')[0],
  duration: 10, // Default 10 minutes
  technique: 'mindfulness',
  depth: 3,
  distractionLevel: 3,
});
