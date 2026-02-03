import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export type UnlockInterestArea = 'crystals' | 'mediumship' | 'energy' | 'faith' | 'tarot';

export interface UnlockProgress {
  current: number;
  required: number;
  label: string;
  percentage: number;
}

export interface UnlockStatus {
  featureId: string;
  featureName: string;
  featureDescription: string;
  interestArea: UnlockInterestArea;
  isUnlocked: boolean;
  progress?: UnlockProgress;
  unlockedAt?: string;
  celebrationShown?: boolean;
  isPromptBased?: boolean;
  promptContext?: string;
}

export interface UnlockCelebration {
  title: string;
  message: string;
  ctaText: string;
  route?: string;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  interestArea: UnlockInterestArea;
  icon?: string;
  route?: string;
  celebration: UnlockCelebration;
}

export interface EntryCounts {
  dreams: number;
  readingEntries: number;
  readingReflections: number;
  synchronicities: number;
  spiritMessages: number;
  developmentExercises: number;
  energyJournalEntries: number;
  chakraCheckins: number;
  sessionReflections: number;
  attunements: number;
  protectionRituals: number;
  auraObservations: number;
  clearingEntries: number;
  sessionsGiven: number;
  crystalsInCollection: number;
  crystalCleansings: number;
  crystalGrids: number;
  acquisitionsWithVendor: number;
  dailyPassagesRead: number;
  prayerEntries: number;
  scriptureReflections: number;
  cardPulls: number;
}

export interface UserActivityMetrics {
  userId: string;
  accountCreatedAt: string;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  entryCounts: EntryCounts;
}

export interface UserUnlockState {
  userId: string;
  activityMetrics: UserActivityMetrics;
  crystals: UnlockStatus[];
  mediumship: UnlockStatus[];
  energy: UnlockStatus[];
  faith: UnlockStatus[];
  tarot: UnlockStatus[];
  recentlyUnlocked: UnlockStatus[];
  upcomingUnlocks: UnlockStatus[];
}

// ============================================
// GraphQL Fragments
// ============================================

const UNLOCK_STATUS_FRAGMENT = `
  featureId
  featureName
  featureDescription
  interestArea
  isUnlocked
  progress {
    current
    required
    label
    percentage
  }
  unlockedAt
  celebrationShown
  isPromptBased
  promptContext
`;

const ACTIVITY_METRICS_FRAGMENT = `
  userId
  accountCreatedAt
  daysActive
  currentStreak
  longestStreak
  lastActiveDate
  entryCounts {
    dreams
    readingEntries
    readingReflections
    synchronicities
    spiritMessages
    developmentExercises
    energyJournalEntries
    chakraCheckins
    sessionReflections
    attunements
    protectionRituals
    auraObservations
    clearingEntries
    sessionsGiven
    crystalsInCollection
    crystalCleansings
    crystalGrids
    acquisitionsWithVendor
    dailyPassagesRead
    prayerEntries
    scriptureReflections
    cardPulls
  }
`;

// ============================================
// Hooks
// ============================================

/**
 * Get complete unlock state for a user
 * Includes all features with their unlock status, progress, and celebrations
 */
export const useUserUnlockState = (userId: string) => {
  return useQuery({
    queryKey: ['user-unlock-state', userId],
    queryFn: async () => {
      const response = await gql<{ getUserUnlockState: UserUnlockState }>(`
        query GetUserUnlockState($userId: ID!) {
          getUserUnlockState(userId: $userId) {
            userId
            activityMetrics {
              ${ACTIVITY_METRICS_FRAGMENT}
            }
            crystals {
              ${UNLOCK_STATUS_FRAGMENT}
            }
            mediumship {
              ${UNLOCK_STATUS_FRAGMENT}
            }
            energy {
              ${UNLOCK_STATUS_FRAGMENT}
            }
            faith {
              ${UNLOCK_STATUS_FRAGMENT}
            }
            tarot {
              ${UNLOCK_STATUS_FRAGMENT}
            }
            recentlyUnlocked {
              ${UNLOCK_STATUS_FRAGMENT}
            }
            upcomingUnlocks {
              ${UNLOCK_STATUS_FRAGMENT}
            }
          }
        }
      `, { userId });
      return response.getUserUnlockState;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute - unlocks don't change frequently
  });
};

/**
 * Get unlock status for a specific feature
 */
export const useFeatureUnlockStatus = (userId: string, featureId: string) => {
  return useQuery({
    queryKey: ['feature-unlock-status', userId, featureId],
    queryFn: async () => {
      const response = await gql<{ getFeatureUnlockStatus: UnlockStatus | null }>(`
        query GetFeatureUnlockStatus($userId: ID!, $featureId: String!) {
          getFeatureUnlockStatus(userId: $userId, featureId: $featureId) {
            ${UNLOCK_STATUS_FRAGMENT}
          }
        }
      `, { userId, featureId });
      return response.getFeatureUnlockStatus;
    },
    enabled: !!userId && !!featureId,
  });
};

/**
 * Get user activity metrics (for display)
 */
export const useUserActivityMetrics = (userId: string) => {
  return useQuery({
    queryKey: ['user-activity-metrics', userId],
    queryFn: async () => {
      const response = await gql<{ getUserActivityMetrics: UserActivityMetrics }>(`
        query GetUserActivityMetrics($userId: ID!) {
          getUserActivityMetrics(userId: $userId) {
            ${ACTIVITY_METRICS_FRAGMENT}
          }
        }
      `, { userId });
      return response.getUserActivityMetrics;
    },
    enabled: !!userId,
  });
};

/**
 * Quick check if a feature is unlocked
 */
export const useIsFeatureUnlocked = (userId: string, featureId: string) => {
  return useQuery({
    queryKey: ['is-feature-unlocked', userId, featureId],
    queryFn: async () => {
      const response = await gql<{ isFeatureUnlocked: boolean }>(`
        query IsFeatureUnlocked($userId: ID!, $featureId: String!) {
          isFeatureUnlocked(userId: $userId, featureId: $featureId)
        }
      `, { userId, featureId });
      return response.isFeatureUnlocked;
    },
    enabled: !!userId && !!featureId,
  });
};

/**
 * Get list of unlocked feature IDs for an interest
 */
export const useUnlockedFeatures = (userId: string, interest: string) => {
  return useQuery({
    queryKey: ['unlocked-features', userId, interest],
    queryFn: async () => {
      const response = await gql<{ getUnlockedFeatures: string[] }>(`
        query GetUnlockedFeatures($userId: ID!, $interest: String!) {
          getUnlockedFeatures(userId: $userId, interest: $interest)
        }
      `, { userId, interest });
      return response.getUnlockedFeatures;
    },
    enabled: !!userId && !!interest,
  });
};

/**
 * Get feature definition
 */
export const useFeatureDefinition = (featureId: string) => {
  return useQuery({
    queryKey: ['feature-definition', featureId],
    queryFn: async () => {
      const response = await gql<{ getFeatureDefinition: FeatureDefinition | null }>(`
        query GetFeatureDefinition($featureId: String!) {
          getFeatureDefinition(featureId: $featureId) {
            id
            name
            description
            interestArea
            icon
            route
            celebration {
              title
              message
              ctaText
            }
          }
        }
      `, { featureId });
      return response.getFeatureDefinition;
    },
    enabled: !!featureId,
    staleTime: Infinity, // Feature definitions never change
  });
};

/**
 * Mark celebration as shown
 */
export const useMarkCelebrationShown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, featureId }: { userId: string; featureId: string }) => {
      const response = await gql<{ markCelebrationShown: boolean }>(`
        mutation MarkCelebrationShown($userId: ID!, $featureId: String!) {
          markCelebrationShown(userId: $userId, featureId: $featureId)
        }
      `, { userId, featureId });
      return response.markCelebrationShown;
    },
    onSuccess: (_, { userId }) => {
      // Invalidate unlock state to refresh celebrations
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', userId] });
    },
  });
};

// ============================================
// Convenience Hook
// ============================================

/**
 * Convenience hook for checking unlock status in navigation/UI
 * Returns simple boolean checks and progress for a specific interest area
 */
export const useUnlockStatusForInterest = (userId: string, interest: UnlockInterestArea) => {
  const { data: unlockState, isLoading } = useUserUnlockState(userId);

  const getStatusForFeature = (featureId: string): UnlockStatus | undefined => {
    if (!unlockState) return undefined;
    const features = unlockState[interest] || [];
    return features.find((f) => f.featureId === featureId);
  };

  const isUnlocked = (featureId: string): boolean => {
    const status = getStatusForFeature(featureId);
    return status?.isUnlocked ?? false;
  };

  const getProgress = (featureId: string): UnlockProgress | undefined => {
    const status = getStatusForFeature(featureId);
    return status?.progress;
  };

  return {
    isLoading,
    unlockState,
    isUnlocked,
    getProgress,
    getStatusForFeature,
    recentlyUnlocked: unlockState?.recentlyUnlocked || [],
    upcomingUnlocks: unlockState?.upcomingUnlocks || [],
    activityMetrics: unlockState?.activityMetrics,
  };
};
