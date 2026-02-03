'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export type ExerciseType =
  | 'meditation'
  | 'visualization'
  | 'psychometry'
  | 'remote_viewing'
  | 'aura_reading'
  | 'symbol_work'
  | 'automatic_writing'
  | 'pendulum'
  | 'card_practice'
  | 'sitting_in_power'
  | 'other';

export type ExerciseDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export interface DevelopmentExercise {
  id: string;
  userId: string;
  date: string;
  exerciseType: ExerciseType;
  exerciseName: string;
  source?: string;
  difficulty?: ExerciseDifficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

interface DevelopmentExerciseFilters {
  startDate?: string;
  endDate?: string;
  exerciseType?: ExerciseType;
  difficulty?: ExerciseDifficulty;
  limit?: number;
  offset?: number;
}

export interface CreateDevelopmentExerciseInput {
  userId: string;
  date?: string;
  exerciseType: ExerciseType;
  exerciseName: string;
  source?: string;
  difficulty?: ExerciseDifficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
}

export interface UpdateDevelopmentExerciseInput {
  id: string;
  userId: string;
  exerciseType?: ExerciseType;
  exerciseName?: string;
  source?: string;
  difficulty?: ExerciseDifficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
}

// ============================================
// GraphQL Fragments
// ============================================

const DEVELOPMENT_EXERCISE_FIELDS = `
  id
  userId
  date
  exerciseType
  exerciseName
  source
  difficulty
  duration
  environment
  preparation
  results
  accuracy
  hits
  misses
  insights
  challengesFaced
  improvements
  confidenceLevel
  willRepeat
  nextSteps
  notes
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

const useDevelopmentExercises = (userId: string, filters?: DevelopmentExerciseFilters) => {
  return useQuery({
    queryKey: ['development-exercises', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        developmentExercises: DevelopmentExercise[];
      }>(`
        query GetDevelopmentExercises($userId: ID!, $filters: DevelopmentExerciseFilters) {
          developmentExercises(userId: $userId, filters: $filters) {
            ${DEVELOPMENT_EXERCISE_FIELDS}
          }
        }
      `, { userId, filters });
      return response.developmentExercises;
    },
    enabled: !!userId,
  });
};

export const useRecentDevelopmentExercises = (userId: string, limit?: number) => {
  return useQuery({
    queryKey: ['development-exercises-recent', userId, limit],
    queryFn: async () => {
      const response = await gql<{
        recentDevelopmentExercises: DevelopmentExercise[];
      }>(`
        query GetRecentDevelopmentExercises($userId: ID!, $limit: Int) {
          recentDevelopmentExercises(userId: $userId, limit: $limit) {
            ${DEVELOPMENT_EXERCISE_FIELDS}
          }
        }
      `, { userId, limit });
      return response.recentDevelopmentExercises;
    },
    enabled: !!userId,
  });
};

export const useDevelopmentExercise = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['development-exercise', id, userId],
    queryFn: async () => {
      const response = await gql<{
        developmentExercise: DevelopmentExercise | null;
      }>(`
        query GetDevelopmentExercise($id: ID!, $userId: ID!) {
          developmentExercise(id: $id, userId: $userId) {
            ${DEVELOPMENT_EXERCISE_FIELDS}
          }
        }
      `, { id, userId });
      return response.developmentExercise;
    },
    enabled: !!id && !!userId,
  });
};

export const useCreateDevelopmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDevelopmentExerciseInput) => {
      const response = await gql<{
        createDevelopmentExercise: {
          success: boolean;
          message?: string;
          exercise?: DevelopmentExercise;
        };
      }>(`
        mutation CreateDevelopmentExercise($input: CreateDevelopmentExerciseInput!) {
          createDevelopmentExercise(input: $input) {
            success
            message
            exercise {
              ${DEVELOPMENT_EXERCISE_FIELDS}
            }
          }
        }
      `, { input });
      return response.createDevelopmentExercise;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['development-exercises', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['development-exercises-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export const useUpdateDevelopmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDevelopmentExerciseInput) => {
      const response = await gql<{
        updateDevelopmentExercise: {
          success: boolean;
          message?: string;
          exercise?: DevelopmentExercise;
        };
      }>(`
        mutation UpdateDevelopmentExercise($input: UpdateDevelopmentExerciseInput!) {
          updateDevelopmentExercise(input: $input) {
            success
            message
            exercise {
              ${DEVELOPMENT_EXERCISE_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateDevelopmentExercise;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['development-exercises', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['development-exercises-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['development-exercise', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
    },
  });
};

export const useDeleteDevelopmentExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteDevelopmentExercise: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteDevelopmentExercise($id: ID!, $userId: ID!) {
          deleteDevelopmentExercise(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteDevelopmentExercise;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['development-exercises', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['development-exercises-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export default useDevelopmentExercises;
