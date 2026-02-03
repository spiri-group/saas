'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export interface SignExplanation {
  sign: string;
  reason: string;
}

export interface MessageHistoryItem {
  date: string;
  messageId?: string;
  summary: string;
}

export interface ImportantDate {
  date: string;
  occasion: string;
  reminderEnabled?: boolean;
}

export interface LovedOneInSpirit {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: SignExplanation[];
  messageHistory?: MessageHistoryItem[];
  importantDates?: ImportantDate[];
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

interface LovedOneFilters {
  relationship?: string;
  limit?: number;
  offset?: number;
}

export interface CreateLovedOneInput {
  userId: string;
  name: string;
  relationship: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: SignExplanation[];
  importantDates?: ImportantDate[];
  photoUrl?: string;
}

export interface UpdateLovedOneInput {
  id: string;
  userId: string;
  name?: string;
  relationship?: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: SignExplanation[];
  importantDates?: ImportantDate[];
  photoUrl?: string;
}

// ============================================
// GraphQL Fragments
// ============================================

const LOVED_ONE_FIELDS = `
  id
  userId
  name
  relationship
  nickname
  birthDate
  passingDate
  passingCircumstances
  personalMemory
  theirPersonality
  sharedInterests
  lessonsLearned
  commonSigns
  signExplanations {
    sign
    reason
  }
  messageHistory {
    date
    messageId
    summary
  }
  importantDates {
    date
    occasion
    reminderEnabled
  }
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

const useLovedOnes = (userId: string, filters?: LovedOneFilters) => {
  return useQuery({
    queryKey: ['loved-ones', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        lovedOnes: LovedOneInSpirit[];
      }>(`
        query GetLovedOnes($userId: ID!, $filters: LovedOneFilters) {
          lovedOnes(userId: $userId, filters: $filters) {
            ${LOVED_ONE_FIELDS}
          }
        }
      `, { userId, filters });
      return response.lovedOnes;
    },
    enabled: !!userId,
  });
};

export const useLovedOne = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['loved-one', id, userId],
    queryFn: async () => {
      const response = await gql<{
        lovedOne: LovedOneInSpirit | null;
      }>(`
        query GetLovedOne($id: ID!, $userId: ID!) {
          lovedOne(id: $id, userId: $userId) {
            ${LOVED_ONE_FIELDS}
          }
        }
      `, { id, userId });
      return response.lovedOne;
    },
    enabled: !!id && !!userId,
  });
};

export const useCreateLovedOne = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLovedOneInput) => {
      const response = await gql<{
        createLovedOne: {
          success: boolean;
          message?: string;
          lovedOne?: LovedOneInSpirit;
        };
      }>(`
        mutation CreateLovedOne($input: CreateLovedOneInput!) {
          createLovedOne(input: $input) {
            success
            message
            lovedOne {
              ${LOVED_ONE_FIELDS}
            }
          }
        }
      `, { input });
      return response.createLovedOne;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loved-ones', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export const useUpdateLovedOne = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLovedOneInput) => {
      const response = await gql<{
        updateLovedOne: {
          success: boolean;
          message?: string;
          lovedOne?: LovedOneInSpirit;
        };
      }>(`
        mutation UpdateLovedOne($input: UpdateLovedOneInput!) {
          updateLovedOne(input: $input) {
            success
            message
            lovedOne {
              ${LOVED_ONE_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateLovedOne;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loved-ones', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['loved-one', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
    },
  });
};

export const useDeleteLovedOne = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteLovedOne: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteLovedOne($id: ID!, $userId: ID!) {
          deleteLovedOne(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteLovedOne;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loved-ones', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export default useLovedOnes;
