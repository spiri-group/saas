import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';
import { gql } from '@/lib/services/gql';
import { ReadingRequest, ReadingRequestStatus } from '../types';

const fetchMyReadingRequests = async (userId: string, status?: ReadingRequestStatus): Promise<ReadingRequest[]> => {
  const response = await gql<{
    myReadingRequests: ReadingRequest[];
  }>(`
    query GetMyReadingRequests($userId: ID!, $status: ReadingRequestStatus) {
      myReadingRequests(userId: $userId, status: $status) {
        id
        userId
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
        photoUrl
        cards {
          name
          reversed
          position
          interpretation
          symbols
        }
        overallMessage
        astrologyFulfillment {
          interpretation
          highlightedAspects {
            planet1
            planet2
            aspect
            interpretation
          }
          chartImageUrl
          practitionerRecommendation
        }
        fulfilledAt
        createdAt
        updatedAt
        expiresAt
        review {
          id
          rating
          headline
          text
          createdAt
          userId
          userName
        }
        ref {
          id
          partition
          container
        }
      }
    }
  `, { userId, status });
  return response.myReadingRequests;
};

export const useMyReadingRequests = (userId: string, status?: ReadingRequestStatus) => {
  return useRealTimeQueryList<ReadingRequest>({
    queryKey: ['my-reading-requests', userId, status],
    queryFn: () => fetchMyReadingRequests(userId, status),
    realtimeEvent: 'my-reading-requests',
    selectId: (record) => record.id,
    signalRGroup: undefined, // Uses userId-based routing (not group-based)
    enabled: !!userId,
  });
};
