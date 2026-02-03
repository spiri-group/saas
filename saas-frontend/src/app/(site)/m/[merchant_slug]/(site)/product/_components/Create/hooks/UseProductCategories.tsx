import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export interface ProductCategory {
  id: string;
  label: string;
  children?: ProductCategory[];
}

interface ProductCategoriesResponse {
  productCategories: ProductCategory[];
}

const UseProductCategories = (merchantId: string) => {
  return useQuery({
    queryKey: ['product-categories', merchantId],
    queryFn: async () => {
      const response = await gql<ProductCategoriesResponse>(`
        query GetProductCategories($merchantId: ID!) {
          productCategories(merchantId: $merchantId) {
            id
            label
            children {
              id
              label
              children {
                id
                label
                children {
                  id
                  label
                  children {
                    id
                    label
                    # Add more nesting levels as needed
                  }
                }
              }
            }
          }
        }
      `, { merchantId });
      return response.productCategories;
    },
    enabled: !!merchantId,
  });
};

export default UseProductCategories;