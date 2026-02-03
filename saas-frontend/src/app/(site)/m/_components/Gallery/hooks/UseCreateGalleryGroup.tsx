import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { create_gallery_group_input } from '@/utils/spiriverse';

export const useCreateGalleryGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: create_gallery_group_input) => {
      const response = await gql<{
        createGalleryGroup: {
          success: boolean;
          galleryGroup: {
            id: string;
            name: string;
            description?: string;
            itemCount: number;
            createdAt: string;
            updatedAt: string;
          };
        };
      }>(`
        mutation CreateGalleryGroup($input: CreateGalleryGroupInput!) {
          createGalleryGroup(input: $input) {
            success
            galleryGroup {
              id
              name
              description
              categoryId
              itemCount
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createGalleryGroup;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch gallery groups
      queryClient.invalidateQueries({ queryKey: ['gallery-groups', variables.merchantId] });
    },
  });
};