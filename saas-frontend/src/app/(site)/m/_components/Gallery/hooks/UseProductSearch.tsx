import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface SearchProduct {
  id: string;
  title: string;
  thumbnailUrl?: string;
  price?: {
    amount: number;
    currency: string;
  };
}

export const useProductSearch = (merchantId: string, searchQuery?: string) => {
  return useQuery({
    queryKey: ['product-search', merchantId, searchQuery],
    queryFn: async () => {
      const response = await gql<{
        searchProducts: SearchProduct[];
      }>(`
        query SearchProducts($merchantId: ID!, $query: String) {
          searchProducts(merchantId: $merchantId, query: $query) {
            id
            title
            thumbnailUrl
            price {
              amount
              currency
            }
          }
        }
      `, { merchantId, query: searchQuery });
      return response.searchProducts;
    },
    enabled: !!merchantId && !!searchQuery && searchQuery.length > 0,
  });
};