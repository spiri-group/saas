'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export type SpiritSource =
  | 'guide'
  | 'loved_one'
  | 'angel'
  | 'ancestor'
  | 'higher_self'
  | 'unknown'
  | 'collective'
  | 'nature_spirit'
  | 'other';

export type ReceptionMethod =
  | 'clairvoyance'
  | 'clairaudience'
  | 'clairsentience'
  | 'claircognizance'
  | 'dreams'
  | 'meditation'
  | 'automatic_writing'
  | 'pendulum'
  | 'cards'
  | 'signs'
  | 'other';

export interface SpiritMessage {
  id: string;
  userId: string;
  date: string;
  messageContent: string;
  source: SpiritSource;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod: ReceptionMethod;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  validated?: boolean;
  validationNotes?: string;
  interpretation?: string;
  actionTaken?: string;
  outcome?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

interface SpiritMessageFilters {
  startDate?: string;
  endDate?: string;
  source?: SpiritSource;
  receptionMethod?: ReceptionMethod;
  validated?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateSpiritMessageInput {
  userId: string;
  date?: string;
  messageContent: string;
  source: SpiritSource;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod: ReceptionMethod;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  interpretation?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
}

export interface UpdateSpiritMessageInput {
  id: string;
  userId: string;
  messageContent?: string;
  source?: SpiritSource;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod?: ReceptionMethod;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  validated?: boolean;
  validationNotes?: string;
  interpretation?: string;
  actionTaken?: string;
  outcome?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
}

// ============================================
// GraphQL Fragments
// ============================================

const SPIRIT_MESSAGE_FIELDS = `
  id
  userId
  date
  messageContent
  source
  sourceName
  sourceDescription
  receptionMethod
  receptionContext
  clarity
  evidentialDetails
  validated
  validationNotes
  interpretation
  actionTaken
  outcome
  emotionsDuring
  emotionsAfter
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

const useSpiritMessages = (userId: string, filters?: SpiritMessageFilters) => {
  return useQuery({
    queryKey: ['spirit-messages', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        spiritMessages: SpiritMessage[];
      }>(`
        query GetSpiritMessages($userId: ID!, $filters: SpiritMessageFilters) {
          spiritMessages(userId: $userId, filters: $filters) {
            ${SPIRIT_MESSAGE_FIELDS}
          }
        }
      `, { userId, filters });
      return response.spiritMessages;
    },
    enabled: !!userId,
  });
};

export const useRecentSpiritMessages = (userId: string, limit?: number) => {
  return useQuery({
    queryKey: ['spirit-messages-recent', userId, limit],
    queryFn: async () => {
      const response = await gql<{
        recentSpiritMessages: SpiritMessage[];
      }>(`
        query GetRecentSpiritMessages($userId: ID!, $limit: Int) {
          recentSpiritMessages(userId: $userId, limit: $limit) {
            ${SPIRIT_MESSAGE_FIELDS}
          }
        }
      `, { userId, limit });
      return response.recentSpiritMessages;
    },
    enabled: !!userId,
  });
};

export const useSpiritMessage = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['spirit-message', id, userId],
    queryFn: async () => {
      const response = await gql<{
        spiritMessage: SpiritMessage | null;
      }>(`
        query GetSpiritMessage($id: ID!, $userId: ID!) {
          spiritMessage(id: $id, userId: $userId) {
            ${SPIRIT_MESSAGE_FIELDS}
          }
        }
      `, { id, userId });
      return response.spiritMessage;
    },
    enabled: !!id && !!userId,
  });
};

export const useCreateSpiritMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSpiritMessageInput) => {
      const response = await gql<{
        createSpiritMessage: {
          success: boolean;
          message?: string;
          spiritMessage?: SpiritMessage;
        };
      }>(`
        mutation CreateSpiritMessage($input: CreateSpiritMessageInput!) {
          createSpiritMessage(input: $input) {
            success
            message
            spiritMessage {
              ${SPIRIT_MESSAGE_FIELDS}
            }
          }
        }
      `, { input });
      return response.createSpiritMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spirit-messages', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['spirit-messages-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export const useUpdateSpiritMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSpiritMessageInput) => {
      const response = await gql<{
        updateSpiritMessage: {
          success: boolean;
          message?: string;
          spiritMessage?: SpiritMessage;
        };
      }>(`
        mutation UpdateSpiritMessage($input: UpdateSpiritMessageInput!) {
          updateSpiritMessage(input: $input) {
            success
            message
            spiritMessage {
              ${SPIRIT_MESSAGE_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateSpiritMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spirit-messages', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['spirit-messages-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['spirit-message', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
    },
  });
};

export const useDeleteSpiritMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteSpiritMessage: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteSpiritMessage($id: ID!, $userId: ID!) {
          deleteSpiritMessage(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteSpiritMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spirit-messages', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['spirit-messages-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export default useSpiritMessages;
