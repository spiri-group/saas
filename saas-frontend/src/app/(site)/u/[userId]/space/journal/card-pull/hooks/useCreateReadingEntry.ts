'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface CreateReadingEntryInput {
  userId: string;
  date?: string;
  sourceType: ReadingSourceType;
  sourceDetails: ReadingSourceDetails;
  cards: Card[];
  spreadType?: string;
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;
  themes?: string[];
  followUpDate?: string;
  photoUrl?: string;
}

interface CreateReadingEntryResponse {
  success: boolean;
  message?: string;
  readingEntry?: ReadingEntry;
}

// ============================================
// Hook
// ============================================

const useCreateReadingEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReadingEntryInput) => {
      const response = await gql<{
        createReadingEntry: CreateReadingEntryResponse;
      }>(`
        mutation CreateReadingEntry($input: CreateReadingEntryInput!) {
          createReadingEntry(input: $input) {
            success
            message
            readingEntry {
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
        }
      `, { input });
      return response.createReadingEntry;
    },
    onSuccess: (data, variables) => {
      // Invalidate all reading queries for this user
      queryClient.invalidateQueries({ queryKey: ['reading-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['card-pulls', variables.userId] });
      // Also invalidate user symbols since new symbols may have been created
      queryClient.invalidateQueries({ queryKey: ['user-symbols', variables.userId] });
      // Invalidate the specific date query if we know the date
      if (data.readingEntry?.date) {
        queryClient.invalidateQueries({
          queryKey: ['reading-entry-by-date', variables.userId, data.readingEntry.date]
        });
        queryClient.invalidateQueries({
          queryKey: ['card-pull-by-date', variables.userId, data.readingEntry.date]
        });
      }
    },
  });
};

export default useCreateReadingEntry;
