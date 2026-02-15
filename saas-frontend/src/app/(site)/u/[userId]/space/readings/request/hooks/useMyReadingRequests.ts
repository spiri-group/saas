import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ReadingRequest, ReadingRequestStatus } from '../types';

export const useMyReadingRequests = (userId: string, status?: ReadingRequestStatus) => {
  return useQuery({
    queryKey: ['my-reading-requests', userId, status],
    queryFn: async () => {
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
    },
    enabled: !!userId,
  });
};
