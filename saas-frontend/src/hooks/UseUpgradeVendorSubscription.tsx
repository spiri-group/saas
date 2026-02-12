'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type UpgradeResponse = {
    upgradeVendorSubscription: {
        code: string;
        success: boolean;
        message: string;
        prorationCharged: number | null;
        newTier: string | null;
    };
};

export const useUpgradeVendorSubscription = (vendorId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: { targetTier: string; targetInterval?: string }) => {
            const response = await gql<UpgradeResponse>(`
                mutation UpgradeVendorSubscription($vendorId: ID!, $targetTier: String!, $targetInterval: String) {
                    upgradeVendorSubscription(vendorId: $vendorId, targetTier: $targetTier, targetInterval: $targetInterval) {
                        code
                        success
                        message
                        prorationCharged
                        newTier
                    }
                }
            `, { vendorId, ...args });
            return response.upgradeVendorSubscription;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-subscription', vendorId] });
        },
    });
};
