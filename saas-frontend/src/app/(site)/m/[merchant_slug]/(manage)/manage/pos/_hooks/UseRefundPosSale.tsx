'use client';

import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type RefundPosSaleInput = {
  orderId: string;
  lines: { lineId: string; quantity: number }[];
  reason?: string;
};

export const UseRefundPosSale = (merchantId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RefundPosSaleInput) => {
      const response = await gql<{
        refund_pos_sale: {
          code: string;
          success: boolean;
          message: string;
          order: { id: string };
        };
      }>(`
        mutation RefundPosSale($input: RefundPosSaleInput!) {
          refund_pos_sale(input: $input) {
            code
            success
            message
            order { id }
          }
        }
      `, { input });

      if (!response.refund_pos_sale.success) {
        throw new Error(response.refund_pos_sale.message);
      }

      return response.refund_pos_sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['pos-recent-sales', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-overview', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items', merchantId] });
    },
  });
};
