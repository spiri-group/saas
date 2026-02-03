import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface ReadingRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  spreadType: 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD';
  topic: string;
  context?: string;
  price: number;
  platformFee: number;
  readerPayout: number;
  requestStatus: string;
  createdAt: string;
  expiresAt?: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

export const useAvailableReadingRequests = (limit: number = 20, offset: number = 0) => {
  return useQuery({
    queryKey: ['available-reading-requests', limit, offset],
    queryFn: async () => {
      const response = await gql<{
        availableReadingRequests: ReadingRequest[];
      }>(`
        query GetAvailableReadingRequests($limit: Int, $offset: Int) {
          availableReadingRequests(limit: $limit, offset: $offset) {
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
            createdAt
            expiresAt
            ref {
              id
              partition
              container
            }
          }
        }
      `, { limit, offset });
      return response.availableReadingRequests;
    },
    refetchInterval: 30000, // Refetch every 30 seconds to stay current with new requests
  });
};
