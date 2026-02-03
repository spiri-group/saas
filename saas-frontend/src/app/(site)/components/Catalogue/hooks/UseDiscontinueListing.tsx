import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DiscontinueListingResponse {
  discontinue_listing: {
    code: string;
    success: boolean;
    message: string;
  };
}

interface DiscontinueListingVariables {
  id: string;
  vendorId: string;
}

export const useDiscontinueListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendorId }: DiscontinueListingVariables) => {
      const response = await gql<DiscontinueListingResponse>(`
        mutation DiscontinueListing($id: String!, $vendorId: String!) {
          discontinue_listing(id: $id, vendorId: $vendorId) {
            code
            success
            message
          }
        }
      `, { id, vendorId });

      return response.discontinue_listing;
    },
    onSuccess: (data, variables) => {
      // Invalidate catalogue queries to refresh the listing
      queryClient.invalidateQueries({ queryKey: ['catalogue-listings', variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
    },
  });
};

export default useDiscontinueListing;
