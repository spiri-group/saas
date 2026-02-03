'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ReadingSourceType, ExternalPlatform, SymbolTag } from '../types';

// ============================================
// Types
// ============================================

export interface Card {
  name: string;
  reversed: boolean;
  position?: string;
  interpretation?: string;
}

export interface ReadingSourceDetails {
  deck?: string;
  spiriReadingId?: string;
  practitionerName?: string;
  practitionerId?: string;
  platform?: ExternalPlatform;
  readerName?: string;
  sourceUrl?: string;
  channelName?: string;
}

export interface ReadingEntry {
  id: string;
  userId: string;
  date: string;
  sourceType: ReadingSourceType;
  sourceDetails: ReadingSourceDetails;
  cards: Card[];
  spreadType?: string;
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;
  symbols: SymbolTag[];
  themes: string[];
  followUpDate?: string;
  outcome?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReadingEntryFilters {
  startDate?: string;
  endDate?: string;
  sourceType?: ReadingSourceType;
  deck?: string;
  hasQuestion?: boolean;
  hasSymbol?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Hook
// ============================================

const useReadingEntries = (userId: string, filters?: ReadingEntryFilters) => {
  return useQuery({
    queryKey: ['reading-entries', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        readingEntries: ReadingEntry[];
      }>(`
        query GetReadingEntries($userId: ID!, $filters: ReadingEntryFiltersInput) {
          readingEntries(userId: $userId, filters: $filters) {
            id
            userId
            date
            sourceType
            sourceDetails {
              deck
              spiriReadingId
              practitionerName
              practitionerId
              platform
              readerName
              sourceUrl
              channelName
            }
            cards {
              name
              reversed
              spreadPosition
              interpretation
            }
            spreadType
            question
            firstImpression
            reflection
            resonanceScore
            symbols {
              symbolId
              name
              category
              context
              autoExtracted
            }
            themes
            followUpDate
            outcome
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.readingEntries;
    },
    enabled: !!userId,
  });
};

export default useReadingEntries;
