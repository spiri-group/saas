import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_item_type_enum, gallery_item_layout_enum, gallery_item_type } from '@/utils/spiriverse';

type UpsertGalleryItemInput = {
  id?: string; // If provided, will update existing item; if not, will create new item
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    price?: {
      amount: number;
      currency: string;
    };
  }>;
  tags?: string[];
  usedBytes?: number;
};

export const useUpsertGalleryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertGalleryItemInput) => {
      const response = await gql<{
        upsertGalleryItem: {
          success: boolean;
          isNew: boolean;
          galleryItem: {
            id: string;
            type: gallery_item_type_enum;
            title: string;
            description?: string;
            url: string;
            thumbnailUrl?: string;
            layout: gallery_item_layout_enum;
            albumId?: string;
            categoryId?: string;
            groupId?: string;
            linkedProducts?: Array<{
              id: string;
              title: string;
              thumbnailUrl?: string;
              price?: {
                amount: number;
                currency: string;
              };
            }>;
            tags?: string[];
            createdAt: string;
            updatedAt: string;
          };
        };
      }>(`
        mutation UpsertGalleryItem($input: UpsertGalleryItemInput!) {
          upsertGalleryItem(input: $input) {
            success
            isNew
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
              groupId
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
      return response.upsertGalleryItem;
    },
    onSuccess: (data, variables) => {
      const merchantId = variables.merchantId;

      queryClient.setQueryData(['unalbumed-items', merchantId], 
        (oldData: gallery_item_type[] = []) => oldData.filter(item => item.id !== data.galleryItem.id));

      // Only invalidate album counts if the item was new or albumId changed
      if (data.isNew || variables.albumId) {
        queryClient.invalidateQueries({ queryKey: ['gallery-albums', merchantId] });
      }
      
      // Only invalidate storage if this was a new item (new files uploaded)
      if (data.isNew) {
        queryClient.invalidateQueries({ queryKey: ['vendorStorage', merchantId] });
      }
    }

  });
};