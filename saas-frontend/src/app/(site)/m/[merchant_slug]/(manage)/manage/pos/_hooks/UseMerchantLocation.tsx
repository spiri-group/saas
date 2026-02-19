'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

type MerchantLocationData = {
  id: string;
  name: string;
  country: string;
  locations: {
    id: string;
    title: string;
    address: {
      formattedAddress: string;
    };
  }[];
};

export type MerchantLocationResult = {
  address: string | null;
  country: string;
};

export const UseMerchantLocation = (merchantId: string) => {
  return useQuery({
    queryKey: ['pos-merchant-location', merchantId],
    queryFn: async (): Promise<MerchantLocationResult> => {
      const response = await gql<{
        vendor: MerchantLocationData;
      }>(`
        query PosVendorLocation($id: ID!) {
          vendor(id: $id) {
            id
            name
            country
            locations {
              id
              title
              address {
                formattedAddress
              }
            }
          }
        }
      `, { id: merchantId });

      const locations = response.vendor?.locations || [];
      return {
        address: locations[0]?.address?.formattedAddress || null,
        country: response.vendor?.country || '',
      };
    },
    enabled: !!merchantId,
    staleTime: 5 * 60 * 1000,
  });
};
