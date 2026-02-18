'use client';

import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type CreatePosSaleInput = {
  customerEmail?: string;
  lines: {
    id: string;
    merchantId: string;
    forObject: { id: string; partition: string[] };
    variantId: string;
    descriptor: string;
    quantity: number;
    price: { amount: number; currency: string };
  }[];
  paymentMethod: string;
  notes?: string;
};

type PosOrderLine = {
  id: string;
  descriptor: string;
  quantity: number;
  price: { amount: number; currency: string };
  variantId: string;
};

export type PosOrderResponse = {
  code: string;
  success: boolean;
  message: string;
  order: {
    id: string;
    code: string;
    customerEmail?: string;
    source: string;
    lines: PosOrderLine[];
    payments: {
      code: string;
      method_description: string;
      date: string;
      charge: { subtotal: number; tax: number; paid: number };
    }[];
    createdDate: string;
  };
};

export const UseCreatePosSale = (merchantId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePosSaleInput) => {
      const response = await gql<{
        create_pos_sale: PosOrderResponse;
      }>(`
        mutation CreatePosSale($merchantId: ID!, $input: CreatePosSaleInput!) {
          create_pos_sale(merchantId: $merchantId, input: $input) {
            code
            success
            message
            order {
              id
              code
              customerEmail
              source
              lines {
                id
                descriptor
                quantity
                price { amount currency }
                variantId
              }
              payments {
                code
                method_description
                date
                charge { subtotal tax paid }
              }
              createdDate
            }
          }
        }
      `, { merchantId, input });

      if (!response.create_pos_sale.success) {
        throw new Error(response.create_pos_sale.message);
      }

      return response.create_pos_sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-overview', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items', merchantId] });
    },
  });
};
