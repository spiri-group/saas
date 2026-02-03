import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface BirthLocation {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface PlanetPosition {
  body: string;
  sign: string;
  degree: number;
  house?: number;
  retrograde: boolean;
}

interface BirthChart {
  id: string;
  userId: string;
  birthDate: string;
  birthTimePrecision: 'exact' | 'approximate' | 'unknown';
  birthTime?: string;
  birthTimeApproximate?: string;
  birthLocation: BirthLocation;
  sunSign: string;
  moonSign: string;
  risingSign?: string;
  planets: PlanetPosition[];
  createdAt: string;
}

interface User {
  id: string;
  firstname?: string;
  lastname?: string;
  email: string;
}

interface CustomerBirthChartData {
  user: User | null;
  birthChart: BirthChart | null;
}

export const useCustomerBirthChart = (customerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['customer-birth-chart', customerId],
    queryFn: async (): Promise<CustomerBirthChartData> => {
      // Fetch user info and birth chart in parallel
      const response = await gql<{
        user: User | null;
        birthChart: BirthChart | null;
      }>(`
        query GetCustomerBirthChart($userId: String!, $birthChartUserId: ID!) {
          user(id: $userId) {
            id
            firstname
            lastname
            email
          }
          birthChart(userId: $birthChartUserId) {
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
            }
            sunSign
            moonSign
            risingSign
            planets {
              body
              sign
              degree
              house
              retrograde
            }
            createdAt
          }
        }
      `, { userId: customerId, birthChartUserId: customerId });

      return {
        user: response.user,
        birthChart: response.birthChart
      };
    },
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export type { BirthChart, User, CustomerBirthChartData, BirthLocation, PlanetPosition };
