'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ZodiacSign, CelestialBody, AspectType } from './useBirthChart';
import { MoonPhase } from './useTransits';

// ============================================
// Types
// ============================================

export type JournalMood =
  | 'heavy'
  | 'energised'
  | 'reflective'
  | 'anxious'
  | 'peaceful'
  | 'confused';

export interface TransitSnapshotAspect {
  transitingBody: CelestialBody;
  natalBody: CelestialBody;
  aspect: AspectType;
  orb: number;
}

export interface TransitSnapshot {
  moonSign: ZodiacSign;
  moonPhase: MoonPhase;
  moonPhaseName: string;
  activeTransits: TransitSnapshotAspect[];
  retrogradePlanets: CelestialBody[];
  capturedAt: string;
}

export interface AstrologyJournalEntry {
  id: string;
  userId: string;
  transitSnapshot: TransitSnapshot;
  promptShown?: string;
  promptDismissed: boolean;
  content: string;
  planetaryThemes: CelestialBody[];
  mood?: JournalMood;
  linkedReadingId?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

export interface JournalPrompt {
  id: string;
  category: 'moon_sign' | 'planetary_transit' | 'retrograde' | 'general';
  triggerBody?: CelestialBody;
  triggerSign?: ZodiacSign;
  prompt: string;
}

export interface PlanetCount {
  planet: CelestialBody;
  count: number;
}

export interface AstrologyJournalStats {
  totalEntries: number;
  entriesByMoonPhase: Record<MoonPhase, number>;
  entriesByMood: Record<JournalMood, number>;
  mostTaggedPlanets: PlanetCount[];
}

export interface CreateAstrologyJournalInput {
  userId: string;
  content: string;
  promptShown?: string;
  promptDismissed?: boolean;
  planetaryThemes?: CelestialBody[];
  mood?: JournalMood;
  linkedReadingId?: string;
}

export interface UpdateAstrologyJournalInput {
  id: string;
  userId: string;
  content?: string;
  planetaryThemes?: CelestialBody[];
  mood?: JournalMood;
  linkedReadingId?: string;
}

export interface AstrologyJournalFilters {
  startDate?: string;
  endDate?: string;
  planetaryThemes?: CelestialBody[];
  mood?: JournalMood;
  hasLinkedReading?: boolean;
  duringRetrograde?: CelestialBody;
  moonSign?: ZodiacSign;
  moonPhase?: MoonPhase;
  limit?: number;
  offset?: number;
}

// ============================================
// GraphQL Fragments
// ============================================

const JOURNAL_ENTRY_FIELDS = `
  id
  userId
  transitSnapshot {
    moonSign
    moonPhase
    moonPhaseName
    activeTransits {
      transitingBody
      natalBody
      aspect
      orb
    }
    retrogradePlanets
    capturedAt
  }
  promptShown
  promptDismissed
  content
  planetaryThemes
  mood
  linkedReadingId
  createdAt
  updatedAt
  ref {
    id
    partition
    container
  }
`;

// ============================================
// Hooks
// ============================================

export const useAstrologyJournalEntries = (userId: string, filters?: AstrologyJournalFilters) => {
  return useQuery({
    queryKey: ['astrology-journal-entries', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        astrologyJournalEntries: AstrologyJournalEntry[];
      }>(`
        query GetAstrologyJournalEntries($userId: ID!, $filters: AstrologyJournalFilters) {
          astrologyJournalEntries(userId: $userId, filters: $filters) {
            ${JOURNAL_ENTRY_FIELDS}
          }
        }
      `, { userId, filters });
      return response.astrologyJournalEntries;
    },
    enabled: !!userId,
  });
};

export const useAstrologyJournalEntry = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['astrology-journal-entry', id, userId],
    queryFn: async () => {
      const response = await gql<{
        astrologyJournalEntry: AstrologyJournalEntry | null;
      }>(`
        query GetAstrologyJournalEntry($id: ID!, $userId: ID!) {
          astrologyJournalEntry(id: $id, userId: $userId) {
            ${JOURNAL_ENTRY_FIELDS}
          }
        }
      `, { id, userId });
      return response.astrologyJournalEntry;
    },
    enabled: !!id && !!userId,
  });
};

export const useAstrologyJournalPrompt = (userId: string) => {
  return useQuery({
    queryKey: ['astrology-journal-prompt', userId],
    queryFn: async () => {
      const response = await gql<{
        astrologyJournalPrompt: JournalPrompt | null;
      }>(`
        query GetAstrologyJournalPrompt($userId: ID!) {
          astrologyJournalPrompt(userId: $userId) {
            id
            category
            triggerBody
            triggerSign
            prompt
          }
        }
      `, { userId });
      return response.astrologyJournalPrompt;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useAstrologyJournalStats = (userId: string) => {
  return useQuery({
    queryKey: ['astrology-journal-stats', userId],
    queryFn: async () => {
      const response = await gql<{
        astrologyJournalStats: AstrologyJournalStats;
      }>(`
        query GetAstrologyJournalStats($userId: ID!) {
          astrologyJournalStats(userId: $userId) {
            totalEntries
            entriesByMoonPhase
            entriesByMood
            mostTaggedPlanets {
              planet
              count
            }
          }
        }
      `, { userId });
      return response.astrologyJournalStats;
    },
    enabled: !!userId,
  });
};

export const useCreateAstrologyJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAstrologyJournalInput) => {
      const response = await gql<{
        createAstrologyJournalEntry: {
          success: boolean;
          message?: string;
          entry?: AstrologyJournalEntry;
        };
      }>(`
        mutation CreateAstrologyJournalEntry($input: CreateAstrologyJournalInput!) {
          createAstrologyJournalEntry(input: $input) {
            success
            message
            entry {
              ${JOURNAL_ENTRY_FIELDS}
            }
          }
        }
      `, { input });
      return response.createAstrologyJournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-stats', variables.userId] });
    },
  });
};

export const useUpdateAstrologyJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAstrologyJournalInput) => {
      const response = await gql<{
        updateAstrologyJournalEntry: {
          success: boolean;
          message?: string;
          entry?: AstrologyJournalEntry;
        };
      }>(`
        mutation UpdateAstrologyJournalEntry($input: UpdateAstrologyJournalInput!) {
          updateAstrologyJournalEntry(input: $input) {
            success
            message
            entry {
              ${JOURNAL_ENTRY_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateAstrologyJournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-entry', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-stats', variables.userId] });
    },
  });
};

export const useDeleteAstrologyJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteAstrologyJournalEntry: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteAstrologyJournalEntry($id: ID!, $userId: ID!) {
          deleteAstrologyJournalEntry(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteAstrologyJournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-entry', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['astrology-journal-stats', variables.userId] });
    },
  });
};

// ============================================
// Helper Data
// ============================================

export const JOURNAL_MOODS: { key: JournalMood; name: string; emoji: string; color: string }[] = [
  { key: 'heavy', name: 'Heavy', emoji: '😔', color: 'bg-slate-500' },
  { key: 'energised', name: 'Energised', emoji: '⚡', color: 'bg-yellow-500' },
  { key: 'reflective', name: 'Reflective', emoji: '🤔', color: 'bg-blue-500' },
  { key: 'anxious', name: 'Anxious', emoji: '😰', color: 'bg-orange-500' },
  { key: 'peaceful', name: 'Peaceful', emoji: '😌', color: 'bg-green-500' },
  { key: 'confused', name: 'Confused', emoji: '😵', color: 'bg-purple-500' },
];

export const getMoodInfo = (mood: JournalMood) => {
  return JOURNAL_MOODS.find(m => m.key === mood);
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
};

export const getPromptCategoryLabel = (category: JournalPrompt['category']): string => {
  const labels: Record<JournalPrompt['category'], string> = {
    moon_sign: 'Moon Energy',
    planetary_transit: 'Transit Influence',
    retrograde: 'Retrograde Reflection',
    general: 'General',
  };
  return labels[category];
};
