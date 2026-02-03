'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { Card, DailyCardPull } from './useCardPulls';

interface CreateCardPullInput {
  userId: string;
  date?: string;
  deck: string;
  cards: Card[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
}

interface CreateCardPullResponse {
  success: boolean;
  message?: string;
  cardPull?: DailyCardPull;
}

const useCreateCardPull = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCardPullInput) => {
      const response = await gql<{
        createCardPull: CreateCardPullResponse;
      }>(`
        mutation CreateCardPull($input: CreateCardPullInput!) {
          createCardPull(input: $input) {
            success
            message
            cardPull {
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
        }
      `, { input });
      return response.createCardPull;
    },
    onSuccess: (data, variables) => {
      // Invalidate all card-pulls queries for this user to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['card-pulls', variables.userId] });
      // Also invalidate the specific date query if we know the date
      if (data.cardPull?.date) {
        queryClient.invalidateQueries({
          queryKey: ['card-pull-by-date', variables.userId, data.cardPull.date]
        });
      }
    },
  });
};

export default useCreateCardPull;
