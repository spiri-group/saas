'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export interface ContextualMeaning {
  context: string;
  meaning: string;
}

export interface SymbolExample {
  entryType: string;
  entryId: string;
  date: string;
  snippet: string;
}

export interface MeaningEvolution {
  date: string;
  previousMeaning: string;
  newMeaning: string;
  reason?: string;
}

export interface PersonalSymbol {
  id: string;
  userId: string;
  symbolName: string;
  normalizedName: string;
  category?: string;
  personalMeaning: string;
  contextualMeanings?: ContextualMeaning[];
  firstEncountered: string;
  lastEncountered: string;
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  synchronicityOccurrences: number;
  notableExamples?: SymbolExample[];
  meaningEvolution?: MeaningEvolution[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

interface PersonalSymbolFilters {
  category?: string;
  minOccurrences?: number;
  limit?: number;
  offset?: number;
}

export interface CreatePersonalSymbolInput {
  userId: string;
  symbolName: string;
  category?: string;
  personalMeaning: string;
  contextualMeanings?: ContextualMeaning[];
  notes?: string;
}

export interface UpdatePersonalSymbolInput {
  id: string;
  userId: string;
  personalMeaning?: string;
  contextualMeanings?: ContextualMeaning[];
  notes?: string;
}

// ============================================
// GraphQL Fragments
// ============================================

const PERSONAL_SYMBOL_FIELDS = `
  id
  userId
  symbolName
  normalizedName
  category
  personalMeaning
  contextualMeanings {
    context
    meaning
  }
  firstEncountered
  lastEncountered
  totalOccurrences
  dreamOccurrences
  readingOccurrences
  synchronicityOccurrences
  notableExamples {
    entryType
    entryId
    date
    snippet
  }
  meaningEvolution {
    date
    previousMeaning
    newMeaning
    reason
  }
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

const usePersonalSymbols = (userId: string, filters?: PersonalSymbolFilters) => {
  return useQuery({
    queryKey: ['personal-symbols', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        personalSymbols: PersonalSymbol[];
      }>(`
        query GetPersonalSymbols($userId: ID!, $filters: PersonalSymbolFilters) {
          personalSymbols(userId: $userId, filters: $filters) {
            ${PERSONAL_SYMBOL_FIELDS}
          }
        }
      `, { userId, filters });
      return response.personalSymbols;
    },
    enabled: !!userId,
  });
};

export const usePersonalSymbol = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['personal-symbol', id, userId],
    queryFn: async () => {
      const response = await gql<{
        personalSymbol: PersonalSymbol | null;
      }>(`
        query GetPersonalSymbol($id: ID!, $userId: ID!) {
          personalSymbol(id: $id, userId: $userId) {
            ${PERSONAL_SYMBOL_FIELDS}
          }
        }
      `, { id, userId });
      return response.personalSymbol;
    },
    enabled: !!id && !!userId,
  });
};

export const usePersonalSymbolByName = (userId: string, symbolName: string) => {
  return useQuery({
    queryKey: ['personal-symbol-name', userId, symbolName],
    queryFn: async () => {
      const response = await gql<{
        personalSymbolByName: PersonalSymbol | null;
      }>(`
        query GetPersonalSymbolByName($userId: ID!, $symbolName: String!) {
          personalSymbolByName(userId: $userId, symbolName: $symbolName) {
            ${PERSONAL_SYMBOL_FIELDS}
          }
        }
      `, { userId, symbolName });
      return response.personalSymbolByName;
    },
    enabled: !!userId && !!symbolName,
  });
};

export const useCreatePersonalSymbol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePersonalSymbolInput) => {
      const response = await gql<{
        createPersonalSymbol: {
          success: boolean;
          message?: string;
          symbol?: PersonalSymbol;
        };
      }>(`
        mutation CreatePersonalSymbol($input: CreatePersonalSymbolInput!) {
          createPersonalSymbol(input: $input) {
            success
            message
            symbol {
              ${PERSONAL_SYMBOL_FIELDS}
            }
          }
        }
      `, { input });
      return response.createPersonalSymbol;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personal-symbols', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export const useUpdatePersonalSymbol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePersonalSymbolInput) => {
      const response = await gql<{
        updatePersonalSymbol: {
          success: boolean;
          message?: string;
          symbol?: PersonalSymbol;
        };
      }>(`
        mutation UpdatePersonalSymbol($input: UpdatePersonalSymbolInput!) {
          updatePersonalSymbol(input: $input) {
            success
            message
            symbol {
              ${PERSONAL_SYMBOL_FIELDS}
            }
          }
        }
      `, { input });
      return response.updatePersonalSymbol;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personal-symbols', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['personal-symbol', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
    },
  });
};

export const useDeletePersonalSymbol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deletePersonalSymbol: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeletePersonalSymbol($id: ID!, $userId: ID!) {
          deletePersonalSymbol(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deletePersonalSymbol;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personal-symbols', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['mediumship-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unlock-state', variables.userId] });
    },
  });
};

export default usePersonalSymbols;
