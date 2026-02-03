import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteListingResponse {
  delete_listing: {
    code: string;
    success: boolean;
    message: string;
  };
}

interface DeleteListingVariables {
  id: string;
  vendorId: string;
}

export const useDeleteListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendorId }: DeleteListingVariables) => {
      const response = await gql<DeleteListingResponse>(`
        mutation DeleteListing($id: String!, $vendorId: String!) {
          delete_listing(id: $id, vendorId: $vendorId) {
            code
            success
            message
          }
        }
      `, { id, vendorId });

      return response.delete_listing;
    },
    onSuccess: (data, variables) => {
      // Invalidate catalogue queries to refresh the listing
      queryClient.invalidateQueries({ queryKey: ['catalogue-listings', variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
    },
  });
};

export default useDeleteListing;
