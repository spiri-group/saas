'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ChakraCheckin, ChakraType, ChakraStatus } from './useChakraCheckins';

interface ChakraStateInput {
  chakra: ChakraType;
  status: ChakraStatus;
  notes?: string;
}

interface CreateChakraCheckinInput {
  userId: string;
  date?: string;
  checkInTime?: string;
  chakras: ChakraStateInput[];
  overallBalance?: number;
  dominantChakra?: ChakraType;
  weakestChakra?: ChakraType;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
}

interface CreateChakraCheckinResponse {
  success: boolean;
  message?: string;
  checkin?: ChakraCheckin;
}

const useCreateChakraCheckin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChakraCheckinInput) => {
      const response = await gql<{
        createChakraCheckin: CreateChakraCheckinResponse;
      }>(`
        mutation CreateChakraCheckin($input: CreateChakraCheckinInput!) {
          createChakraCheckin(input: $input) {
            success
            message
            checkin {
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
        }
      `, { input });
      return response.createChakraCheckin;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['chakra-checkins', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['energy-stats', variables.userId] });
      }
    },
  });
};

export default useCreateChakraCheckin;
