'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface DeleteEnergyJournalInput {
  id: string;
  userId: string;
}

interface DeleteEnergyJournalResponse {
  success: boolean;
  message?: string;
}

const useDeleteEnergyJournal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: DeleteEnergyJournalInput) => {
      const response = await gql<{
        deleteEnergyJournalEntry: DeleteEnergyJournalResponse;
      }>(`
        mutation DeleteEnergyJournalEntry($id: ID!, $userId: ID!) {
          deleteEnergyJournalEntry(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteEnergyJournalEntry;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['energy-journal-entries', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['energy-stats', variables.userId] });
      }
    },
  });
};

export default useDeleteEnergyJournal;
