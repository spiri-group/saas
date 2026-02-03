'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { EnergyModality, SessionRole } from './useEnergyJournalEntries';

export interface SessionReflection {
  id: string;
  userId: string;
  date: string;
  practitionerName: string;
  modality?: EnergyModality;
  role?: SessionRole;
  sessionType?: string;
  duration?: number;
  bookingId?: string;
  practitionerId?: string;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  sensations?: string[];
  areasWorkedOn?: string[];
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  wouldRecommend?: boolean;
  overallRating?: number;
  shiftsNoticed?: string;
  followUpDate?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionReflectionFilters {
  startDate?: string;
  endDate?: string;
  modality?: EnergyModality;
  practitionerId?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

const useSessionReflections = (userId: string, filters?: SessionReflectionFilters) => {
  return useQuery({
    queryKey: ['session-reflections', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        sessionReflections: SessionReflection[];
      }>(`
        query GetSessionReflections($userId: ID!, $filters: SessionReflectionFiltersInput) {
          sessionReflections(userId: $userId, filters: $filters) {
            id
            userId
            date
            practitionerName
            modality
            role
            sessionType
            duration
            bookingId
            practitionerId
            preSessionState
            duringSession
            postSessionState
            sensations
            areasWorkedOn
            messagesReceived
            aftercare
            personalNotes
            wouldRecommend
            overallRating
            shiftsNoticed
            followUpDate
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.sessionReflections;
    },
    enabled: !!userId,
  });
};

export default useSessionReflections;
