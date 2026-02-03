import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { DreamJournalEntry, DreamFormInput } from '../types';

interface CreateDreamInput extends DreamFormInput {
  userId: string;
}

interface CreateDreamResponse {
  success: boolean;
  message?: string;
  dream?: DreamJournalEntry;
}

export const useCreateDream = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDreamInput) => {
      const response = await gql<{
        createDream: CreateDreamResponse;
      }>(`
        mutation CreateDream($input: CreateDreamInput!) {
          createDream(input: $input) {
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
      return response.createDream;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dreams', variables.userId] });
    },
  });
};
