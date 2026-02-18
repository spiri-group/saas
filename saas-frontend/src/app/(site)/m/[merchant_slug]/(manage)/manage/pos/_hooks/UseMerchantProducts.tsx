'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export type PosProduct = {
  id: string;
  name: string;
  slug?: string;
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
        catalogue: {
          listings: {
            id: string;
            name: string;
            slug: string;
            ref: { id: string; partition: string[]; container: string };
            url: string;
          }[];
          totalCount: number;
        };
      }>(`
        query PosCatalogue($vendorId: ID!, $search: String) {
          catalogue(vendorId: $vendorId, types: ["PRODUCT"], includeDrafts: false, search: $search, limit: 200) {
            listings {
              id
              name
              slug
              ref {
                id
                partition
                container
              }
              url
            }
            totalCount
          }
        }
      `, { vendorId: merchantId, search: search || null });

      const listings = response.catalogue.listings || [];

      // Fetch full product details with variants and inventory for each listing
      const products = await Promise.all(
        listings.map(async (listing) => {
          try {
            const productResp = await gql<{
              product: PosProduct;
            }>(`
              query PosProduct($id: String!, $vendorId: String!) {
                product(id: $id, vendorId: $vendorId) {
                  id
                  name
                  slug
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
            `, { id: listing.ref.id, vendorId: listing.ref.partition[0] });
            return productResp.product;
          } catch {
            return null;
          }
        })
      );

      return products.filter(Boolean) as PosProduct[];
    },
    enabled: !!merchantId,
    staleTime: 30_000,
  });
};
