'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { toast } from 'sonner';

type UpdateProductLiveStatusInput = {
  merchantId: string;
  productId: string;
  isLive: boolean;
};

type UpdateProductLiveStatusResponse = {
  code: string;
  success: boolean;
  message: string;
  product: {
    id: string;
    isLive: boolean;
  } | null;
  requiresOnboarding: boolean;
};

export const useUpdateProductLiveStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProductLiveStatusInput) => {
      const response = await gql<{
        update_product_live_status: UpdateProductLiveStatusResponse;
      }>(`
        mutation UpdateProductLiveStatus($merchantId: String!, $productId: String!, $isLive: Boolean!) {
          update_product_live_status(merchantId: $merchantId, productId: $productId, isLive: $isLive) {
            code
            success
            message
            product {
              id
              isLive
            }
            requiresOnboarding
          }
        }
      `, input);
      return response.update_product_live_status;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(variables.isLive ? "Product is now live!" : "Product moved to draft");

        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ['products-for-merchant', variables.merchantId]
        });
        queryClient.invalidateQueries({
          queryKey: ['catalogue', variables.merchantId]
        });
        queryClient.invalidateQueries({
          queryKey: ['product', variables.productId]
        });
      } else {
        // Handle the case where onboarding is required
        if (data.requiresOnboarding) {
          toast.error(data.message || "Please complete your bank account onboarding first");
        } else {
          toast.error(data.message || "Failed to update product status");
        }
      }
    },
    onError: (error) => {
      console.error('Failed to update product live status:', error);
      toast.error("Failed to update product status. Please try again.");
    },
  });
};

export default useUpdateProductLiveStatus;
