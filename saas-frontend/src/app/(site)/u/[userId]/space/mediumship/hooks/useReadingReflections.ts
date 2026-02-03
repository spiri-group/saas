'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export interface ReadingReflection {
  id: string;
  userId: string;
  date: string;
  readerName: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  validatedLater?: string;
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

interface ReadingReflectionFilters {
  startDate?: string;
  endDate?: string;
  readingType?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

export interface CreateReadingReflectionInput {
  userId: string;
  date?: string;
  readerName: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
}

export interface UpdateReadingReflectionInput {
  id: string;
  userId: string;
  readerName?: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  validatedLater?: string;
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
}

// ============================================
// GraphQL Fragments
// ============================================

const READING_REFLECTION_FIELDS = `
  id
  userId
  date
  readerName
  readingType
  format
  duration
  bookingId
  readerId
  mainMessages
  evidentialInfo
  predictions
  guidance
  accuracyScore
  resonatedWith
  didntResonate
  validatedLater
  emotionalImpact
  actionsTaken
  overallRating
  notes
  photoUrl
  createdAt
  updatedAt
  ref {
    id
    partition
    container
  }
`;

// ============================================
// Hooks
// ============================================

const useReadingReflections = (userId: string, filters?: ReadingReflectionFilters) => {
  return useQuery({
    queryKey: ['reading-reflections', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        readingReflections: ReadingReflection[];
      }>(`
        query GetReadingReflections($userId: ID!, $filters: ReadingReflectionFilters) {
          readingReflections(userId: $userId, filters: $filters) {
            ${READING_REFLECTION_FIELDS}
          }
        }
      `, { userId, filters });
      return response.readingReflections;
    },
    enabled: !!userId,
  });
};

export const useRecentReadingReflections = (userId: string, limit?: number) => {
  return useQuery({
    queryKey: ['reading-reflections-recent', userId, limit],
    queryFn: async () => {
      const response = await gql<{
        recentReadingReflections: ReadingReflection[];
      }>(`
        query GetRecentReadingReflections($userId: ID!, $limit: Int) {
          recentReadingReflections(userId: $userId, limit: $limit) {
            ${READING_REFLECTION_FIELDS}
          }
        }
      `, { userId, limit });
      return response.recentReadingReflections;
    },
    enabled: !!userId,
  });
};

export const useReadingReflection = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['reading-reflection', id, userId],
    queryFn: async () => {
      const response = await gql<{
        readingReflection: ReadingReflection | null;
      }>(`
        query GetReadingReflection($id: ID!, $userId: ID!) {
          readingReflection(id: $id, userId: $userId) {
            ${READING_REFLECTION_FIELDS}
          }
        }
      `, { id, userId });
      return response.readingReflection;
    },
    enabled: !!id && !!userId,
  });
};

export const useCreateReadingReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReadingReflectionInput) => {
      const response = await gql<{
        createReadingReflection: {
          success: boolean;
          message?: string;
          reflection?: ReadingReflection;
        };
      }>(`
        mutation CreateReadingReflection($input: CreateReadingReflectionInput!) {
          createReadingReflection(input: $input) {
            success
            message
            reflection {
              ${READING_REFLECTION_FIELDS}
            }
          }
        }
      `, { input });
      return response.createReadingReflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-reflections', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['reading-reflections-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export const useUpdateReadingReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateReadingReflectionInput) => {
      const response = await gql<{
        updateReadingReflection: {
          success: boolean;
          message?: string;
          reflection?: ReadingReflection;
        };
      }>(`
        mutation UpdateReadingReflection($input: UpdateReadingReflectionInput!) {
          updateReadingReflection(input: $input) {
            success
            message
            reflection {
              ${READING_REFLECTION_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateReadingReflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-reflections', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['reading-reflections-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['reading-reflection', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
    },
  });
};

export const useDeleteReadingReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteReadingReflection: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteReadingReflection($id: ID!, $userId: ID!) {
          deleteReadingReflection(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteReadingReflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-reflections', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['reading-reflections-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export default useReadingReflections;
