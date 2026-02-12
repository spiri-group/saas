'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type RetryPaymentResponse = {
    retryVendorPayment: {
        code: string;
        success: boolean;
        message: string;
        paymentSucceeded: boolean | null;
    };
};

export const useRetryVendorPayment = (vendorId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await gql<RetryPaymentResponse>(`
                mutation RetryVendorPayment($vendorId: ID!) {
                    retryVendorPayment(vendorId: $vendorId) {
                        code
                        success
                        message
                        paymentSucceeded
                    }
                }
            `, { vendorId });
            return response.retryVendorPayment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-subscription', vendorId] });
        },
    });
};
