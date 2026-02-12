'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type DowngradeResponse = {
    requestVendorDowngrade: {
        code: string;
        success: boolean;
        message: string;
        effectiveAt: string | null;
    };
};

type CancelDowngradeResponse = {
    cancelVendorDowngrade: {
        code: string;
        success: boolean;
        message: string;
    };
};

export const useRequestVendorDowngrade = (vendorId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: { targetTier: string }) => {
            const response = await gql<DowngradeResponse>(`
                mutation RequestVendorDowngrade($vendorId: ID!, $targetTier: String!) {
                    requestVendorDowngrade(vendorId: $vendorId, targetTier: $targetTier) {
                        code
                        success
                        message
                        effectiveAt
                    }
                }
            `, { vendorId, ...args });
            return response.requestVendorDowngrade;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-subscription', vendorId] });
        },
    });
};

export const useCancelVendorDowngrade = (vendorId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await gql<CancelDowngradeResponse>(`
                mutation CancelVendorDowngrade($vendorId: ID!) {
                    cancelVendorDowngrade(vendorId: $vendorId) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId });
            return response.cancelVendorDowngrade;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-subscription', vendorId] });
        },
    });
};
