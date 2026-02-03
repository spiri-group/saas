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
      // Update the cache directly to add the new item
      queryClient.setQueryData(
        ['gallery-items', variables.merchantId, variables.categoryId, variables.groupId],
        (oldData: any) => {
          if (!oldData) return [data.galleryItem];
          return [...oldData, data.galleryItem];
        }
      );

      // Also update the "all items" cache if no category/group filters
      if (!variables.categoryId && !variables.groupId) {
        queryClient.setQueryData(
          ['gallery-items', variables.merchantId, null, null],
          (oldData: any) => {
            if (!oldData) return [data.galleryItem];
            return [...oldData, data.galleryItem];
          }
        );
      }

      // Update catalogue gallery cache to prevent duplicates
      queryClient.setQueryData(
        ['catalogue-gallery', variables.merchantId],
        (oldData: any) => {
          if (!oldData) return [data.galleryItem];
          // Check if item already exists to prevent duplicates
          const existingItem = oldData.find((item: any) => item.id === data.galleryItem.id);
          if (existingItem) return oldData;
          return [...oldData, data.galleryItem];
        }
      );

      // Update category items count in cache
      if (variables.categoryId) {
        queryClient.setQueryData(
          ['gallery-categories', variables.merchantId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((category: any) => 
              category.id === variables.categoryId
                ? { ...category, itemCount: (category.itemCount || 0) + 1 }
                : category
            );
          }
        );
      }

      // Update group items count in cache
      if (variables.groupId) {
        queryClient.setQueryData(
          ['gallery-groups', variables.merchantId, variables.categoryId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((group: any) => 
              group.id === variables.groupId
                ? { ...group, itemCount: (group.itemCount || 0) + 1 }
                : group
            );
          }
        );
      }
    },
  });
};