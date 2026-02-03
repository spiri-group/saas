import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export interface MerchantTypeNode {
  id: string;
  label: string;
  children?: MerchantTypeNode[];
}

interface MerchantTypesResponse {
  merchantTypes: MerchantTypeNode[];
}

const UseMerchantTypes = () => {
  return useQuery({
    queryKey: ['merchant-types'],
    queryFn: async () => {
      const response = await gql<MerchantTypesResponse>(`
        query GetMerchantTypes {
          merchantTypes(defaultLocale: "EN") {
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
                }
              }
            }
          }
        }
      `);
      return response.merchantTypes;
    },
  });
};

export default UseMerchantTypes;
