'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteSessionReflectionInput {
  id: string;
  userId: string;
}

interface DeleteSessionReflectionResponse {
  success: boolean;
  message?: string;
}

const useDeleteSessionReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: DeleteSessionReflectionInput) => {
      const response = await gql<{
        deleteSessionReflection: DeleteSessionReflectionResponse;
      }>(`
        mutation DeleteSessionReflection($id: ID!, $userId: ID!) {
          deleteSessionReflection(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteSessionReflection;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['session-reflections', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['energy-stats', variables.userId] });
      }
    },
  });
};

export default useDeleteSessionReflection;
