import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ReadingRequestResponse } from '../types';

export const useCancelReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      const response = await gql<{
        cancelReadingRequest: ReadingRequestResponse;
      }>(`
        mutation CancelReadingRequest($requestId: ID!, $userId: ID!) {
          cancelReadingRequest(requestId: $requestId, userId: $userId) {
            success
            message
            readingRequest {
              id
              requestStatus
              updatedAt
            }
          }
        }
      `, { requestId, userId });
      return response.cancelReadingRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-reading-requests', variables.userId] });
    },
  });
};
