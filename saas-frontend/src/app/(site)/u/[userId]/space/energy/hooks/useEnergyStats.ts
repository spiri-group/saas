'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface ChakraTrend {
  chakra: string;
  recentStatus: string;
  blockedCount: number;
  openCount: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface EnergyEntryTypeBreakdown {
  type: string;
  count: number;
}

export interface EnergyStats {
  totalJournalEntries: number;
  entriesThisWeek: number;
  entriesThisMonth: number;
  entryTypeBreakdown: EnergyEntryTypeBreakdown[];
  sessionsGiven: number;
  sessionsReceived: number;
  chakraCheckinsCount: number;
  chakraTrends: ChakraTrend[];
  mostBlockedChakra?: string;
  mostOpenChakra?: string;
  totalPracticeMinutes: number;
  averageSessionLength: number;
  practiceStreak: number;
}

const useEnergyStats = (userId: string) => {
  return useQuery({
    queryKey: ['energy-stats', userId],
    queryFn: async () => {
      const response = await gql<{
        energyStats: EnergyStats;
      }>(`
        query GetEnergyStats($userId: ID!) {
          energyStats(userId: $userId) {
            totalJournalEntries
            entriesThisWeek
            entriesThisMonth
            entryTypeBreakdown {
              type
              count
            }
            sessionsGiven
            sessionsReceived
            chakraCheckinsCount
            chakraTrends {
              chakra
              recentStatus
              blockedCount
              openCount
              trend
            }
            mostBlockedChakra
            mostOpenChakra
            totalPracticeMinutes
            averageSessionLength
            practiceStreak
          }
        }
      `, { userId });
      return response.energyStats;
    },
    enabled: !!userId,
  });
};

export default useEnergyStats;
