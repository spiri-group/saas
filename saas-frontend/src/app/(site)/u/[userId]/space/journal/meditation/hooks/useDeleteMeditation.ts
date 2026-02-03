'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteMeditationInput {
  id: string;
  userId: string;
}

interface DeleteMeditationResponse {
  success: boolean;
  message?: string;
}

const useDeleteMeditation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteMeditationInput) => {
      const response = await gql<{
        deleteMeditation: DeleteMeditationResponse;
      }>(`
        mutation DeleteMeditation($id: ID!, $userId: ID!) {
          deleteMeditation(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id: input.id, userId: input.userId });
      return response.deleteMeditation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meditations', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['meditation-stats', variables.userId] });
    },
  });
};

export default useDeleteMeditation;
