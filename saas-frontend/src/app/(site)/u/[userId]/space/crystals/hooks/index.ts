'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import {
  CrystalCollectionItem,
  CrystalWishlistItem,
  CrystalCompanionLog,
  CrystalCleansingLog,
  CrystalGrid,
  CrystalStats,
  CrystalCollectionFilters,
  CrystalWishlistFilters,
  CrystalCompanionFilters,
  CrystalCleansingFilters,
  CrystalGridFilters,
  CrystalFormState,
  WishlistFormState,
  CompanionFormState,
  CleansingFormState,
  GridFormState,
} from '../types';

// ============================================
// Crystal Reference Search Hook
// ============================================

export interface CrystalReferenceSearchResult {
  id: string;
  name: string;
  colors?: string[];
}

export const useSearchCrystals = (query: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['crystal-search', query, limit],
    queryFn: async () => {
      const response = await gql<{
        searchCrystals: CrystalReferenceSearchResult[];
      }>(`
        query SearchCrystals($query: String!, $limit: Int) {
          searchCrystals(query: $query, limit: $limit) {
            id
            name
            colors
          }
        }
      `, { query, limit });
      return response.searchCrystals;
    },
    enabled: !!query && query.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// ============================================
// Crystal Collection Hooks
// ============================================

export const useCrystalCollection = (userId: string, filters?: CrystalCollectionFilters) => {
  return useQuery({
    queryKey: ['crystal-collection', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        crystalCollection: CrystalCollectionItem[];
      }>(`
        query GetCrystalCollection($userId: ID!, $filters: CrystalCollectionFiltersInput) {
          crystalCollection(userId: $userId, filters: $filters) {
            id
            userId
            name
            crystalRefId
            addedDate
            color
            form
            size
            weight
            origin
            primaryPurpose
            chakras
            elements
            zodiacSigns
            nickname
            personalMeaning
            specialBond
            energyNotes
            acquisitionSource
            acquiredFrom
            acquiredDate
            purchasePrice
            currency
            isActive
            location
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.crystalCollection;
    },
    enabled: !!userId,
  });
};

export const useCrystal = (id: string, userId: string) => {
  return useQuery({
    queryKey: ['crystal', id, userId],
    queryFn: async () => {
      const response = await gql<{
        crystal: CrystalCollectionItem | null;
      }>(`
        query GetCrystal($id: ID!, $userId: ID!) {
          crystal(id: $id, userId: $userId) {
            id
            userId
            name
            crystalRefId
            addedDate
            color
            form
            size
            weight
            origin
            primaryPurpose
            chakras
            elements
            zodiacSigns
            nickname
            personalMeaning
            specialBond
            energyNotes
            acquisitionSource
            acquiredFrom
            acquiredDate
            purchasePrice
            currency
            isActive
            location
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { id, userId });
      return response.crystal;
    },
    enabled: !!id && !!userId,
  });
};

export const useCreateCrystal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CrystalFormState & { userId: string }) => {
      const response = await gql<{
        createCrystal: { success: boolean; message?: string; crystal?: CrystalCollectionItem };
      }>(`
        mutation CreateCrystal($input: CreateCrystalInput!) {
          createCrystal(input: $input) {
            success
            message
            crystal {
              id
              name
            }
          }
        }
      `, { input });
      return response.createCrystal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-collection', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useUpdateCrystal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CrystalFormState> & { id: string; userId: string }) => {
      const response = await gql<{
        updateCrystal: { success: boolean; message?: string; crystal?: CrystalCollectionItem };
      }>(`
        mutation UpdateCrystal($input: UpdateCrystalInput!) {
          updateCrystal(input: $input) {
            success
            message
            crystal {
              id
              name
            }
          }
        }
      `, { input });
      return response.updateCrystal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-collection', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal', variables.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useDeleteCrystal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteCrystal: { success: boolean; message?: string };
      }>(`
        mutation DeleteCrystal($id: ID!, $userId: ID!) {
          deleteCrystal(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteCrystal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-collection', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

// ============================================
// Crystal Wishlist Hooks
// ============================================

export const useCrystalWishlist = (userId: string, filters?: CrystalWishlistFilters) => {
  return useQuery({
    queryKey: ['crystal-wishlist', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        crystalWishlist: CrystalWishlistItem[];
      }>(`
        query GetCrystalWishlist($userId: ID!, $filters: CrystalWishlistFiltersInput) {
          crystalWishlist(userId: $userId, filters: $filters) {
            id
            userId
            name
            crystalRefId
            addedDate
            preferredForm
            preferredSize
            preferredOrigin
            maxBudget
            currency
            purpose
            reason
            alertEnabled
            priority
            isAcquired
            acquiredDate
            collectionItemId
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.crystalWishlist;
    },
    enabled: !!userId,
  });
};

export const useCreateWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WishlistFormState & { userId: string }) => {
      const response = await gql<{
        createWishlistItem: { success: boolean; message?: string; wishlistItem?: CrystalWishlistItem };
      }>(`
        mutation CreateWishlistItem($input: CreateWishlistItemInput!) {
          createWishlistItem(input: $input) {
            success
            message
            wishlistItem {
              id
              name
            }
          }
        }
      `, { input });
      return response.createWishlistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-wishlist', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useUpdateWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<WishlistFormState> & { id: string; userId: string; isAcquired?: boolean; acquiredDate?: string; collectionItemId?: string }) => {
      const response = await gql<{
        updateWishlistItem: { success: boolean; message?: string; wishlistItem?: CrystalWishlistItem };
      }>(`
        mutation UpdateWishlistItem($input: UpdateWishlistItemInput!) {
          updateWishlistItem(input: $input) {
            success
            message
            wishlistItem {
              id
              name
            }
          }
        }
      `, { input });
      return response.updateWishlistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-wishlist', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useDeleteWishlistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteWishlistItem: { success: boolean; message?: string };
      }>(`
        mutation DeleteWishlistItem($id: ID!, $userId: ID!) {
          deleteWishlistItem(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteWishlistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-wishlist', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

// ============================================
// Crystal Companion Hooks
// ============================================

export const useCrystalCompanionLogs = (userId: string, filters?: CrystalCompanionFilters) => {
  return useQuery({
    queryKey: ['crystal-companion-logs', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        crystalCompanionLogs: CrystalCompanionLog[];
      }>(`
        query GetCrystalCompanionLogs($userId: ID!, $filters: CrystalCompanionFiltersInput) {
          crystalCompanionLogs(userId: $userId, filters: $filters) {
            id
            userId
            date
            crystalId
            crystalName
            reason
            intention
            location
            howItFelt
            effectivenessScore
            willContinue
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.crystalCompanionLogs;
    },
    enabled: !!userId,
  });
};

export const useTodaysCompanion = (userId: string) => {
  return useQuery({
    queryKey: ['todays-companion', userId],
    queryFn: async () => {
      const response = await gql<{
        todaysCompanion: CrystalCompanionLog | null;
      }>(`
        query GetTodaysCompanion($userId: ID!) {
          todaysCompanion(userId: $userId) {
            id
            userId
            date
            crystalId
            crystalName
            reason
            intention
            location
            howItFelt
            effectivenessScore
            willContinue
            createdAt
            updatedAt
          }
        }
      `, { userId });
      return response.todaysCompanion;
    },
    enabled: !!userId,
  });
};

export const useCreateCompanionLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompanionFormState & { userId: string; date?: string }) => {
      const response = await gql<{
        createCompanionLog: { success: boolean; message?: string; companionLog?: CrystalCompanionLog };
      }>(`
        mutation CreateCompanionLog($input: CreateCompanionLogInput!) {
          createCompanionLog(input: $input) {
            success
            message
            companionLog {
              id
              crystalName
            }
          }
        }
      `, { input });
      return response.createCompanionLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-companion-logs', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['todays-companion', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useUpdateCompanionLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CompanionFormState> & { id: string; userId: string; howItFelt?: string; effectivenessScore?: number; willContinue?: boolean }) => {
      const response = await gql<{
        updateCompanionLog: { success: boolean; message?: string; companionLog?: CrystalCompanionLog };
      }>(`
        mutation UpdateCompanionLog($input: UpdateCompanionLogInput!) {
          updateCompanionLog(input: $input) {
            success
            message
            companionLog {
              id
              crystalName
            }
          }
        }
      `, { input });
      return response.updateCompanionLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-companion-logs', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['todays-companion', variables.userId] });
    },
  });
};

// ============================================
// Crystal Cleansing Hooks
// ============================================

export const useCrystalCleansingLogs = (userId: string, filters?: CrystalCleansingFilters) => {
  return useQuery({
    queryKey: ['crystal-cleansing-logs', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        crystalCleansingLogs: CrystalCleansingLog[];
      }>(`
        query GetCrystalCleansingLogs($userId: ID!, $filters: CrystalCleansingFiltersInput) {
          crystalCleansingLogs(userId: $userId, filters: $filters) {
            id
            userId
            date
            crystalIds
            crystalNames
            method
            methodDetails
            duration
            moonPhase
            didCharge
            chargingMethod
            chargingDetails
            intention
            notes
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.crystalCleansingLogs;
    },
    enabled: !!userId,
  });
};

export const useCreateCleansingLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CleansingFormState & { userId: string; date?: string }) => {
      const response = await gql<{
        createCleansingLog: { success: boolean; message?: string; cleansingLog?: CrystalCleansingLog };
      }>(`
        mutation CreateCleansingLog($input: CreateCleansingLogInput!) {
          createCleansingLog(input: $input) {
            success
            message
            cleansingLog {
              id
            }
          }
        }
      `, { input });
      return response.createCleansingLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-cleansing-logs', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useDeleteCleansingLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteCleansingLog: { success: boolean; message?: string };
      }>(`
        mutation DeleteCleansingLog($id: ID!, $userId: ID!) {
          deleteCleansingLog(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteCleansingLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-cleansing-logs', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

// ============================================
// Crystal Grid Hooks
// ============================================

export const useCrystalGrids = (userId: string, filters?: CrystalGridFilters) => {
  return useQuery({
    queryKey: ['crystal-grids', userId, filters],
    queryFn: async () => {
      const response = await gql<{
        crystalGrids: CrystalGrid[];
      }>(`
        query GetCrystalGrids($userId: ID!, $filters: CrystalGridFiltersInput) {
          crystalGrids(userId: $userId, filters: $filters) {
            id
            userId
            name
            createdDate
            purpose
            gridShape
            crystals {
              position
              crystalId
              crystalName
              role
            }
            activatedDate
            deactivatedDate
            isActive
            duration
            outcome
            effectivenessScore
            notes
            photoUrl
            createdAt
            updatedAt
          }
        }
      `, { userId, filters });
      return response.crystalGrids;
    },
    enabled: !!userId,
  });
};

export const useCreateCrystalGrid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GridFormState & { userId: string; createdDate?: string }) => {
      const response = await gql<{
        createCrystalGrid: { success: boolean; message?: string; grid?: CrystalGrid };
      }>(`
        mutation CreateCrystalGrid($input: CreateCrystalGridInput!) {
          createCrystalGrid(input: $input) {
            success
            message
            grid {
              id
              name
            }
          }
        }
      `, { input });
      return response.createCrystalGrid;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-grids', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useUpdateCrystalGrid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<GridFormState> & { id: string; userId: string; isActive?: boolean; activatedDate?: string; deactivatedDate?: string; outcome?: string; effectivenessScore?: number }) => {
      const response = await gql<{
        updateCrystalGrid: { success: boolean; message?: string; grid?: CrystalGrid };
      }>(`
        mutation UpdateCrystalGrid($input: UpdateCrystalGridInput!) {
          updateCrystalGrid(input: $input) {
            success
            message
            grid {
              id
              name
            }
          }
        }
      `, { input });
      return response.updateCrystalGrid;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-grids', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

export const useDeleteCrystalGrid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteCrystalGrid: { success: boolean; message?: string };
      }>(`
        mutation DeleteCrystalGrid($id: ID!, $userId: ID!) {
          deleteCrystalGrid(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteCrystalGrid;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-grids', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['crystal-stats', variables.userId] });
    },
  });
};

// ============================================
// Crystal Stats Hook
// ============================================

export const useCrystalStats = (userId: string) => {
  return useQuery({
    queryKey: ['crystal-stats', userId],
    queryFn: async () => {
      const response = await gql<{
        crystalStats: CrystalStats;
      }>(`
        query GetCrystalStats($userId: ID!) {
          crystalStats(userId: $userId) {
            totalCrystals
            activeCrystals
            inactiveCrystals
            colorDistribution {
              color
              count
              percentage
            }
            formDistribution {
              form
              count
              percentage
            }
            chakraDistribution {
              chakra
              count
            }
            specialBondCount
            recentlyAdded {
              id
              name
              color
              form
              addedDate
            }
            companionStreak
            totalCleansingsSessions
            activeGrids
            wishlistCount
            acquiredFromWishlist
          }
        }
      `, { userId });
      return response.crystalStats;
    },
    enabled: !!userId,
  });
};

// ============================================
// Crystal Reference Hooks
// ============================================

import type { CrystalReference, PractitionerInsight, InsightFormState } from '../types';

export const useCrystalReference = (crystalId: string) => {
  return useQuery({
    queryKey: ['crystal-reference', crystalId],
    queryFn: async () => {
      const response = await gql<{
        crystalReference: CrystalReference | null;
      }>(`
        query GetCrystalReference($id: ID!) {
          crystalReference(id: $id) {
            id
            name
            alternateNames
            description
            colors
            crystalSystem
            mohsHardness
            commonForms
            chakras
            elements
            zodiacSigns
            planetaryAssociation
            numerology
            primaryProperties
            emotionalUses
            spiritualUses
            physicalAssociations
            cleansingMethods
            chargingMethods
            avoidMethods
            careNotes
            localities
            thumbnail
          }
        }
      `, { id: crystalId });
      return response.crystalReference;
    },
    enabled: !!crystalId,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes - reference data doesn't change often
  });
};

export const useCrystalReferences = (filters?: { search?: string; chakra?: string; element?: string }) => {
  return useQuery({
    queryKey: ['crystal-references', filters],
    queryFn: async () => {
      const response = await gql<{
        crystalReferences: { crystals: CrystalReference[]; totalCount: number };
      }>(`
        query GetCrystalReferences($filters: CrystalReferenceFiltersInput) {
          crystalReferences(filters: $filters) {
            crystals {
              id
              name
              alternateNames
              description
              colors
              chakras
              elements
              zodiacSigns
              primaryProperties
              thumbnail
            }
            totalCount
          }
        }
      `, { filters });
      return response.crystalReferences;
    },
    staleTime: 1000 * 60 * 30,
  });
};

// ============================================
// Practitioner Insights Hooks
// ============================================

export const useInsightsForCrystal = (crystalId: string) => {
  return useQuery({
    queryKey: ['crystal-insights', crystalId],
    queryFn: async () => {
      const response = await gql<{
        insightsForCrystal: { insights: PractitionerInsight[]; totalCount: number };
      }>(`
        query GetInsightsForCrystal($crystalId: ID!) {
          insightsForCrystal(crystalId: $crystalId) {
            insights {
              id
              crystalId
              practitionerId
              insightType
              content
              agreeCount
              agreedBy
              insightStatus
              reportCount
              createdAt
              updatedAt
            }
            totalCount
          }
        }
      `, { crystalId });
      return response.insightsForCrystal;
    },
    enabled: !!crystalId,
  });
};

export const usePractitionerInsights = (practitionerId: string) => {
  return useQuery({
    queryKey: ['practitioner-insights', practitionerId],
    queryFn: async () => {
      const response = await gql<{
        practitionerInsights: { insights: PractitionerInsight[]; totalCount: number };
      }>(`
        query GetPractitionerInsights($practitionerId: ID!) {
          practitionerInsights(practitionerId: $practitionerId) {
            insights {
              id
              crystalId
              practitionerId
              insightType
              content
              agreeCount
              agreedBy
              insightStatus
              reportCount
              createdAt
              updatedAt
            }
            totalCount
          }
        }
      `, { practitionerId });
      return response.practitionerInsights;
    },
    enabled: !!practitionerId,
  });
};

export const useCreateInsight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InsightFormState & { userId: string }) => {
      const response = await gql<{
        createPractitionerInsight: { success: boolean; message?: string; insight?: PractitionerInsight };
      }>(`
        mutation CreatePractitionerInsight($input: CreatePractitionerInsightInput!) {
          createPractitionerInsight(input: $input) {
            success
            message
            insight {
              id
              crystalId
              insightType
              content
            }
          }
        }
      `, { input });
      return response.createPractitionerInsight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-insights', variables.crystalId] });
      queryClient.invalidateQueries({ queryKey: ['practitioner-insights', variables.userId] });
    },
  });
};

export const useAgreeWithInsight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { insightId: string; insightOwnerId: string; crystalId: string }) => {
      const response = await gql<{
        agreeWithInsight: { success: boolean; message?: string; alreadyAgreed?: boolean };
      }>(`
        mutation AgreeWithInsight($input: AgreeWithInsightInput!) {
          agreeWithInsight(input: $input) {
            success
            message
            alreadyAgreed
          }
        }
      `, { input: { insightId: input.insightId, insightOwnerId: input.insightOwnerId } });
      return response.agreeWithInsight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-insights', variables.crystalId] });
    },
  });
};

export const useReportInsight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { insightId: string; insightOwnerId: string; crystalId: string; reason?: string }) => {
      const response = await gql<{
        reportInsight: { success: boolean; message?: string; alreadyReported?: boolean };
      }>(`
        mutation ReportInsight($input: ReportInsightInput!) {
          reportInsight(input: $input) {
            success
            message
            alreadyReported
          }
        }
      `, { input: { insightId: input.insightId, insightOwnerId: input.insightOwnerId, reason: input.reason } });
      return response.reportInsight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crystal-insights', variables.crystalId] });
    },
  });
};
