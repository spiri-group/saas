import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface UpdateSymbolMeaningInput {
  userId: string;
  symbolName: string;
  personalMeaning: string;
}

interface UserSymbolMeaning {
  id: string;
  userId: string;
  symbolName: string;
  personalMeaning: string;
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  firstSeen: string;
  lastSeen: string;
}

interface UpdateSymbolMeaningResponse {
  success: boolean;
  message?: string;
  userSymbolMeaning?: UserSymbolMeaning;
}

export const useUpdateSymbolMeaning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSymbolMeaningInput) => {
      const response = await gql<{
        updateUserSymbolMeaning: UpdateSymbolMeaningResponse;
      }>(`
        mutation UpdateUserSymbolMeaning($input: UpdateUserSymbolMeaningInput!) {
          updateUserSymbolMeaning(input: $input) {
            success
            message
            userSymbolMeaning {
              id
              userId
              symbolName
              personalMeaning
              totalOccurrences
              dreamOccurrences
              readingOccurrences
              firstSeen
              lastSeen
            }
          }
        }
      `, { input });
      return response.updateUserSymbolMeaning;
    },
    onSuccess: (_, variables) => {
      // Invalidate symbol stats to refresh data
      queryClient.invalidateQueries({ queryKey: ['symbol-pattern-stats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-symbols', variables.userId] });
    },
  });
};

export default useUpdateSymbolMeaning;
