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
            readingCategory
            spreadType
            topic
            context
            astrologyData {
              focusArea
              birthData {
                birthDate
                birthTime
                birthTimePrecision
                birthTimeApproximate
                birthLocation {
                  city
                  country
                }
              }
              partnerBirthData {
                birthDate
                birthTime
                birthTimePrecision
                birthTimeApproximate
                birthLocation {
                  city
                  country
                }
              }
              specificPlanet
              specificLifeArea
            }
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
