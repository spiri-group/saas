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

export const usePurgeVendorAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ vendorId, confirmName }: { vendorId: string; confirmName: string }) => {
            const response = await gql<{
                purgeVendorAccount: MutationResponse;
            }>(`
                mutation PurgeVendorAccount($vendorId: String!, $confirmName: String!) {
                    purgeVendorAccount(vendorId: $vendorId, confirmName: $confirmName) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId, confirmName });
            return response.purgeVendorAccount;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};

export const useBlockVendorAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ vendorId, reason }: { vendorId: string; reason?: string }) => {
            const response = await gql<{
                blockVendorAccount: MutationResponse;
            }>(`
                mutation BlockVendorAccount($vendorId: String!, $reason: String) {
                    blockVendorAccount(vendorId: $vendorId, reason: $reason) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId, reason });
            return response.blockVendorAccount;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};

export const useUnblockVendorAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vendorId: string) => {
            const response = await gql<{
                unblockVendorAccount: MutationResponse;
            }>(`
                mutation UnblockVendorAccount($vendorId: String!) {
                    unblockVendorAccount(vendorId: $vendorId) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId });
            return response.unblockVendorAccount;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-vendor-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};
