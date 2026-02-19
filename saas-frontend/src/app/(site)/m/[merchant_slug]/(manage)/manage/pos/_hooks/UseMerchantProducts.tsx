'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export type PosProduct = {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
  defaultVariantId: string;
  variants: PosVariant[];
  is_ooak?: boolean;
};

export type PosVariant = {
  id: string;
  name: string;
  code?: string;
  images: { url: string; title?: string }[];
  defaultPrice: {
    amount: number;
    currency: string;
  };
  inventory: {
    variant_id: string;
    product_id: string;
    track_inventory: boolean;
    qty_on_hand: number;
    qty_committed: number;
    low_stock_threshold?: number;
  } | null;
};

export const UseMerchantProducts = (merchantId: string, search?: string) => {
  return useQuery({
    queryKey: ['pos-products', merchantId, search],
    queryFn: async () => {
      const response = await gql<{
        posProducts: PosProduct[];
      }>(`
        query PosProducts($vendorId: String!, $search: String) {
          posProducts(vendorId: $vendorId, search: $search) {
            id
            name
            slug
            category
            ref { id partition container }
            defaultVariantId
            is_ooak
            variants {
              id
              name
              code
              images { url title }
              defaultPrice { amount currency }
              inventory {
                variant_id
                product_id
                track_inventory
                qty_on_hand
                qty_committed
                low_stock_threshold
              }
            }
          }
        }
      `, { vendorId: merchantId, search: search || null });

      return response.posProducts || [];
    },
    enabled: !!merchantId,
    staleTime: 30_000,
  });
};
