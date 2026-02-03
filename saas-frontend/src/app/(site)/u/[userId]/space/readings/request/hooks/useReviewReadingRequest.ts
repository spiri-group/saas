import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ReadingReview } from '../types';

interface ReviewReadingRequestInput {
  requestId: string;
  userId: string;
  rating: number;
  headline: string;
  text: string;
}

interface ReviewReadingRequestResponse {
  success: boolean;
  message?: string;
  review?: ReadingReview;
}

export const useReviewReadingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReviewReadingRequestInput) => {
      const response = await gql<{
        reviewReadingRequest: ReviewReadingRequestResponse;
      }>(`
        mutation ReviewReadingRequest($input: ReviewReadingRequestInput!) {
          reviewReadingRequest(input: $input) {
            success
            message
            review {
              id
              rating
              headline
              text
              createdAt
              userId
              userName
            }
          }
        }
      `, { input });
      return response.reviewReadingRequest;
    },
    onSuccess: (data, variables) => {
      if (data.success && data.review) {
        // Invalidate the reading requests query to refetch with the new review
        queryClient.invalidateQueries({
          queryKey: ['my-reading-requests', variables.userId],
        });
      }
    },
  });
};
