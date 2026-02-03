import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface ClaimReadingRequestInput {
  requestId: string;
  readerId: string;
}

interface ClaimReadingRequestResponse {
  success: boolean;
  message?: string;
  readingRequest?: {
    id: string;
    requestStatus: string;
    claimedBy: string;
    claimedAt: string;
  };
}

export const useClaimReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClaimReadingRequestInput) => {
      const response = await gql<{
        claimReadingRequest: ClaimReadingRequestResponse;
      }>(`
        mutation ClaimReadingRequest($input: ClaimReadingRequestInput!) {
          claimReadingRequest(input: $input) {
            success
            message
            readingRequest {
              id
              requestStatus
              claimedBy
              claimedAt
            }
          }
        }
      `, { input });
      return response.claimReadingRequest;
    },
    onSuccess: (_, variables) => {
      // Invalidate both available and claimed queries
      queryClient.invalidateQueries({ queryKey: ['available-reading-requests'] });
      queryClient.invalidateQueries({ queryKey: ['claimed-reading-requests', variables.readerId] });
    },
  });
};
