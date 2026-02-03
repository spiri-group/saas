import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_group_type } from '@/utils/spiriverse';

export const useGalleryGroups = (merchantId: string, categoryId?: string | null) => {
  return useQuery({
    queryKey: ['gallery-groups', merchantId, categoryId],
    queryFn: async () => {
      const response = await gql<{
        galleryGroups: gallery_group_type[];
      }>(`
        query GetGalleryGroups($merchantId: ID!, $categoryId: ID) {
          galleryGroups(merchantId: $merchantId, categoryId: $categoryId) {
            id
            name
            description
            categoryId
            itemCount
            createdAt
            updatedAt
          }
        }
      `, { merchantId, categoryId });
      return response.galleryGroups;
    },
    enabled: !!merchantId,
  });
};