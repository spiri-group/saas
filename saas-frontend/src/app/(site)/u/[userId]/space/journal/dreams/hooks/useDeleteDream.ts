import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteDreamInput {
  id: string;
  userId: string;
}

interface DeleteDreamResponse {
  success: boolean;
  message?: string;
}

export const useDeleteDream = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: DeleteDreamInput) => {
      const response = await gql<{
        deleteDream: DeleteDreamResponse;
      }>(`
        mutation DeleteDream($id: ID!, $userId: ID!) {
          deleteDream(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteDream;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dreams', variables.userId] });
    },
  });
};
