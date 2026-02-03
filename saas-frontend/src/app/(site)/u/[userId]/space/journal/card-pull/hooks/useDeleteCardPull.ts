'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteCardPullInput {
  id: string;
  userId: string;
}

interface DeleteCardPullResponse {
  success: boolean;
  message?: string;
}

const useDeleteCardPull = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteCardPullInput) => {
      const response = await gql<{
        deleteCardPull: DeleteCardPullResponse;
      }>(`
        mutation DeleteCardPull($id: ID!, $userId: ID!) {
          deleteCardPull(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id: input.id, userId: input.userId });

      // Check if the operation was successful
      if (!response.deleteCardPull.success) {
        throw new Error(response.deleteCardPull.message || 'Failed to delete reading');
      }

      return response.deleteCardPull;
    },
    onSuccess: (_, variables) => {
      // Invalidate all card-pulls queries for this user to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['card-pulls', variables.userId] });
      // Invalidate any date-based queries
      queryClient.invalidateQueries({ queryKey: ['card-pull-by-date', variables.userId] });
      // Also invalidate reading-entries queries (new naming)
      queryClient.invalidateQueries({ queryKey: ['reading-entries', variables.userId] });
    },
  });
};

export default useDeleteCardPull;
