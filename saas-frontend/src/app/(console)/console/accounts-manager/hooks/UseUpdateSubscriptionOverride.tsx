'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { SubscriptionOverrideInput } from '../types';

interface UpdateSubscriptionOverrideVars {
    vendorId: string;
    input: SubscriptionOverrideInput;
}

interface UpdateSubscriptionOverrideResponse {
    code: string;
    success: boolean;
    message: string;
}

const useUpdateSubscriptionOverride = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vars: UpdateSubscriptionOverrideVars) => {
            const response = await gql<{
                updateVendorSubscriptionOverride: UpdateSubscriptionOverrideResponse;
            }>(`
                mutation UpdateVendorSubscriptionOverride(
                    $vendorId: String!
                    $input: SubscriptionOverrideInput!
                ) {
                    updateVendorSubscriptionOverride(
                        vendorId: $vendorId
                        input: $input
                    ) {
                        code
                        success
                        message
                    }
                }
            `, vars);
            return response.updateVendorSubscriptionOverride;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};

export default useUpdateSubscriptionOverride;
