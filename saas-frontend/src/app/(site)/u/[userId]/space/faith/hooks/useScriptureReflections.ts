'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type ScriptureBookType =
  | 'old_testament'
  | 'new_testament'
  | 'psalms'
  | 'proverbs'
  | 'gospels'
  | 'epistles'
  | 'prophets'
  | 'wisdom'
  | 'other';

export interface ScriptureReflection {
  id: string;
  userId: string;
  date: string;
  reference: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: ScriptureBookType;
  text?: string;
  whatSpokeToMe: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScriptureReflectionFilters {
  startDate?: string;
  endDate?: string;
  book?: string;
  bookType?: ScriptureBookType;
  limit?: number;
  offset?: number;
}

export interface CreateScriptureReflectionInput {
  userId: string;
  date?: string;
  reference: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: ScriptureBookType;
  text?: string;
  whatSpokeToMe: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

export interface UpdateScriptureReflectionInput {
  id: string;
  userId: string;
  reference?: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: ScriptureBookType;
  text?: string;
  whatSpokeToMe?: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

const useScriptureReflections = (userId: string, filters?: ScriptureReflectionFilters) => {
  return useQuery({
    queryKey: ['scripture-reflections', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        scriptureReflections: ScriptureReflection[];
      }>(`
        query GetScriptureReflections($userId: ID!, $filters: ScriptureReflectionFiltersInput) {
          scriptureReflections(userId: $userId, filters: $filters) {
            id
            userId
            date
            reference
            book
            chapter
            verseStart
            verseEnd
            bookType
            text
            whatSpokeToMe
            personalApplication
            questions
            crossReferences
            readingContext
            version
            prayerResponse
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.scriptureReflections;
    },
    enabled: !!userId,
  });
};

export const useCreateScriptureReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScriptureReflectionInput) => {
      const response = await gql<{
        createScriptureReflection: {
          success: boolean;
          message?: string;
          reflection?: ScriptureReflection;
        };
      }>(`
        mutation CreateScriptureReflection($input: CreateScriptureReflectionInput!) {
          createScriptureReflection(input: $input) {
            success
            message
            reflection {
              id
              userId
              date
              reference
              book
              chapter
              verseStart
              verseEnd
              bookType
              text
              whatSpokeToMe
              personalApplication
              questions
              crossReferences
              readingContext
              version
              prayerResponse
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createScriptureReflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scripture-reflections', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export const useUpdateScriptureReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateScriptureReflectionInput) => {
      const response = await gql<{
        updateScriptureReflection: {
          success: boolean;
          message?: string;
          reflection?: ScriptureReflection;
        };
      }>(`
        mutation UpdateScriptureReflection($input: UpdateScriptureReflectionInput!) {
          updateScriptureReflection(input: $input) {
            success
            message
            reflection {
              id
              userId
              date
              reference
              book
              chapter
              verseStart
              verseEnd
              bookType
              text
              whatSpokeToMe
              personalApplication
              questions
              crossReferences
              readingContext
              version
              prayerResponse
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.updateScriptureReflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scripture-reflections', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export const useDeleteScriptureReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteScriptureReflection: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteScriptureReflection($id: ID!, $userId: ID!) {
          deleteScriptureReflection(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteScriptureReflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scripture-reflections', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export default useScriptureReflections;
