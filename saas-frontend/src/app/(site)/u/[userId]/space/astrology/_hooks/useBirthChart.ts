'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ============================================
// Types
// ============================================

export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type CelestialBody =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'chiron'
  | 'northnode'
  | 'ascendant'
  | 'midheaven';

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

export type BirthTimePrecision = 'exact' | 'approximate' | 'unknown';

export type ApproximateTimeRange = 'morning' | 'afternoon' | 'evening' | 'night';

export interface BirthLocation {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  note?: string;
}

export interface PlanetPosition {
  body: CelestialBody;
  sign: ZodiacSign;
  degree: number;
  absoluteDegree: number;
  house?: number;
  retrograde: boolean;
}

export interface HouseCusp {
  house: number;
  sign: ZodiacSign;
  degree: number;
}

export interface Aspect {
  body1: CelestialBody;
  body2: CelestialBody;
  aspect: AspectType;
  orb: number;
  applying: boolean;
}

export interface BirthChart {
  id: string;
  userId: string;
  birthDate: string;
  birthTimePrecision: BirthTimePrecision;
  birthTime?: string;
  birthTimeApproximate?: ApproximateTimeRange;
  birthLocation: BirthLocation;
  calculatedAt: string;
  planets: PlanetPosition[];
  houses?: HouseCusp[];
  aspects: Aspect[];
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign?: ZodiacSign;
  housesAreApproximate?: boolean;
  moonMayBeInaccurate?: boolean;
  createdAt: string;
  updatedAt: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
}

export interface CitySearchResult {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
  adminRegion?: string;
}

export interface CreateBirthChartInput {
  userId: string;
  birthDate: string;
  birthTimePrecision: BirthTimePrecision;
  birthTime?: string;
  birthTimeApproximate?: ApproximateTimeRange;
  birthLocation: BirthLocation;
}

export interface UpdateBirthChartInput {
  id: string;
  userId: string;
  birthDate?: string;
  birthTimePrecision?: BirthTimePrecision;
  birthTime?: string;
  birthTimeApproximate?: ApproximateTimeRange;
  birthLocation?: BirthLocation;
}

// ============================================
// GraphQL Fragments
// ============================================

const BIRTH_CHART_FIELDS = `
  id
  userId
  birthDate
  birthTimePrecision
  birthTime
  birthTimeApproximate
  birthLocation {
    city
    country
    countryCode
    latitude
    longitude
    timezone
    note
  }
  calculatedAt
  planets {
    body
    sign
    degree
    absoluteDegree
    house
    retrograde
  }
  houses {
    house
    sign
    degree
  }
  aspects {
    body1
    body2
    aspect
    orb
    applying
  }
  sunSign
  moonSign
  risingSign
  housesAreApproximate
  moonMayBeInaccurate
  createdAt
  updatedAt
  ref {
    id
    partition
    container
  }
`;

// ============================================
// Hooks
// ============================================

export const useBirthChart = (userId: string) => {
  return useQuery({
    queryKey: ['birth-chart', userId],
    queryFn: async () => {
      const response = await gql<{
        birthChart: BirthChart | null;
      }>(`
        query GetBirthChart($userId: ID!) {
          birthChart(userId: $userId) {
            ${BIRTH_CHART_FIELDS}
          }
        }
      `, { userId });
      return response.birthChart;
    },
    enabled: !!userId,
  });
};

export const useSearchCities = (query: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['city-search', query, limit],
    queryFn: async () => {
      const response = await gql<{
        searchCities: CitySearchResult[];
      }>(`
        query SearchCities($query: String!, $limit: Int) {
          searchCities(query: $query, limit: $limit) {
            id
            city
            country
            countryCode
            latitude
            longitude
            timezone
            population
            adminRegion
          }
        }
      `, { query, limit });
      return response.searchCities;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useCreateBirthChart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBirthChartInput) => {
      const response = await gql<{
        createBirthChart: {
          success: boolean;
          message?: string;
          birthChart?: BirthChart;
        };
      }>(`
        mutation CreateBirthChart($input: CreateBirthChartInput!) {
          createBirthChart(input: $input) {
            success
            message
            birthChart {
              ${BIRTH_CHART_FIELDS}
            }
          }
        }
      `, { input });
      return response.createBirthChart;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['birth-chart', variables.userId] });
    },
  });
};

export const useUpdateBirthChart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBirthChartInput) => {
      const response = await gql<{
        updateBirthChart: {
          success: boolean;
          message?: string;
          birthChart?: BirthChart;
        };
      }>(`
        mutation UpdateBirthChart($input: UpdateBirthChartInput!) {
          updateBirthChart(input: $input) {
            success
            message
            birthChart {
              ${BIRTH_CHART_FIELDS}
            }
          }
        }
      `, { input });
      return response.updateBirthChart;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['birth-chart', variables.userId] });
    },
  });
};

export const useDeleteBirthChart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await gql<{
        deleteBirthChart: {
          success: boolean;
          message?: string;
        };
      }>(`
        mutation DeleteBirthChart($id: ID!, $userId: ID!) {
          deleteBirthChart(id: $id, userId: $userId) {
            success
            message
          }
        }
      `, { id, userId });
      return response.deleteBirthChart;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['birth-chart', variables.userId] });
    },
  });
};

// ============================================
// Helper Functions
// ============================================

export const ZODIAC_SIGNS: { key: ZodiacSign; name: string; symbol: string; element: string }[] = [
  { key: 'aries', name: 'Aries', symbol: '♈', element: 'Fire' },
  { key: 'taurus', name: 'Taurus', symbol: '♉', element: 'Earth' },
  { key: 'gemini', name: 'Gemini', symbol: '♊', element: 'Air' },
  { key: 'cancer', name: 'Cancer', symbol: '♋', element: 'Water' },
  { key: 'leo', name: 'Leo', symbol: '♌', element: 'Fire' },
  { key: 'virgo', name: 'Virgo', symbol: '♍', element: 'Earth' },
  { key: 'libra', name: 'Libra', symbol: '♎', element: 'Air' },
  { key: 'scorpio', name: 'Scorpio', symbol: '♏', element: 'Water' },
  { key: 'sagittarius', name: 'Sagittarius', symbol: '♐', element: 'Fire' },
  { key: 'capricorn', name: 'Capricorn', symbol: '♑', element: 'Earth' },
  { key: 'aquarius', name: 'Aquarius', symbol: '♒', element: 'Air' },
  { key: 'pisces', name: 'Pisces', symbol: '♓', element: 'Water' },
];

export const CELESTIAL_BODIES: { key: CelestialBody; name: string; symbol: string }[] = [
  { key: 'sun', name: 'Sun', symbol: '☉' },
  { key: 'moon', name: 'Moon', symbol: '☽' },
  { key: 'mercury', name: 'Mercury', symbol: '☿' },
  { key: 'venus', name: 'Venus', symbol: '♀' },
  { key: 'mars', name: 'Mars', symbol: '♂' },
  { key: 'jupiter', name: 'Jupiter', symbol: '♃' },
  { key: 'saturn', name: 'Saturn', symbol: '♄' },
  { key: 'uranus', name: 'Uranus', symbol: '♅' },
  { key: 'neptune', name: 'Neptune', symbol: '♆' },
  { key: 'pluto', name: 'Pluto', symbol: '♇' },
  { key: 'chiron', name: 'Chiron', symbol: '⚷' },
  { key: 'northnode', name: 'North Node', symbol: '☊' },
  { key: 'ascendant', name: 'Ascendant', symbol: 'AC' },
  { key: 'midheaven', name: 'Midheaven', symbol: 'MC' },
];

export const ASPECT_TYPES: { key: AspectType; name: string; symbol: string; angle: number }[] = [
  { key: 'conjunction', name: 'Conjunction', symbol: '☌', angle: 0 },
  { key: 'sextile', name: 'Sextile', symbol: '⚹', angle: 60 },
  { key: 'square', name: 'Square', symbol: '□', angle: 90 },
  { key: 'trine', name: 'Trine', symbol: '△', angle: 120 },
  { key: 'opposition', name: 'Opposition', symbol: '☍', angle: 180 },
];

export const getSignInfo = (sign: ZodiacSign) => {
  return ZODIAC_SIGNS.find(s => s.key === sign);
};

export const getBodyInfo = (body: CelestialBody) => {
  return CELESTIAL_BODIES.find(b => b.key === body);
};

export const getAspectInfo = (aspect: AspectType) => {
  return ASPECT_TYPES.find(a => a.key === aspect);
};

export const formatDegree = (degree: number): string => {
  const wholeDegrees = Math.floor(degree);
  const minutes = Math.round((degree - wholeDegrees) * 60);
  return `${wholeDegrees}°${minutes.toString().padStart(2, '0')}'`;
};
