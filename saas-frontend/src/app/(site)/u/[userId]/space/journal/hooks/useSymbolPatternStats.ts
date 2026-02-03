import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type SymbolCategory =
  | 'ELEMENT'
  | 'ANIMAL'
  | 'ARCHETYPE'
  | 'OBJECT'
  | 'PLACE'
  | 'PERSON'
  | 'ACTION'
  | 'CELESTIAL'
  | 'OTHER';

export interface SymbolOccurrence {
  symbolName: string;
  category?: SymbolCategory;
  totalCount: number;
  dreamCount: number;
  readingCount: number;
  lastSeen: string;
  personalMeaning?: string;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

export interface SymbolPatternStats {
  totalSymbols: number;
  totalOccurrences: number;
  topSymbols: SymbolOccurrence[];
  crossEntrySymbols: SymbolOccurrence[];
  categoryBreakdown: CategoryBreakdown[];
  recentSymbols: SymbolOccurrence[];
}

export const useSymbolPatternStats = (userId: string) => {
  return useQuery({
    queryKey: ['symbol-pattern-stats', userId],
    queryFn: async () => {
      const response = await gql<{
        symbolPatternStats: SymbolPatternStats;
      }>(`
        query GetSymbolPatternStats($userId: ID!) {
          symbolPatternStats(userId: $userId) {
            totalSymbols
            totalOccurrences
            topSymbols {
              symbolName
              category
              totalCount
              dreamCount
              readingCount
              lastSeen
              personalMeaning
            }
            crossEntrySymbols {
              symbolName
              category
              totalCount
              dreamCount
              readingCount
              lastSeen
              personalMeaning
            }
            categoryBreakdown {
              category
              count
              percentage
            }
            recentSymbols {
              symbolName
              category
              totalCount
              dreamCount
              readingCount
              lastSeen
              personalMeaning
            }
          }
        }
      `, { userId });
      return response.symbolPatternStats;
    },
    enabled: !!userId,
  });
};

export default useSymbolPatternStats;
