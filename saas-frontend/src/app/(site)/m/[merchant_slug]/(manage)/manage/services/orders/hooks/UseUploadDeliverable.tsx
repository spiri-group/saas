import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface UploadDeliverableInput {
  vendorId: string;
  orderId: string;
  files: Array<{
    name: string;
    type: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
  message?: string;
}

export const useUploadDeliverable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadDeliverableInput) => {
      const response = await gql<{
        upload_service_deliverable: {
          id: string;
          orderStatus: string;
        };
      }>(`
        mutation UploadServiceDeliverable($vendorId: ID!, $input: UploadDeliverableInput!) {
          upload_service_deliverable(vendorId: $vendorId, input: $input) {
            id
            orderStatus
            deliverables {
              files {
                id
                name
                type
                url
                uploadedAt
              }
              message
            }
          }
        }
      `, { vendorId: data.vendorId, input: { orderId: data.orderId, files: data.files, message: data.message } });

      return response.upload_service_deliverable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order'] });
    }
  });
};
