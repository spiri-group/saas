import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type PatternPeriod = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEAR' | 'ALL_TIME';

export interface CardFrequency {
  name: string;
  count: number;
  reversedCount: number;
  lastPulled: string;
}

export interface SuitDistribution {
  suit: string;
  count: number;
  percentage: number;
}

export interface CardPatternStats {
  // Overall counts
  totalReadings: number;
  totalCards: number;
  uniqueCards: number;

  // Time-based
  readingsThisWeek: number;
  readingsThisMonth: number;

  // Card frequency
  topCards: CardFrequency[];
  recentCards: CardFrequency[];

  // Suit analysis
  suitDistribution: SuitDistribution[];

  // Major vs Minor
  majorArcanaCount: number;
  minorArcanaCount: number;
  majorArcanaPercentage: number;

  // Reversed stats
  totalReversed: number;
  reversedPercentage: number;

  // Source breakdown
  selfReadings: number;
  externalReadings: number;
  spiriverseReadings: number;

  // Period info
  periodStart?: string;
  periodEnd?: string;

  // Comparison with previous period
  previousPeriodReadings?: number;
  readingsChange?: number;
  readingsChangePercent?: number;

  // Emerging/fading patterns
  emergingCards?: CardFrequency[];
  fadingCards?: CardFrequency[];
}

export const useCardPatternStats = (userId: string, period: PatternPeriod = 'MONTH') => {
  return useQuery({
    queryKey: ['card-pattern-stats', userId, period],
    queryFn: async () => {
      const response = await gql<{
        cardPatternStats: CardPatternStats;
      }>(`
        query GetCardPatternStats($userId: ID!, $period: PatternPeriod) {
          cardPatternStats(userId: $userId, period: $period) {
            totalReadings
            totalCards
            uniqueCards
            readingsThisWeek
            readingsThisMonth
            topCards {
              name
              count
              reversedCount
              lastPulled
            }
            recentCards {
              name
              count
              reversedCount
              lastPulled
            }
            suitDistribution {
              suit
              count
              percentage
            }
            majorArcanaCount
            minorArcanaCount
            majorArcanaPercentage
            totalReversed
            reversedPercentage
            selfReadings
            externalReadings
            spiriverseReadings
            periodStart
            periodEnd
            previousPeriodReadings
            readingsChange
            readingsChangePercent
            emergingCards {
              name
              count
              reversedCount
              lastPulled
            }
            fadingCards {
              name
              count
              reversedCount
              lastPulled
            }
          }
        }
      `, { userId, period });
      return response.cardPatternStats;
    },
    enabled: !!userId,
  });
};

export default useCardPatternStats;
