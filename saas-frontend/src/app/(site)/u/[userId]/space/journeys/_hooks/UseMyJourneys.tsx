'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ── Types ──────────────────────────────────────────────────

export interface JourneyTrackProgress {
  trackId: string;
  completed: boolean;
  lastPositionSeconds: number;
  completedDate?: string;
  reflection?: string;
}

export interface JourneyThumbnail {
  image?: {
    media?: {
      url: string;
      name: string;
    };
  };
}

export interface LinkedProduct {
  id: string;
  name: string;
  vendorId: string;
  thumbnail?: { image?: { media?: { url?: string } } };
  skus?: { id: string; price: { amount: number; currency: string }; qty: string }[];
  ref?: { id: string; partition: string[]; container: string };
}

export interface JourneyTrack {
  id: string;
  journeyId: string;
  vendorId: string;
  trackNumber: number;
  title: string;
  description?: string;
  intention?: string;
  durationSeconds: number;
  audioFile?: {
    url: string;
    name: string;
  };
  previewDurationSeconds?: number;
  integrationPrompts?: string[];
  recommendedCrystals?: string[];
  linkedProducts?: LinkedProduct[];
  releaseDate?: string;
}

export interface Journey {
  id: string;
  vendorId: string;
  name: string;
  slug?: string;
  description: string;
  thumbnail?: JourneyThumbnail;
  isLive?: boolean;
  journeyStructure: string;
  modalities?: string[];
  intention?: string;
  totalDurationSeconds: number;
  trackCount: number;
  pricing: {
    collectionPrice: { amount: number; currency: string };
    singleTrackPrice?: { amount: number; currency: string };
    allowSingleTrackPurchase: boolean;
  };
  recommendedCrystals?: string[];
  recommendedTools?: string[];
  difficulty?: string;
  tracks?: JourneyTrack[];
  vendor?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface JourneyProgress {
  id: string;
  userId: string;
  journeyId: string;
  vendorId: string;
  purchaseDate?: string;
  completedDate?: string;
  currentTrackNumber: number;
  accessType: string;
  rentalExpiresAt?: string;
  trackProgress?: JourneyTrackProgress[];
  journey?: Journey;
}

// ── Queries ────────────────────────────────────────────────

export const useMyJourneys = (userId: string) => {
  return useQuery({
    queryKey: ['my-journeys', userId],
    queryFn: async () => {
      const response = await gql<{
        myJourneys: JourneyProgress[];
      }>(`
        query MyJourneys($userId: ID!) {
          myJourneys(userId: $userId) {
            id
            userId
            journeyId
            vendorId
            purchaseDate
            completedDate
            currentTrackNumber
            accessType
            rentalExpiresAt
            trackProgress {
              trackId
              completed
              lastPositionSeconds
              completedDate
              reflection
            }
            journey {
              id
              vendorId
              name
              slug
              description
              thumbnail {
                image {
                  media {
                    url
                    name
                  }
                }
              }
              journeyStructure
              intention
              totalDurationSeconds
              trackCount
              difficulty
              vendor {
                id
                name
                slug
              }
            }
          }
        }
      `, { userId });
      return response.myJourneys;
    },
    enabled: !!userId,
  });
};

export const useJourneyProgress = (journeyId: string, userId: string) => {
  return useQuery({
    queryKey: ['journey-progress', journeyId, userId],
    queryFn: async () => {
      const response = await gql<{
        journeyProgress: JourneyProgress;
      }>(`
        query GetJourneyProgress($journeyId: ID!, $userId: ID!) {
          journeyProgress(journeyId: $journeyId, userId: $userId) {
            id
            userId
            journeyId
            vendorId
            purchaseDate
            completedDate
            currentTrackNumber
            accessType
            rentalExpiresAt
            trackProgress {
              trackId
              completed
              lastPositionSeconds
              completedDate
              reflection
            }
          }
        }
      `, { journeyId, userId });
      return response.journeyProgress;
    },
    enabled: !!journeyId && !!userId,
  });
};

export const useJourneyDetail = (journeyId: string, vendorId: string) => {
  return useQuery({
    queryKey: ['journey-detail', journeyId, vendorId],
    queryFn: async () => {
      const response = await gql<{
        journey: Journey;
      }>(`
        query GetJourney($id: ID!, $vendorId: ID!) {
          journey(id: $id, vendorId: $vendorId) {
            id
            vendorId
            name
            slug
            description
            thumbnail {
              image {
                media {
                  url
                  name
                }
              }
            }
            isLive
            journeyStructure
            modalities
            intention
            totalDurationSeconds
            trackCount
            recommendedCrystals
            recommendedTools
            difficulty
            vendor {
              id
              name
              slug
            }
          }
        }
      `, { id: journeyId, vendorId });
      return response.journey;
    },
    enabled: !!journeyId && !!vendorId,
  });
};

export const useJourneyTracks = (journeyId: string, vendorId: string) => {
  return useQuery({
    queryKey: ['journey-tracks', journeyId, vendorId],
    queryFn: async () => {
      const response = await gql<{
        journeyTracks: JourneyTrack[];
      }>(`
        query GetJourneyTracks($journeyId: ID!, $vendorId: ID!) {
          journeyTracks(journeyId: $journeyId, vendorId: $vendorId) {
            id
            journeyId
            vendorId
            trackNumber
            title
            description
            intention
            durationSeconds
            audioFile {
              url
              name
            }
            previewDurationSeconds
            integrationPrompts
            recommendedCrystals
            linkedProducts {
              id
              name
              vendorId
              thumbnail { image { media { url } } }
              skus { id price { amount currency } qty }
              ref { id partition container }
            }
            releaseDate
          }
        }
      `, { journeyId, vendorId });
      return response.journeyTracks;
    },
    enabled: !!journeyId && !!vendorId,
  });
};

// ── Mutations ──────────────────────────────────────────────

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      journeyId: string;
      userId: string;
      trackId: string;
      lastPositionSeconds: number;
      completed: boolean;
    }) => {
      const response = await gql<{
        update_journey_progress: JourneyProgress;
      }>(`
        mutation UpdateJourneyProgress($input: UpdateJourneyProgressInput!) {
          update_journey_progress(input: $input) {
            id
            currentTrackNumber
            completedDate
            trackProgress {
              trackId
              completed
              lastPositionSeconds
              completedDate
              reflection
            }
          }
        }
      `, { input });
      return response.update_journey_progress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journey-progress', variables.journeyId, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['my-journeys', variables.userId] });
    },
  });
};

export const useAddReflection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      journeyId: string;
      userId: string;
      trackId: string;
      reflection: string;
    }) => {
      const response = await gql<{
        add_track_reflection: JourneyProgress;
      }>(`
        mutation AddTrackReflection($input: AddTrackReflectionInput!) {
          add_track_reflection(input: $input) {
            id
            trackProgress {
              trackId
              completed
              lastPositionSeconds
              completedDate
              reflection
            }
          }
        }
      `, { input });
      return response.add_track_reflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journey-progress', variables.journeyId, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['my-journeys', variables.userId] });
    },
  });
};
