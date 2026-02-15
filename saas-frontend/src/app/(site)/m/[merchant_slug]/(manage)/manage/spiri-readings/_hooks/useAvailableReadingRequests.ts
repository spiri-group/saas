import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';
import { gql } from '@/lib/services/gql';

export interface ReadingRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  readingCategory: 'TAROT' | 'ASTROLOGY';
  spreadType: 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD' | 'ASTRO_SNAPSHOT' | 'ASTRO_FOCUS' | 'ASTRO_DEEP_DIVE';
  topic: string;
  context?: string;
  astrologyData?: {
    focusArea: string;
    birthData: {
      birthDate: string;
      birthTime?: string;
      birthTimePrecision: string;
      birthTimeApproximate?: string;
      birthLocation: {
        city: string;
        country: string;
      };
    };
    partnerBirthData?: {
      birthDate: string;
      birthTime?: string;
      birthTimePrecision: string;
      birthTimeApproximate?: string;
      birthLocation: {
        city: string;
        country: string;
      };
    };
    specificPlanet?: string;
    specificLifeArea?: string;
  };
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

const fetchAvailableReadingRequests = async (limit: number, offset: number): Promise<ReadingRequest[]> => {
  const response = await gql<{
    availableReadingRequests: ReadingRequest[];
  }>(`
    query GetAvailableReadingRequests($limit: Int, $offset: Int) {
      availableReadingRequests(limit: $limit, offset: $offset) {
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
};

export const useAvailableReadingRequests = (limit: number = 20, offset: number = 0) => {
  return useRealTimeQueryList<ReadingRequest>({
    queryKey: ['available-reading-requests', limit, offset],
    queryFn: () => fetchAvailableReadingRequests(limit, offset),
    realtimeEvent: 'reading-request-bank',
    selectId: (record) => record.id,
    signalRGroup: 'reading-request-bank',
    refetchInterval: 30000, // Also poll every 30s for new requests
  });
};
