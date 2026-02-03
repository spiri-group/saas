import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface ReadingCardInput {
  name: string;
  reversed: boolean;
  position: string;
  interpretation: string;
}

interface FulfillReadingRequestInput {
  requestId: string;
  readerId: string;
  photoUrl: string;
  cards: ReadingCardInput[];
  overallMessage?: string;
}

interface FulfillReadingRequestResponse {
  success: boolean;
  message?: string;
  readingRequest?: {
    id: string;
    requestStatus: string;
    fulfilledAt: string;
  };
}

export const useFulfillReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FulfillReadingRequestInput) => {
      const response = await gql<{
        fulfillReadingRequest: FulfillReadingRequestResponse;
      }>(`
        mutation FulfillReadingRequest($input: FulfillReadingRequestInput!) {
          fulfillReadingRequest(input: $input) {
            success
            message
            readingRequest {
              id
              requestStatus
              fulfilledAt
            }
          }
        }
      `, { input });
      return response.fulfillReadingRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['claimed-reading-requests', variables.readerId] });
    },
  });
};
