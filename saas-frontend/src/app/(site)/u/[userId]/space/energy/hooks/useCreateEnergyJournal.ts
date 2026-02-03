'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { EnergyJournalEntry, EnergyEntryType, EnergyModality, SessionRole } from './useEnergyJournalEntries';

interface CreateEnergyJournalInput {
  userId: string;
  date?: string;
  entryType: EnergyEntryType;
  title?: string;
  modality?: EnergyModality;
  duration?: number;
  role?: SessionRole;
  bookingId?: string;
  practitionerName?: string;
  practitionerId?: string;
  clientInitials?: string;
  sessionNotes?: string;
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;
  sensations?: string[];
  insights?: string;
  techniquesUsed?: string[];
  toolsUsed?: string[];
  notes?: string;
  intention?: string;
  photoUrl?: string;
}

interface CreateEnergyJournalResponse {
  success: boolean;
  message?: string;
  entry?: EnergyJournalEntry;
}

const useCreateEnergyJournal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEnergyJournalInput) => {
      const response = await gql<{
        createEnergyJournalEntry: CreateEnergyJournalResponse;
      }>(`
        mutation CreateEnergyJournalEntry($input: CreateEnergyJournalInput!) {
          createEnergyJournalEntry(input: $input) {
            success
            message
            entry {
              id
              userId
              date
              entryType
              title
              modality
              duration
              role
              bookingId
              practitionerName
              practitionerId
              clientInitials
              sessionNotes
              preSessionFeeling
              postSessionFeeling
              energyLevel
              sensations
              insights
              techniquesUsed
              toolsUsed
              notes
              intention
              photoUrl
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      return response.createEnergyJournalEntry;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['energy-journal-entries', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['energy-stats', variables.userId] });
      }
    },
  });
};

export default useCreateEnergyJournal;
