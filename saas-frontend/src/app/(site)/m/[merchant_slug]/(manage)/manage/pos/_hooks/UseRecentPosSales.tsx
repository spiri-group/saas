'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export type PosSaleOrder = {
  id: string;
  code: string;
  customerEmail?: string;
  source: string;
  paid_status: string;
  voidedAt?: string;
  notes?: string;
  lines: {
    id: string;
    descriptor: string;
    quantity: number;
    price: { amount: number; currency: string };
    variantId: string;
    refund_quantity?: number;
    refund_status?: string;
  }[];
  payments: {
    code: string;
    method_description: string;
    date: string;
    charge: { subtotal: number; tax: number; paid: number };
  }[];
  posDiscount?: {
    type: string;
    value: number;
    reason?: string;
    amount: number;
  };
  posTax?: {
    rate: number;
    label: string;
    amount: number;
  };
  posRefunds?: {
    id: string;
    date: string;
    amount: number;
    currency: string;
    reason?: string;
    lines: { lineId: string; quantity: number }[];
  }[];
  createdDate: string;
};

export const UseRecentPosSales = (merchantId: string) => {
  return useQuery({
    queryKey: ['pos-recent-sales', merchantId],
    queryFn: async () => {
      const response = await gql<{
        posSales: PosSaleOrder[];
      }>(`
        query RecentPosSales($vendorId: ID!, $limit: Int) {
          posSales(vendorId: $vendorId, limit: $limit) {
            id
            code
            customerEmail
            source
            paid_status
            voidedAt
            notes
            lines {
              id
              descriptor
              quantity
              price { amount currency }
              variantId
              refund_quantity
              refund_status
            }
            payments {
              code
              method_description
              date
              charge { subtotal tax paid }
            }
            posDiscount {
              type
              value
              reason
              amount
            }
            posTax {
              rate
              label
              amount
            }
            posRefunds {
              id
              date
              amount
              currency
              reason
              lines { lineId quantity }
            }
            createdDate
          }
        }
      `, { vendorId: merchantId, limit: 20 });

      return response.posSales || [];
    },
    enabled: !!merchantId,
    refetchInterval: 30_000,
  });
};
