'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import type { SpiritSource, ReceptionMethod } from './useSpiritMessages';
import type { ExerciseType } from './useDevelopmentExercises';

// ============================================
// Types
// ============================================

interface SymbolCount {
  name: string;
  count: number;
}

interface UpcomingLovedOneDate {
  lovedOneId: string;
  name: string;
  date: string;
  occasion: string;
}

export interface MediumshipStats {
  totalSynchronicities: number;
  synchronicitiesThisMonth: number;
  totalSpiritMessages: number;
  messagesThisMonth: number;
  symbolCount: number;
  topSymbols: SymbolCount[];
  mostActiveSource?: SpiritSource;
  preferredReceptionMethod?: ReceptionMethod;
  exerciseCount: number;
  exercisesThisMonth: number;
  averageAccuracy: number;
  favoriteExercise?: ExerciseType;
  lovedOnesCount: number;
  upcomingDates: UpcomingLovedOneDate[];
  readingReflectionCount: number;
  averageReadingRating: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
}

// ============================================
// Hook
// ============================================

const useMediumshipStats = (userId: string) => {
  return useQuery({
    queryKey: ['mediumship-stats', userId],
    queryFn: async () => {
      const response = await gql<{
        mediumshipStats: MediumshipStats;
      }>(`
        query GetMediumshipStats($userId: ID!) {
          mediumshipStats(userId: $userId) {
            totalSynchronicities
            synchronicitiesThisMonth
            totalSpiritMessages
            messagesThisMonth
            symbolCount
            topSymbols {
              name
              count
            }
            mostActiveSource
            preferredReceptionMethod
            exerciseCount
            exercisesThisMonth
            averageAccuracy
            favoriteExercise
            lovedOnesCount
            upcomingDates {
              lovedOneId
              name
              date
              occasion
            }
            readingReflectionCount
            averageReadingRating
            daysActive
            currentStreak
            longestStreak
          }
        }
      `, { userId });
      return response.mediumshipStats;
    },
    enabled: !!userId,
  });
};

export default useMediumshipStats;
