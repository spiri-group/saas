'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface DailyPassage {
  id: string;
  userId: string;
  date: string;
  reference: string;
  text: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  version?: string;
  reflection?: string;
  prayerResponse?: string;
  personalApplication?: string;
  isRead: boolean;
  readAt?: string;
  isReflected: boolean;
  reflectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyPassageFilters {
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
  isReflected?: boolean;
  limit?: number;
  offset?: number;
}

export interface ReflectOnPassageInput {
  id: string;
  userId: string;
  reflection?: string;
  prayerResponse?: string;
  personalApplication?: string;
}

export const useTodaysPassage = (userId: string) => {
  return useQuery({
    queryKey: ['todays-passage', userId],
    queryFn: async () => {
      const response = await gql<{
        todaysPassage: DailyPassage | null;
      }>(`
        query GetTodaysPassage($userId: ID!) {
          todaysPassage(userId: $userId) {
            id
            userId
            date
            reference
            text
            book
            chapter
            verseStart
            verseEnd
            version
            reflection
            prayerResponse
            personalApplication
            isRead
            readAt
            isReflected
            reflectedAt
            createdAt
            updatedAt
          }
        }
      `, { userId });
      return response.todaysPassage;
    },
    enabled: !!userId,
  });
};

const useDailyPassages = (userId: string, filters?: DailyPassageFilters) => {
  return useQuery({
    queryKey: ['daily-passages', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        dailyPassages: DailyPassage[];
      }>(`
        query GetDailyPassages($userId: ID!, $filters: DailyPassageFiltersInput) {
          dailyPassages(userId: $userId, filters: $filters) {
            id
            userId
            date
            reference
            text
            book
            chapter
            verseStart
            verseEnd
            version
            reflection
            prayerResponse
            personalApplication
            isRead
            readAt
            isReflected
            reflectedAt
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.dailyPassages;
    },
    enabled: !!userId,
  });
};

export const useMarkPassageRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        markPassageRead: {
          success: boolean;
          message?: string;
          passage?: DailyPassage;
        };
      }>(`
        mutation MarkPassageRead($id: ID!, $userId: ID!) {
          markPassageRead(id: $id, userId: $userId) {
            success
            message
            passage {
              id
              isRead
              readAt
            }
          }
        }
      `, { id, userId });
      return response.markPassageRead;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['todays-passage', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['daily-passages', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export const useReflectOnPassage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReflectOnPassageInput) => {
      const response = await gql<{
        reflectOnPassage: {
          success: boolean;
          message?: string;
          passage?: DailyPassage;
        };
      }>(`
        mutation ReflectOnPassage($input: ReflectOnPassageInput!) {
          reflectOnPassage(input: $input) {
            success
            message
            passage {
              id
              userId
              date
              reference
              text
              book
              chapter
              verseStart
              verseEnd
              version
              reflection
              prayerResponse
              personalApplication
              isRead
              readAt
              isReflected
              reflectedAt
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.reflectOnPassage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['todays-passage', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['daily-passages', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export default useDailyPassages;
