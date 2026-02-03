import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type DeleteGalleryGroupInput = {
  groupId: string;
};

export const useDeleteGalleryGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteGalleryGroupInput) => {
      const response = await gql<{
        deleteGalleryGroup: {
          success: boolean;
        };
      }>(`
        mutation DeleteGalleryGroup($groupId: ID!) {
          deleteGalleryGroup(groupId: $groupId) {
            success
          }
        }
      `, input);
      return response.deleteGalleryGroup;
    },
    onSuccess: () => {
      // Invalidate all gallery-related queries
      queryClient.invalidateQueries({ queryKey: ['gallery-groups'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] });
    },
  });
};