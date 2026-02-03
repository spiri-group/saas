'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface Card {
  name: string;
  reversed: boolean;
  spreadPosition?: string;
  interpretation?: string;
}

export interface DailyCardPull {
  id: string;
  userId: string;
  date: string;
  deck: string;
  cards: Card[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CardPullFilters {
  startDate?: string;
  endDate?: string;
  deck?: string;
  hasQuestion?: boolean;
  limit?: number;
  offset?: number;
}

const useCardPulls = (userId: string, filters?: CardPullFilters) => {
  return useQuery({
    queryKey: ['card-pulls', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        cardPulls: DailyCardPull[];
      }>(`
        query GetCardPulls($userId: ID!, $filters: CardPullFiltersInput) {
          cardPulls(userId: $userId, filters: $filters) {
            id
            userId
            date
            deck
            cards {
              name
              reversed
              spreadPosition
              interpretation
            }
            question
            firstImpression
            reflection
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.cardPulls;
    },
    enabled: !!userId,
  });
};

export default useCardPulls;
