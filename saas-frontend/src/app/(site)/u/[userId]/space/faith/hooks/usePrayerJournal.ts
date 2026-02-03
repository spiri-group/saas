'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type PrayerType =
  | 'praise'
  | 'thanksgiving'
  | 'petition'
  | 'intercession'
  | 'confession'
  | 'meditation'
  | 'contemplation'
  | 'devotional';

export type PrayerStatus =
  | 'active'
  | 'answered'
  | 'answered_differently'
  | 'waiting'
  | 'ongoing';

export interface PrayerJournalEntry {
  id: string;
  userId: string;
  date: string;
  title?: string;
  prayerType: PrayerType;
  content: string;
  status?: PrayerStatus;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  answeredDate?: string;
  answerDescription?: string;
  tags?: string[];
  isPrivate?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PrayerJournalFilters {
  startDate?: string;
  endDate?: string;
  prayerType?: PrayerType;
  status?: PrayerStatus;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePrayerInput {
  userId: string;
  date?: string;
  title?: string;
  prayerType: PrayerType;
  content: string;
  status?: PrayerStatus;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  tags?: string[];
  isPrivate?: boolean;
}

export interface UpdatePrayerInput {
  id: string;
  userId: string;
  title?: string;
  prayerType?: PrayerType;
  content?: string;
  status?: PrayerStatus;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  answeredDate?: string;
  answerDescription?: string;
  tags?: string[];
  isPrivate?: boolean;
}

const usePrayerJournalEntries = (userId: string, filters?: PrayerJournalFilters) => {
  return useQuery({
    queryKey: ['prayer-journal-entries', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        prayerJournalEntries: PrayerJournalEntry[];
      }>(`
        query GetPrayerJournalEntries($userId: ID!, $filters: PrayerJournalFiltersInput) {
          prayerJournalEntries(userId: $userId, filters: $filters) {
            id
            userId
            date
            title
            prayerType
            content
            status
            prayingFor
            requests
            gratitude
            scriptureReference
            scriptureText
            insights
            feelingBefore
            feelingAfter
            answeredDate
            answerDescription
            tags
            isPrivate
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.prayerJournalEntries;
    },
    enabled: !!userId,
  });
};

export const useCreatePrayerEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePrayerInput) => {
      const response = await gql<{
        createPrayerJournalEntry: {
          success: boolean;
          message?: string;
          prayer?: PrayerJournalEntry;
        };
      }>(`
        mutation CreatePrayerJournalEntry($input: CreatePrayerJournalInput!) {
          createPrayerJournalEntry(input: $input) {
            success
            message
            prayer {
              id
              userId
              date
              title
              prayerType
              content
              status
              prayingFor
              requests
              gratitude
              scriptureReference
              scriptureText
              insights
              feelingBefore
              feelingAfter
              tags
              isPrivate
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createPrayerJournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export const useUpdatePrayerEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePrayerInput) => {
      const response = await gql<{
        updatePrayerJournalEntry: {
          success: boolean;
          message?: string;
          prayer?: PrayerJournalEntry;
        };
      }>(`
        mutation UpdatePrayerJournalEntry($input: UpdatePrayerJournalInput!) {
          updatePrayerJournalEntry(input: $input) {
            success
            message
            prayer {
              id
              userId
              date
              title
              prayerType
              content
              status
              prayingFor
              requests
              gratitude
              scriptureReference
              scriptureText
              insights
              feelingBefore
              feelingAfter
              answeredDate
              answerDescription
              tags
              isPrivate
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.updatePrayerJournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export const useDeletePrayerEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deletePrayerJournalEntry: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeletePrayerJournalEntry($id: ID!, $userId: ID!) {
          deletePrayerJournalEntry(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deletePrayerJournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export const useMarkPrayerAnswered = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      userId,
      answeredDate,
      answerDescription,
    }: {
      id: string;
      userId: string;
      answeredDate?: string;
      answerDescription?: string;
    }) => {
      const response = await gql<{
        markPrayerAnswered: {
          success: boolean;
          message?: string;
          prayer?: PrayerJournalEntry;
        };
      }>(`
        mutation MarkPrayerAnswered($id: ID!, $userId: ID!, $answeredDate: String, $answerDescription: String) {
          markPrayerAnswered(id: $id, userId: $userId, answeredDate: $answeredDate, answerDescription: $answerDescription) {
            success
            message
            prayer {
              id
              status
              answeredDate
              answerDescription
            }
          }
        }
      `, { id, userId, answeredDate, answerDescription });
      return response.markPrayerAnswered;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-journal-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['faith-stats', variables.userId] });
    },
  });
};

export default usePrayerJournalEntries;
