import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { create_gallery_category_input } from '@/utils/spiriverse';

export const useCreateGalleryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: create_gallery_category_input) => {
      const response = await gql<{
        createGalleryCategory: {
          success: boolean;
          galleryCategory: {
            id: string;
            name: string;
            description?: string;
            color?: string;
            icon?: string;
            sortOrder: number;
            groupCount: number;
            itemCount: number;
            createdAt: string;
            updatedAt: string;
          };
        };
      }>(`
        mutation CreateGalleryCategory($input: CreateGalleryCategoryInput!) {
          createGalleryCategory(input: $input) {
            success
            galleryCategory {
              id
              name
              description
              color
              icon
              sortOrder
              groupCount
              itemCount
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createGalleryCategory;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch gallery categories
      queryClient.invalidateQueries({ queryKey: ['gallery-categories', variables.merchantId] });
    },
  });
};