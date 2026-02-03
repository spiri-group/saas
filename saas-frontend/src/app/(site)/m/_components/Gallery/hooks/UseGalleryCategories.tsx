import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_category_type } from '@/utils/spiriverse';

export const useGalleryCategories = (merchantId: string) => {
  return useQuery({
    queryKey: ['gallery-categories', merchantId],
    queryFn: async () => {
      const response = await gql<{
        galleryCategories: gallery_category_type[];
      }>(`
        query GetGalleryCategories($merchantId: ID!) {
          galleryCategories(merchantId: $merchantId) {
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
      `, { merchantId });
      return response.galleryCategories.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    enabled: !!merchantId,
  });
};