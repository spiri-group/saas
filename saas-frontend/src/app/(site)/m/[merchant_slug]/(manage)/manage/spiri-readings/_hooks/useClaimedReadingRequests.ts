import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ReadingRequest } from './useAvailableReadingRequests';

export interface ClaimedReadingRequest extends ReadingRequest {
  claimedBy: string;
  claimedAt: string;
  claimDeadline?: string; // Shotclock - reader must fulfill by this time
}

export const useClaimedReadingRequests = (readerId: string) => {
  return useQuery({
    queryKey: ['claimed-reading-requests', readerId],
    queryFn: async () => {
      const response = await gql<{
        claimedReadingRequests: ClaimedReadingRequest[];
      }>(`
        query GetClaimedReadingRequests($readerId: ID!) {
          claimedReadingRequests(readerId: $readerId) {
            id
            userId
            userEmail
            userName
            spreadType
            topic
            context
            price
            platformFee
            readerPayout
            requestStatus
            claimedBy
            claimedAt
            claimDeadline
            createdAt
            expiresAt
            ref {
              id
              partition
              container
            }
          }
        }
      `, { readerId });
      return response.claimedReadingRequests;
    },
    enabled: !!readerId,
  });
};
