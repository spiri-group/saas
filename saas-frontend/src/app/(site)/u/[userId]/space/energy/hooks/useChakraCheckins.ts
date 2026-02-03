'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type ChakraType =
  | 'root'
  | 'sacral'
  | 'solar_plexus'
  | 'heart'
  | 'throat'
  | 'third_eye'
  | 'crown'
  | 'earth_star'
  | 'soul_star';

export type ChakraStatus =
  | 'open'
  | 'balanced'
  | 'overactive'
  | 'blocked'
  | 'weak'
  | 'unclear';

export interface ChakraState {
  chakra: ChakraType;
  status: ChakraStatus;
  notes?: string;
}

export interface ChakraCheckin {
  id: string;
  userId: string;
  date: string;
  checkInTime?: string;
  chakras: ChakraState[];
  overallBalance?: number;
  dominantChakra?: ChakraType;
  weakestChakra?: ChakraType;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChakraCheckinFilters {
  startDate?: string;
  endDate?: string;
  chakra?: ChakraType;
  status?: ChakraStatus;
  limit?: number;
  offset?: number;
}

const useChakraCheckins = (userId: string, filters?: ChakraCheckinFilters) => {
  return useQuery({
    queryKey: ['chakra-checkins', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        chakraCheckins: ChakraCheckin[];
      }>(`
        query GetChakraCheckins($userId: ID!, $filters: ChakraCheckinFiltersInput) {
          chakraCheckins(userId: $userId, filters: $filters) {
            id
            userId
            date
            checkInTime
            chakras {
              chakra
              status
              notes
            }
            overallBalance
            dominantChakra
            weakestChakra
            physicalState
            emotionalState
            mentalState
            observations
            actionTaken
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.chakraCheckins;
    },
    enabled: !!userId,
  });
};

export default useChakraCheckins;
