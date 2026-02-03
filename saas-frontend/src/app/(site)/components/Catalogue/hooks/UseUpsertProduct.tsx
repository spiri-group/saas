import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface ProductInput {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  soldFromLocationId: string;
  productReturnPolicyId?: string;
  noRefunds?: boolean;
  code?: string;
  thumbnail?: any;
  properties?: any[];
  price?: any;
  pricingStrategy?: string;
  variants?: any[];
  is_ooak?: boolean;
  refundRules?: any;
}

interface UpsertProductResponse {
  upsert_product: {
    code: string;
    success: boolean;
    message: string;
    product: any;
  };
}

interface UpsertProductVariables {
  merchantId: string;
  product: ProductInput;
}

export const useUpsertProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, product }: UpsertProductVariables) => {
      const response = await gql<UpsertProductResponse>(`
        mutation UpsertProduct($merchantId: String!, $product: ProductInput!) {
          upsert_product(merchantId: $merchantId, product: $product) {
            code
            success
            message
            product {
              id
              name
              description
              slug
              thumbnail {
                title {
                  content
                }
                moreInfo {
                  content
                }
                media {
                  url
                  type
                }
              }
              variants {
                id
                name
                defaultPrice {
                  amount
                  currency
                }
              }
              ref {
                id
                partition
                container
              }
            }
          }
        }
      `, { merchantId, product });

      return response.upsert_product;
    },
    onSuccess: (data, variables) => {
      // Invalidate catalogue queries to refresh the listing
      queryClient.invalidateQueries({ queryKey: ['catalogue-listings', variables.merchantId] });
      queryClient.invalidateQueries({ queryKey: ['product', data.product.id] });
    },
  });
};

export default useUpsertProduct;
