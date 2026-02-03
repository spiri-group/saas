import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_item_type } from '@/utils/spiriverse';

export const useUnalbumedItems = (merchantId: string) => {
  return useQuery({
    queryKey: ['unalbumed-items', merchantId],
    queryFn: async () => {
      const response = await gql<{
        galleryItems: gallery_item_type[];
      }>(`
        query GetUnalbumedItems($merchantId: ID!) {
          galleryItems(merchantId: $merchantId, unalbumedOnly: true) {
            id
            type
            title
            description
            url
            thumbnailUrl
            layout
            groupId
            categoryId
            albumId
            ref {
              id
              partition
              container
            }
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
      `, { merchantId });
      return response.galleryItems;
    },
    enabled: !!merchantId,
  });
};