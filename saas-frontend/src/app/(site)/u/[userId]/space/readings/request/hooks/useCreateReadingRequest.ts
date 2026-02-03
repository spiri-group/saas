import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { CreateReadingRequestInput, ReadingRequestResponse } from '../types';

export const useCreateReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReadingRequestInput) => {
      const response = await gql<{
        createReadingRequest: ReadingRequestResponse;
      }>(`
        mutation CreateReadingRequest($input: CreateReadingRequestInput!) {
          createReadingRequest(input: $input) {
            success
            message
            readingRequest {
              id
              userId
              spreadType
              topic
              context
              price
              platformFee
              readerPayout
              requestStatus
              stripe {
                setupIntentId
                setupIntentSecret
              }
              createdAt
              updatedAt
              ref {
                id
                partition
                container
              }
            }
          }
        }
      `, { input });
      return response.createReadingRequest;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-reading-requests', variables.userId] });
    },
  });
};
