'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { MutationResponse } from '../types';

export const useUnblockPayouts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vendorId: string) => {
            const response = await gql<{
                unblockVendorPayouts: MutationResponse;
            }>(`
                mutation UnblockVendorPayouts($vendorId: String!) {
                    unblockVendorPayouts(vendorId: $vendorId) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId });
            return response.unblockVendorPayouts;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};

export const useForcePublish = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vendorId: string) => {
            const response = await gql<{
                forcePublishVendor: MutationResponse;
            }>(`
                mutation ForcePublishVendor($vendorId: String!) {
                    forcePublishVendor(vendorId: $vendorId) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId });
            return response.forcePublishVendor;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};

export const useResetBillingRetry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vendorId: string) => {
            const response = await gql<{
                resetVendorBillingRetry: MutationResponse;
            }>(`
                mutation ResetVendorBillingRetry($vendorId: String!) {
                    resetVendorBillingRetry(vendorId: $vendorId) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId });
            return response.resetVendorBillingRetry;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};
