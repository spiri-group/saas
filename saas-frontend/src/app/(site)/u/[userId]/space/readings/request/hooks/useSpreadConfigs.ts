import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { SpreadConfig } from '../types';

export const useSpreadConfigs = () => {
  return useQuery({
    queryKey: ['spread-configs'],
    queryFn: async () => {
      const response = await gql<{
        spreadConfigs: SpreadConfig[];
      }>(`
        query GetSpreadConfigs {
          spreadConfigs {
            type
            label
            cardCount
            price
            description
          }
        }
      `);
      return response.spreadConfigs;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour - configs rarely change
  });
};
