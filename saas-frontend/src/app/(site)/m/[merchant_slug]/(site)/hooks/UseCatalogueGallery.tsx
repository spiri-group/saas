import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_item_type } from '@/utils/spiriverse';

export const useCatalogueGallery = (merchantId?: string) => {
  return useQuery({
    queryKey: ['catalogue-gallery', merchantId],
    queryFn: async () => {
      const response = await gql<{
        catalogueGalleryItems: gallery_item_type[];
      }>(`
        query GetCatalogueGallery($merchantId: ID!) {
          catalogueGalleryItems(merchantId: $merchantId) {
            id
            type
            title
            description
            url
            thumbnailUrl
            layout
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
          }
        }
      `, { merchantId });
      return response.catalogueGalleryItems;
    },
    enabled: !!merchantId,
  });
};