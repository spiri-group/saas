import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_item_type_enum, gallery_item_layout_enum, create_gallery_item_input } from '@/utils/spiriverse';


export const useCreateGalleryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: create_gallery_item_input) => {
      const response = await gql<{
        createGalleryItem: {
          success: boolean;
          message?: string;
          galleryItem: {
            id: string;
            type: gallery_item_type_enum;
            title: string;
            url: string;
            thumbnailUrl?: string;
            layout: gallery_item_layout_enum;
            albumId?: string;
            createdAt: string;
            updatedAt: string;
          };
        };
      }>(`
        mutation CreateGalleryItem($input: CreateGalleryItemInput!) {
          createGalleryItem(input: $input) {
            success
            message
            galleryItem {
              id
              type
              title
              description
              url
              thumbnailUrl
              layout
              albumId
              categoryId
              linkedProducts {
                id
                title
                thumbnailUrl
                price {
                  amount
                  currency
                }
              }
              tags
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createGalleryItem;
    },
    onSuccess: (data, variables) => {
      // Invalidate gallery item queries so they refetch with the new item
      queryClient.invalidateQueries({ queryKey: ['gallery-items', variables.merchantId] });
      queryClient.invalidateQueries({ queryKey: ['gallery-items-infinite', variables.merchantId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-gallery', variables.merchantId] });

      // Update category items count in cache
      if (variables.categoryId) {
        queryClient.invalidateQueries({ queryKey: ['gallery-categories', variables.merchantId] });
      }

      // Update group items count in cache
      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: ['gallery-groups', variables.merchantId] });
      }
    },
  });
};