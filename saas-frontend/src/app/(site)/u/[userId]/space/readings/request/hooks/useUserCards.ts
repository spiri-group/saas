import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface SavedCard {
  id: string;
  paymentMethodId: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  funding: string;
  country: string | null;
}

interface MeResponse {
  me: {
    id: string;
    cards: SavedCard[];
  };
}

export const useUserCards = () => {
  return useQuery({
    queryKey: ['user-cards'],
    queryFn: async (): Promise<SavedCard[]> => {
      const response = await gql<MeResponse>(`
        query GetMyCards {
          me {
            id
            cards {
              id
              paymentMethodId
              brand
              last4
              exp_month
              exp_year
              funding
              country
            }
          }
        }
      `);
      return response.me?.cards || [];
    },
  });
};
