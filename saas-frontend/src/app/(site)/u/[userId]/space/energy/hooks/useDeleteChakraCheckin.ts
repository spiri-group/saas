'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteChakraCheckinInput {
  id: string;
  userId: string;
}

interface DeleteChakraCheckinResponse {
  success: boolean;
  message?: string;
}

const useDeleteChakraCheckin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: DeleteChakraCheckinInput) => {
      const response = await gql<{
        deleteChakraCheckin: DeleteChakraCheckinResponse;
      }>(`
        mutation DeleteChakraCheckin($id: ID!, $userId: ID!) {
          deleteChakraCheckin(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteChakraCheckin;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['chakra-checkins', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['energy-stats', variables.userId] });
      }
    },
  });
};

export default useDeleteChakraCheckin;
