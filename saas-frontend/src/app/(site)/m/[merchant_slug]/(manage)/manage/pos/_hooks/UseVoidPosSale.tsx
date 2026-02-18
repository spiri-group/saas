'use client';

import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const UseVoidPosSale = (merchantId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await gql<{
        void_pos_sale: {
          code: string;
          success: boolean;
          message: string;
        };
      }>(`
        mutation VoidPosSale($orderId: ID!) {
          void_pos_sale(orderId: $orderId) {
            code
            success
            message
          }
        }
      `, { orderId });

      if (!response.void_pos_sale.success) {
        throw new Error(response.void_pos_sale.message);
      }

      return response.void_pos_sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-recent-sales', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['pos-products', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-overview', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items', merchantId] });
    },
  });
};
