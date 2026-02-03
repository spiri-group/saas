import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export const useDeleteVendorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await gql<{
        deleteVendorEvent: {
          code: string;
          success: boolean;
          message: string;
        };
      }>(`
        mutation DeleteVendorEvent($id: ID!) {
          deleteVendorEvent(id: $id) {
            code
            success
            message
          }
        }
      `, { id: eventId });
      return response.deleteVendorEvent;
    },
    onSuccess: () => {
      // Invalidate all vendor events queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['vendor-events'] });
      // Also invalidate catalogue events to show immediately on merchant page
      queryClient.invalidateQueries({ queryKey: ['catalogue-events'] });
    },
    onError: (error) => {
      console.error('Failed to delete vendor event:', error);
    }
  });
};