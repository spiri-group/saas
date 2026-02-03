import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { DreamJournalEntry } from '../types';

export const useDreams = (userId: string) => {
  return useQuery({
    queryKey: ['dreams', userId],
    queryFn: async () => {
      const response = await gql<{
        dreams: DreamJournalEntry[];
      }>(`
        query GetDreams($userId: ID!) {
          dreams(userId: $userId) {
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
      `, { userId });
      return response.dreams;
    },
    enabled: !!userId,
  });
};

export type { DreamJournalEntry };
