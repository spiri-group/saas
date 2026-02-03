'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { SessionReflection } from './useSessionReflections';
import { EnergyModality } from './useEnergyJournalEntries';

interface CreateSessionReflectionInput {
  userId: string;
  date?: string;
  practitionerName: string;
  modality?: EnergyModality;
  sessionType?: string;
  duration?: number;
  bookingId?: string;
  practitionerId?: string;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  sensations?: string[];
  areasWorkedOn?: string[];
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  wouldRecommend?: boolean;
  overallRating?: number;
  shiftsNoticed?: string;
  followUpDate?: string;
  photoUrl?: string;
}

interface CreateSessionReflectionResponse {
  success: boolean;
  message?: string;
  reflection?: SessionReflection;
}

const useCreateSessionReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionReflectionInput) => {
      const response = await gql<{
        createSessionReflection: CreateSessionReflectionResponse;
      }>(`
        mutation CreateSessionReflection($input: CreateSessionReflectionInput!) {
          createSessionReflection(input: $input) {
            success
            message
            reflection {
              id
              userId
              date
              practitionerName
              modality
              sessionType
              duration
              bookingId
              practitionerId
              preSessionState
              duringSession
              postSessionState
              sensations
              areasWorkedOn
              messagesReceived
              aftercare
              personalNotes
              wouldRecommend
              overallRating
              shiftsNoticed
              followUpDate
              photoUrl
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createSessionReflection;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['session-reflections', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['energy-stats', variables.userId] });
      }
    },
  });
};

export default useCreateSessionReflection;
