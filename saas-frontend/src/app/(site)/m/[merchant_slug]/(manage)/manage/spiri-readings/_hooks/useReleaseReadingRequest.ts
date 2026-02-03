import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface ReleaseReadingRequestResponse {
  success: boolean;
  message?: string;
  readingRequest?: {
    id: string;
    requestStatus: string;
  };
}

export const useReleaseReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, readerId }: { requestId: string; readerId: string }) => {
      const response = await gql<{
        releaseReadingRequest: ReleaseReadingRequestResponse;
      }>(`
        mutation ReleaseReadingRequest($requestId: ID!, $readerId: ID!) {
          releaseReadingRequest(requestId: $requestId, readerId: $readerId) {
            success
            message
            readingRequest {
              id
              requestStatus
            }
          }
        }
      `, { requestId, readerId });
      return response.releaseReadingRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['available-reading-requests'] });
      queryClient.invalidateQueries({ queryKey: ['claimed-reading-requests', variables.readerId] });
    },
  });
};
