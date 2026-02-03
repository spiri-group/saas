import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface MarkDeliveredInput {
  vendorId: string;
  orderId: string;
}

export const useMarkDelivered = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MarkDeliveredInput) => {
      const response = await gql<{
        mark_service_delivered: {
          id: string;
          orderStatus: string;
        };
      }>(`
        mutation MarkServiceDelivered($vendorId: ID!, $orderId: ID!) {
          mark_service_delivered(vendorId: $vendorId, orderId: $orderId) {
            id
            orderStatus
            deliverables {
              deliveredAt
            }
          }
        }
      `, { vendorId: data.vendorId, orderId: data.orderId });

      return response.mark_service_delivered;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order'] });
    }
  });
};
