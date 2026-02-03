'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { Card, DailyCardPull } from './useCardPulls';

interface UpdateCardPullInput {
  id: string;
  userId: string;
  deck?: string;
  cards?: Card[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
}

interface UpdateCardPullResponse {
  success: boolean;
  message?: string;
  cardPull?: DailyCardPull;
}

const useUpdateCardPull = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCardPullInput) => {
      const response = await gql<{
        updateCardPull: UpdateCardPullResponse;
      }>(`
        mutation UpdateCardPull($input: UpdateCardPullInput!) {
          updateCardPull(input: $input) {
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
      return response.updateCardPull;
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

export default useUpdateCardPull;
