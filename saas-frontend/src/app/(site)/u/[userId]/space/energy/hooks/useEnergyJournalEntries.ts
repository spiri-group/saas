'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type EnergyModality =
  | 'reiki'
  | 'pranic_healing'
  | 'quantum_touch'
  | 'theta_healing'
  | 'healing_touch'
  | 'chakra_balancing'
  | 'aura_cleansing'
  | 'crystal_healing'
  | 'sound_healing'
  | 'breathwork'
  | 'meditation'
  | 'grounding'
  | 'shielding'
  | 'cord_cutting'
  | 'entity_clearing'
  | 'space_clearing'
  | 'distance_healing'
  | 'self_healing'
  | 'acupuncture'
  | 'qigong'
  | 'shamanic'
  | 'other';

export type EnergyEntryType =
  | 'meditation'
  | 'clearing'
  | 'grounding'
  | 'session_given'
  | 'session_received'
  | 'self_practice'
  | 'attunement'
  | 'protection_ritual'
  | 'observation';

export type SessionRole = 'practitioner' | 'recipient' | 'self';

export interface EnergyJournalEntry {
  id: string;
  userId: string;
  date: string;
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
  createdAt: string;
  updatedAt: string;
}

interface EnergyJournalFilters {
  startDate?: string;
  endDate?: string;
  entryType?: EnergyEntryType;
  modality?: EnergyModality;
  role?: SessionRole;
  limit?: number;
  offset?: number;
}

const useEnergyJournalEntries = (userId: string, filters?: EnergyJournalFilters) => {
  return useQuery({
    queryKey: ['energy-journal-entries', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        energyJournalEntries: EnergyJournalEntry[];
      }>(`
        query GetEnergyJournalEntries($userId: ID!, $filters: EnergyJournalFiltersInput) {
          energyJournalEntries(userId: $userId, filters: $filters) {
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
      `, { userId, filters });
      return response.energyJournalEntries;
    },
    enabled: !!userId,
  });
};

export default useEnergyJournalEntries;
