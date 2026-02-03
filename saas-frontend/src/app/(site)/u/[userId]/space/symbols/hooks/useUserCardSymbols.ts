import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export interface UserCardSymbols {
  id: string;
  userId: string;
  cardName: string;
  normalizedCardName: string;
  personalSymbols: string[];
  usePersonalOnly: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

export interface CreateUserCardSymbolsInput {
  userId: string;
  cardName: string;
  personalSymbols: string[];
  usePersonalOnly?: boolean;
  notes?: string;
}

export interface UpdateUserCardSymbolsInput {
  id: string;
  userId: string;
  personalSymbols?: string[];
  usePersonalOnly?: boolean;
  notes?: string;
}

interface UserCardSymbolsResponse {
  success: boolean;
  message?: string;
  cardSymbols?: UserCardSymbols;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}

// ============================================
// Queries
// ============================================

/**
 * Hook to fetch all user card symbols for a user
 */
export function useUserCardSymbols(userId: string) {
  return useQuery({
    queryKey: ['user-card-symbols', userId],
    queryFn: async () => {
      const response = await gql<{
        userCardSymbols: UserCardSymbols[];
      }>(`
        query GetUserCardSymbols($userId: ID!) {
          userCardSymbols(userId: $userId) {
            id
            userId
            cardName
            normalizedCardName
            personalSymbols
            usePersonalOnly
            notes
            createdAt
            updatedAt
            ref {
              id
              partition
              container
            }
          }
        }
      `, { userId });
      return response.userCardSymbols;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a single user card symbol by ID
 */
export function useUserCardSymbol(id: string, userId: string) {
  return useQuery({
    queryKey: ['user-card-symbol', id, userId],
    queryFn: async () => {
      const response = await gql<{
        userCardSymbol: UserCardSymbols | null;
      }>(`
        query GetUserCardSymbol($id: ID!, $userId: ID!) {
          userCardSymbol(id: $id, userId: $userId) {
            id
            userId
            cardName
            normalizedCardName
            personalSymbols
            usePersonalOnly
            notes
            createdAt
            updatedAt
            ref {
              id
              partition
              container
            }
          }
        }
      `, { id, userId });
      return response.userCardSymbol;
    },
    enabled: !!id && !!userId,
  });
}

/**
 * Hook to fetch user card symbols by card name
 */
export function useUserCardSymbolByCardName(userId: string, cardName: string) {
  return useQuery({
    queryKey: ['user-card-symbol-by-name', userId, cardName],
    queryFn: async () => {
      const response = await gql<{
        userCardSymbolByCardName: UserCardSymbols | null;
      }>(`
        query GetUserCardSymbolByCardName($userId: ID!, $cardName: String!) {
          userCardSymbolByCardName(userId: $userId, cardName: $cardName) {
            id
            userId
            cardName
            normalizedCardName
            personalSymbols
            usePersonalOnly
            notes
            createdAt
            updatedAt
            ref {
              id
              partition
              container
            }
          }
        }
      `, { userId, cardName });
      return response.userCardSymbolByCardName;
    },
    enabled: !!userId && !!cardName,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Hook to create user card symbols
 */
export function useCreateUserCardSymbols() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserCardSymbolsInput) => {
      const response = await gql<{
        createUserCardSymbols: UserCardSymbolsResponse;
      }>(`
        mutation CreateUserCardSymbols($input: CreateUserCardSymbolsInput!) {
          createUserCardSymbols(input: $input) {
            success
            message
            cardSymbols {
              id
              userId
              cardName
              normalizedCardName
              personalSymbols
              usePersonalOnly
              notes
              createdAt
              updatedAt
              ref {
                id
                partition
                container
              }
            }
          }
        }
      `, { input });

      if (!response.createUserCardSymbols.success) {
        throw new Error(response.createUserCardSymbols.message || 'Failed to create card symbols');
      }

      return response.createUserCardSymbols;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-card-symbols', variables.userId] });
    },
  });
}

/**
 * Hook to update user card symbols
 */
export function useUpdateUserCardSymbols() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserCardSymbolsInput) => {
      const response = await gql<{
        updateUserCardSymbols: UserCardSymbolsResponse;
      }>(`
        mutation UpdateUserCardSymbols($input: UpdateUserCardSymbolsInput!) {
          updateUserCardSymbols(input: $input) {
            success
            message
            cardSymbols {
              id
              userId
              cardName
              normalizedCardName
              personalSymbols
              usePersonalOnly
              notes
              createdAt
              updatedAt
              ref {
                id
                partition
                container
              }
            }
          }
        }
      `, { input });

      if (!response.updateUserCardSymbols.success) {
        throw new Error(response.updateUserCardSymbols.message || 'Failed to update card symbols');
      }

      return response.updateUserCardSymbols;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-card-symbols', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-card-symbol', variables.id, variables.userId] });
    },
  });
}

/**
 * Hook to delete user card symbols
 */
export function useDeleteUserCardSymbols() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteUserCardSymbols: DeleteResponse;
      }>(`
        mutation DeleteUserCardSymbols($id: ID!, $userId: ID!) {
          deleteUserCardSymbols(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });

      if (!response.deleteUserCardSymbols.success) {
        throw new Error(response.deleteUserCardSymbols.message || 'Failed to delete card symbols');
      }

      return response.deleteUserCardSymbols;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-card-symbols', variables.userId] });
    },
  });
}

export default useUserCardSymbols;
