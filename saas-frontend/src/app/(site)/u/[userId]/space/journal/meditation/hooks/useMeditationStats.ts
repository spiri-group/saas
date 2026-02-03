'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface MeditationStats {
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  currentStreak: number;
  longestStreak: number;
  favoriteTime?: string;
  favoriteTechnique?: string;
}

const useMeditationStats = (userId: string) => {
  return useQuery({
    queryKey: ['meditation-stats', userId],
    queryFn: async () => {
      const response = await gql<{
        meditationStats: MeditationStats;
      }>(`
        query GetMeditationStats($userId: ID!) {
          meditationStats(userId: $userId) {
            totalSessions
            totalMinutes
            averageDuration
            currentStreak
            longestStreak
            favoriteTime
            favoriteTechnique
          }
        }
      `, { userId });
      return response.meditationStats;
    },
    enabled: !!userId,
  });
};

export default useMeditationStats;
