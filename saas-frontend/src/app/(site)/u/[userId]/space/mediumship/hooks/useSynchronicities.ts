'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export interface SymbolTag {
  symbolId?: string;
  name: string;
  category?: string;
  context?: string;
  autoExtracted: boolean;
}

export interface Synchronicity {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  confirmedMeaning?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: SymbolTag[];
  significanceScore?: number;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

interface SynchronicityFilters {
  startDate?: string;
  endDate?: string;
  recurringTheme?: boolean;
  hasSymbol?: string;
  minSignificance?: number;
  limit?: number;
  offset?: number;
}

export interface CreateSynchronicityInput {
  userId: string;
  date?: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: SymbolTag[];
  significanceScore?: number;
  photoUrl?: string;
}

export interface UpdateSynchronicityInput {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  confirmedMeaning?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: SymbolTag[];
  significanceScore?: number;
  photoUrl?: string;
}

// ============================================
// GraphQL Fragments
// ============================================

const SYNCHRONICITY_FIELDS = `
  id
  userId
  date
  title
  description
  time
  location
  witnesses
  possibleMeaning
  relatedTo
  confirmedMeaning
  recurringTheme
  relatedSynchronicities
  symbols {
    symbolId
    name
    category
    context
    autoExtracted
  }
  significanceScore
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

const useSynchronicities = (userId: string, filters?: SynchronicityFilters) => {
  return useQuery({
    queryKey: ['synchronicities', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        synchronicities: Synchronicity[];
      }>(`
        query GetSynchronicities($userId: ID!, $filters: SynchronicityFilters) {
          synchronicities(userId: $userId, filters: $filters) {
            ${SYNCHRONICITY_FIELDS}
          }
        }
      `, { userId, filters });
      return response.synchronicities;
    },
    enabled: !!userId,
  });
};

export const useRecentSynchronicities = (userId: string, limit?: number) => {
  return useQuery({
    queryKey: ['synchronicities-recent', userId, limit],
    queryFn: async () => {
      const response = await gql<{
        recentSynchronicities: Synchronicity[];
      }>(`
        query GetRecentSynchronicities($userId: ID!, $limit: Int) {
          recentSynchronicities(userId: $userId, limit: $limit) {
            ${SYNCHRONICITY_FIELDS}
          }
        }
      `, { userId, limit });
      return response.recentSynchronicities;
    },
    enabled: !!userId,
  });
};

export const useSynchronicity = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['synchronicity', id, userId],
    queryFn: async () => {
      const response = await gql<{
        synchronicity: Synchronicity | null;
      }>(`
        query GetSynchronicity($id: ID!, $userId: ID!) {
          synchronicity(id: $id, userId: $userId) {
            ${SYNCHRONICITY_FIELDS}
          }
        }
      `, { id, userId });
      return response.synchronicity;
    },
    enabled: !!id && !!userId,
  });
};

export const useCreateSynchronicity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSynchronicityInput) => {
      const response = await gql<{
        createSynchronicity: {
          success: boolean;
          message?: string;
          synchronicity?: Synchronicity;
        };
      }>(`
        mutation CreateSynchronicity($input: CreateSynchronicityInput!) {
          createSynchronicity(input: $input) {
            success
            message
            synchronicity {
              ${SYNCHRONICITY_FIELDS}
            }
          }
        }
      `, { input });
      return response.createSynchronicity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['synchronicities', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['synchronicities-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export const useUpdateSynchronicity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSynchronicityInput) => {
      const response = await gql<{
        updateSynchronicity: {
          success: boolean;
          message?: string;
          synchronicity?: Synchronicity;
        };
      }>(`
        mutation UpdateSynchronicity($input: UpdateSynchronicityInput!) {
          updateSynchronicity(input: $input) {
            success
            message
            synchronicity {
              ${SYNCHRONICITY_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateSynchronicity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['synchronicities', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['synchronicities-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['synchronicity', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
    },
  });
};

export const useDeleteSynchronicity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteSynchronicity: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteSynchronicity($id: ID!, $userId: ID!) {
          deleteSynchronicity(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteSynchronicity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['synchronicities', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['synchronicities-recent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export default useSynchronicities;
