import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type DeleteGalleryItemInput = {
  id: string;
  merchantId: string;
};

export const useDeleteGalleryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteGalleryItemInput) => {
      const response = await gql<{
        deleteGalleryItem: {
          success: boolean;
        };
      }>(`
        mutation DeleteGalleryItem($id: ID!, $merchantId: ID!) {
          deleteGalleryItem(id: $id, merchantId: $merchantId) {
            success
          }
        }
      `, input);
      return response.deleteGalleryItem;
    },
    onSuccess: (data, variables) => {
      // Remove the item from all relevant cache entries
      const removeFromCache = (queryKey: any[]) => {
        queryClient.setQueryData(queryKey, (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.filter((item: any) => item.id !== variables.id);
        });
      };

      // Remove from various cache combinations
      removeFromCache(['gallery-items', variables.merchantId, null, null]);
      
      // We need to remove from all possible category/album combinations
      // Since we don't know which specific filters were active, we'll invalidate
      queryClient.invalidateQueries({ 
        queryKey: ['gallery-items'], 
        exact: false 
      });
      
      // Also update category counts
      queryClient.invalidateQueries({ 
        queryKey: ['gallery-categories', variables.merchantId] 
      });
      
      // And group counts if applicable
      queryClient.invalidateQueries({ 
        queryKey: ['gallery-groups'], 
        exact: false 
      });

      // Invalidate vendor storage cache to update storage usage after deletion
      queryClient.invalidateQueries({ queryKey: ['vendorStorage', variables.merchantId] });
    },
  });
};