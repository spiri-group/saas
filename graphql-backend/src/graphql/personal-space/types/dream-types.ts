import { recordref_type } from "../../0_shared/types";
import { symbol_tag, symbol_tag_input } from "./reading-types";

// ============================================
// Dream Journal Types
// ============================================

// Dream mood/emotion
export type dream_mood =
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

// Dream clarity level
export type dream_clarity =
  | 'vivid'      // Very clear, detailed memory
  | 'clear'      // Good recall
  | 'moderate'   // Some details remembered
  | 'hazy'       // Fragmented/unclear
  | 'minimal';   // Barely remembered

// Dream type/category
export type dream_type =
  | 'normal'
  | 'lucid'
  | 'recurring'
  | 'nightmare'
  | 'prophetic'
  | 'visitation'
  | 'flying'
  | 'falling'
  | 'spiritual';

// Dream Journal entry document type
export interface dream_journal_type {
  id: string;
  userId: string;
  docType: 'DREAM_JOURNAL';

  // Required fields
  date: string;          // ISO date string (YYYY-MM-DD)
  title: string;         // Brief title for the dream
  content: string;       // Main dream description/narrative

  // Categorization
  dreamType?: dream_type;
  mood?: dream_mood;
  clarity?: dream_clarity;
  isLucid?: boolean;

  // Analysis fields
  themes?: string[];     // Tags/themes (e.g., "water", "flying", "family")
  symbols: symbol_tag[]; // Enhanced symbol tags (shared with readings)
  interpretation?: string; // Personal interpretation
  emotions?: string[];   // Emotions felt during/after dream

  // Context
  sleepQuality?: number; // 1-5 scale
  wakeTime?: string;     // Time woke up (HH:mm)
  photoUrl?: string;     // Optional dream sketch/image

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Cosmos DB internal
  _id?: string;
  ref?: recordref_type;
}

// Input types
export interface create_dream_input {
  userId: string;
  date?: string;         // Defaults to today if not provided
  title: string;
  content: string;
  dreamType?: dream_type;
  mood?: dream_mood;
  clarity?: dream_clarity;
  isLucid?: boolean;
  themes?: string[];
  symbols?: symbol_tag_input[];  // Enhanced symbol input
  interpretation?: string;
  emotions?: string[];
  sleepQuality?: number;
  wakeTime?: string;
  photoUrl?: string;
}

export interface update_dream_input {
  id: string;
  userId: string;
  title?: string;
  content?: string;
  dreamType?: dream_type;
  mood?: dream_mood;
  clarity?: dream_clarity;
  isLucid?: boolean;
  themes?: string[];
  symbols?: symbol_tag_input[];  // Enhanced symbol input
  interpretation?: string;
  emotions?: string[];
  sleepQuality?: number;
  wakeTime?: string;
  photoUrl?: string;
}

// Response types
export interface dream_response {
  success: boolean;
  message?: string;
  dream?: dream_journal_type;
}

export interface delete_dream_response {
  success: boolean;
  message?: string;
}

// Filter types for dream queries
export interface dream_filters {
  startDate?: string;
  endDate?: string;
  dreamType?: dream_type;
  mood?: dream_mood;
  isLucid?: boolean;
  theme?: string;        // Search for specific theme
  limit?: number;
  offset?: number;
}
