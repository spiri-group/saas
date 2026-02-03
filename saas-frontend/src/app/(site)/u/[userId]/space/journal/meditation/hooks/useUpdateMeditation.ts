'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { MeditationJournalEntry } from './useMeditations';

interface UpdateMeditationInput {
  id: string;
  userId: string;
  duration?: number;
  technique?: string;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: string;
  postSessionMood?: string;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
  photoUrl?: string;
}

interface UpdateMeditationResponse {
  success: boolean;
  message?: string;
  meditation?: MeditationJournalEntry;
}

const useUpdateMeditation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMeditationInput) => {
      const response = await gql<{
        updateMeditation: UpdateMeditationResponse;
      }>(`
        mutation UpdateMeditation($input: UpdateMeditationInput!) {
          updateMeditation(input: $input) {
            success
            message
            meditation {
              id
              userId
              date
              duration
              technique
              guidedBy
              focus
              preSessionMood
              postSessionMood
              depth
              distractionLevel
              insights
              experiences
              intentions
              gratitude
              location
              posture
              photoUrl
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.updateMeditation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meditations', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['meditation-stats', variables.userId] });
    },
  });
};

export default useUpdateMeditation;
