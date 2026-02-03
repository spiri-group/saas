// ============================================
// Progressive Unlock System Types
// ============================================
// Universal framework for gating features based on user activity.
// Features unlock as users engage with the platform, creating a
// sense of discovery and preventing overwhelm for new users.

import { SpiritualInterest } from '../../user/types';

// ============================================
// Feature Identifiers
// ============================================

// All unlockable features across all interest areas
export type unlockable_feature =
  // Crystals
  | 'crystals:cleansing-log'
  | 'crystals:charging-reminders'
  | 'crystals:crystal-grids'
  | 'crystals:acquisition-journal'
  | 'crystals:pairing-notes'
  | 'crystals:shop-fair-log'
  // Mediumship
  | 'mediumship:synchronicity-log'
  | 'mediumship:spirit-messages'
  | 'mediumship:symbol-dictionary'
  | 'mediumship:loved-ones'
  | 'mediumship:development-exercises'
  // Energy
  | 'energy:attunement-tracker'
  | 'energy:protection-rituals'
  | 'energy:aura-observations'
  // Faith (all core, no progressive unlocks yet)
  // Tarot/Oracle (future)
  | 'tarot:card-pattern-stats'
  | 'tarot:symbol-tracking'
  | 'tarot:spread-builder';

// Interest area groupings
export type unlock_interest_area =
  | 'crystals'
  | 'mediumship'
  | 'energy'
  | 'faith'
  | 'tarot';

// ============================================
// Unlock Condition Types
// ============================================

// Types of conditions that can unlock features
export type unlock_condition_type =
  | 'days-active'           // User has been active for X days
  | 'entry-count'           // User has X entries of a specific type
  | 'total-entries'         // User has X total entries across types
  | 'first-entry'           // User has at least one entry of a type
  | 'collection-count'      // User has X items in a collection
  | 'setting-enabled'       // User has enabled a setting
  | 'prompt-based'          // Always available, shown via prompt
  | 'date-triggered';       // Triggered by calendar (holidays, anniversaries)

// Condition definition
export interface unlock_condition {
  type: unlock_condition_type;
  // For count-based conditions
  targetCount?: number;
  // For entry-count conditions, specify which doc type
  docType?: string;
  // For setting-enabled conditions
  settingKey?: string;
  // Human-readable description
  description: string;
}

// ============================================
// Unlock Status Types
// ============================================

// Progress toward an unlock
export interface unlock_progress {
  current: number;
  required: number;
  label: string;           // e.g., "3/5 crystals", "Day 5 of 7"
  percentage: number;      // 0-100 for progress bars
}

// Status of a single feature
export interface unlock_status {
  featureId: unlockable_feature;
  featureName: string;     // Human-readable name
  featureDescription: string;
  interestArea: unlock_interest_area;
  isUnlocked: boolean;
  progress?: unlock_progress;
  unlockedAt?: string;     // ISO timestamp when first unlocked
  celebrationShown?: boolean;
  // For prompt-based unlocks
  isPromptBased?: boolean;
  promptContext?: string;  // e.g., "holiday", "anniversary"
}

// All unlock statuses for a user, grouped by interest
export interface user_unlock_state {
  userId: string;
  // Activity metrics used for calculations
  activityMetrics: user_activity_metrics;
  // Unlock status by interest area
  crystals: unlock_status[];
  mediumship: unlock_status[];
  energy: unlock_status[];
  faith: unlock_status[];
  tarot: unlock_status[];
  // Recently unlocked (for celebration)
  recentlyUnlocked: unlock_status[];
  // Next up (closest to unlocking)
  upcomingUnlocks: unlock_status[];
}

// ============================================
// User Activity Metrics
// ============================================

// Centralized activity metrics for unlock calculations
export interface user_activity_metrics {
  userId: string;
  // Account age
  accountCreatedAt: string;
  daysActive: number;           // Days with at least one action
  currentStreak: number;        // Consecutive days active
  longestStreak: number;
  lastActiveDate: string;

  // Entry counts by doc type
  entryCounts: {
    // Mediumship
    dreams: number;
    readingEntries: number;     // Card pull/reading journal entries
    readingReflections: number; // Readings received from mediums
    synchronicities: number;
    spiritMessages: number;
    developmentExercises: number;
    // Energy
    energyJournalEntries: number;
    chakraCheckins: number;
    sessionReflections: number;
    attunements: number;
    protectionRituals: number;
    auraObservations: number;
    clearingEntries: number;    // Subset of energy journal
    sessionsGiven: number;      // Subset of energy journal
    // Crystals
    crystalsInCollection: number;
    crystalCleansings: number;
    crystalGrids: number;
    acquisitionsWithVendor: number;
    // Faith
    dailyPassagesRead: number;
    prayerEntries: number;
    scriptureReflections: number;
    // Tarot
    cardPulls: number;
  };

  // Settings flags relevant to unlocks
  settings: {
    moonNotificationsEnabled: boolean;
  };
}

// ============================================
// Unlock Event (for tracking/analytics)
// ============================================

export interface unlock_event {
  id: string;
  userId: string;
  docType: 'UNLOCK_EVENT';
  featureId: unlockable_feature;
  unlockedAt: string;
  celebrationShown: boolean;
  celebrationShownAt?: string;
  // Snapshot of what triggered the unlock
  triggerMetrics?: Partial<user_activity_metrics['entryCounts']>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Feature Definition Registry
// ============================================

// Complete definition of an unlockable feature
export interface feature_definition {
  id: unlockable_feature;
  name: string;
  description: string;
  interestArea: unlock_interest_area;
  requiredInterest: SpiritualInterest;  // Which spiritual interest enables this
  condition: unlock_condition;
  icon?: string;                         // Icon name for UI
  route?: string;                        // Route path when unlocked
  // Celebration content
  celebration: {
    title: string;                       // "New Feature Unlocked!"
    message: string;                     // What they can now do
    ctaText: string;                     // "Try it now"
  };
}

// ============================================
// GraphQL Input/Response Types
// ============================================

export interface mark_celebration_shown_input {
  userId: string;
  featureId: unlockable_feature;
}

export interface unlock_status_response {
  success: boolean;
  message?: string;
  status?: unlock_status;
}

export interface user_unlock_state_response {
  success: boolean;
  message?: string;
  state?: user_unlock_state;
}

// ============================================
// Unlock Check Function Type
// ============================================

// Function signature for checking if a feature is unlocked
export type unlock_check_fn = (metrics: user_activity_metrics) => {
  isUnlocked: boolean;
  progress?: unlock_progress;
};
