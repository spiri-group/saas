'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface MeditationJournalEntry {
  id: string;
  userId: string;
  date: string;
  duration: number;
  technique?: string;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: string;
  postSessionMood?: string;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface MeditationFilters {
  startDate?: string;
  endDate?: string;
  technique?: string;
  minDuration?: number;
  maxDuration?: number;
  limit?: number;
  offset?: number;
}

const useMeditations = (userId: string, filters?: MeditationFilters) => {
  return useQuery({
    queryKey: ['meditations', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        meditations: MeditationJournalEntry[];
      }>(`
        query GetMeditations($userId: ID!, $filters: MeditationFiltersInput) {
          meditations(userId: $userId, filters: $filters) {
            id
            userId
            date
            duration
            technique
            guidedBy
            focus
            preSessionMood
            postSessionMood
            depth
            distractionLevel
            insights
            experiences
            intentions
            gratitude
            location
            posture
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.meditations;
    },
    enabled: !!userId,
  });
};

export default useMeditations;
