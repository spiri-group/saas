'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { DailyCardPull } from './useCardPulls';

const useCardPullByDate = (userId: string, date: string) => {
  return useQuery({
    queryKey: ['card-pull-by-date', userId, date],
    queryFn: async () => {
      const response = await gql<{
        cardPullByDate: DailyCardPull | null;
      }>(`
        query GetCardPullByDate($userId: ID!, $date: String!) {
          cardPullByDate(userId: $userId, date: $date) {
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
      `, { userId, date });
      return response.cardPullByDate;
    },
    enabled: !!userId && !!date,
  });
};

export default useCardPullByDate;
