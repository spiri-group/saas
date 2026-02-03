import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_item_type } from '@/utils/spiriverse';

// Keep the original hook for backward compatibility
export const useGalleryItems = (merchantId: string, categoryId?: string | null, albumId?: string | null) => {
  return useQuery({
    queryKey: ['gallery-items', merchantId, categoryId, albumId],
    queryFn: async () => {
      const response = await gql<{
        galleryItems: gallery_item_type[];
      }>(`
        query GetGalleryItems($merchantId: ID!, $categoryId: ID, $albumId: ID) {
          galleryItems(merchantId: $merchantId, categoryId: $categoryId, albumId: $albumId) {
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
      `, { merchantId, categoryId, albumId });
      return response.galleryItems;
    },
    enabled: !!merchantId,
  });
};

// New infinite query hook for paginated gallery items
export const useInfiniteGalleryItems = (
  merchantId: string, 
  categoryId?: string | null, 
  albumId?: string | null,
  pageSize: number = 12
) => {
  return useInfiniteQuery({
    queryKey: ['gallery-items-infinite', merchantId, categoryId, albumId, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await gql<{
        galleryItemsPaginated: {
          items: gallery_item_type[];
          hasMore: boolean;
          totalCount: number;
        };
      }>(`
        query GetGalleryItemsPaginated($merchantId: ID!, $categoryId: ID, $albumId: ID, $offset: Int!, $limit: Int!) {
          galleryItemsPaginated(merchantId: $merchantId, categoryId: $categoryId, albumId: $albumId, offset: $offset, limit: $limit) {
            items {
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
            hasMore
            totalCount
          }
        }
      `, { 
        merchantId, 
        categoryId, 
        albumId, 
        offset: pageParam * pageSize,
        limit: pageSize
      });
      return response.galleryItemsPaginated;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!merchantId,
    initialPageParam: 0,
  });
};