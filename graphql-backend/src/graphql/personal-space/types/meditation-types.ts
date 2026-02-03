import { recordref_type } from "../../0_shared/types";

// ============================================
// Meditation Journal Types
// ============================================

// Meditation technique types
export type meditation_technique =
  | 'mindfulness'
  | 'breathing'
  | 'guided'
  | 'mantra'
  | 'visualization'
  | 'body_scan'
  | 'loving_kindness'
  | 'transcendental'
  | 'walking'
  | 'chakra'
  | 'sound'
  | 'other';

// Post-meditation mood/state
export type meditation_mood =
  | 'peaceful'
  | 'calm'
  | 'refreshed'
  | 'energized'
  | 'grounded'
  | 'clear'
  | 'relaxed'
  | 'sleepy'
  | 'restless'
  | 'neutral';

// Meditation Journal entry document type
export interface meditation_journal_type {
  id: string;
  userId: string;
  docType: 'MEDITATION_JOURNAL';

  // Required fields
  date: string;          // ISO date string (YYYY-MM-DD)
  duration: number;      // Duration in minutes

  // Session details
  technique?: meditation_technique;
  guidedBy?: string;     // Name of guide/app if guided meditation
  focus?: string;        // What was the focus (e.g., "breath", "chakra", "intention")

  // Experience
  preSessionMood?: meditation_mood;
  postSessionMood?: meditation_mood;
  depth?: number;        // 1-5 how deep was the meditation
  distractionLevel?: number; // 1-5 how distracted were you

  // Insights
  insights?: string;     // Any insights or realizations
  experiences?: string;  // Notable experiences (visions, sensations, etc.)
  intentions?: string;   // Intentions set during meditation
  gratitude?: string[];  // Things grateful for

  // Context
  location?: string;     // Where did you meditate
  posture?: string;      // Seated, lying, walking, etc.
  photoUrl?: string;     // Optional photo of space/setup

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Cosmos DB internal
  _id?: string;
  ref?: recordref_type;
}

// Input types
export interface create_meditation_input {
  userId: string;
  date?: string;         // Defaults to today if not provided
  duration: number;
  technique?: meditation_technique;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: meditation_mood;
  postSessionMood?: meditation_mood;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
  photoUrl?: string;
}

export interface update_meditation_input {
  id: string;
  userId: string;
  duration?: number;
  technique?: meditation_technique;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: meditation_mood;
  postSessionMood?: meditation_mood;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
  photoUrl?: string;
}

// Response types
export interface meditation_response {
  success: boolean;
  message?: string;
  meditation?: meditation_journal_type;
}

export interface delete_meditation_response {
  success: boolean;
  message?: string;
}

// Filter types for meditation queries
export interface meditation_filters {
  startDate?: string;
  endDate?: string;
  technique?: meditation_technique;
  minDuration?: number;
  maxDuration?: number;
  limit?: number;
  offset?: number;
}

// Meditation Statistics
export interface meditation_stats {
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  currentStreak: number;
  longestStreak: number;
  favoriteTime: string | null;
  favoriteTechnique: string | null;
}
