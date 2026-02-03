import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { DreamJournalEntry, DreamFormInput } from '../types';

interface UpdateDreamInput extends Partial<DreamFormInput> {
  id: string;
  userId: string;
}

interface UpdateDreamResponse {
  success: boolean;
  message?: string;
  dream?: DreamJournalEntry;
}

export const useUpdateDream = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDreamInput) => {
      const response = await gql<{
        updateDream: UpdateDreamResponse;
      }>(`
        mutation UpdateDream($input: UpdateDreamInput!) {
          updateDream(input: $input) {
            success
            message
            dream {
              id
              userId
              date
              title
              content
              dreamType
              mood
              clarity
              isLucid
              themes
              symbols {
                symbolId
                name
                category
                context
                autoExtracted
              }
              interpretation
              emotions
              sleepQuality
              wakeTime
              photoUrl
              ref {
                id
                partition
                container
              }
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.updateDream;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dreams', variables.userId] });
    },
  });
};
