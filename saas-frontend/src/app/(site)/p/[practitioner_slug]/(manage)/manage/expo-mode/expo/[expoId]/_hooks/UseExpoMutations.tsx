'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// ─── Add Expo Item ──────────────────────────────────────────────

type AddExpoItemInput = {
    expoId: string;
    vendorId: string;
    itemSource: string;
    serviceId?: string;
    itemName: string;
    itemDescription?: string;
    itemImage?: string;
    price: { amount: number; currency: string };
    trackInventory: boolean;
    quantityBrought?: number;
};

export const useAddExpoItem = (expoId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AddExpoItemInput) => {
            const response = await gql<{
                addExpoItem: { success: boolean; message: string; item: any };
            }>(`
                mutation AddExpoItem($input: AddExpoItemInput!) {
                    addExpoItem(input: $input) {
                        success
                        message
                        item {
                            id
                            itemName
                            price { amount currency }
                            trackInventory
                            quantityBrought
                            quantitySold
                            isActive
                            sortOrder
                        }
                    }
                }
            `, { input });
            return response.addExpoItem;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expo-items', expoId] });
        },
    });
};

// ─── Update Expo Item ──────────────────────────────────────────

type UpdateExpoItemInput = {
    itemId: string;
    expoId: string;
    itemName?: string;
    itemDescription?: string;
    itemImage?: string;
    price?: { amount: number; currency: string };
    quantityBrought?: number;
    isActive?: boolean;
};

export const useUpdateExpoItem = (expoId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateExpoItemInput) => {
            const response = await gql<{
                updateExpoItem: { success: boolean; message: string; item: any };
            }>(`
                mutation UpdateExpoItem($input: UpdateExpoItemInput!) {
                    updateExpoItem(input: $input) {
                        success
                        message
                        item { id itemName isActive }
                    }
                }
            `, { input });
            return response.updateExpoItem;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expo-items', expoId] });
        },
    });
};

// ─── Remove Expo Item ──────────────────────────────────────────

export const useRemoveExpoItem = (expoId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (itemId: string) => {
            const response = await gql<{
                removeExpoItem: { success: boolean; message: string };
            }>(`
                mutation RemoveExpoItem($itemId: ID!, $expoId: ID!) {
                    removeExpoItem(itemId: $itemId, expoId: $expoId) {
                        success
                        message
                    }
                }
            `, { itemId, expoId });
            return response.removeExpoItem;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expo-items', expoId] });
        },
    });
};

// ─── Expo Status Mutations ─────────────────────────────────────

export const useGoLiveExpo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ expoId, vendorId }: { expoId: string; vendorId: string }) => {
            const response = await gql<{
                goLiveExpo: { success: boolean; message: string; expo: any };
            }>(`
                mutation GoLiveExpo($expoId: ID!, $vendorId: ID!) {
                    goLiveExpo(expoId: $expoId, vendorId: $vendorId) {
                        success
                        message
                        expo { id expoStatus goLiveAt }
                    }
                }
            `, { expoId, vendorId });
            return response.goLiveExpo;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['expo', vars.expoId] });
            queryClient.invalidateQueries({ queryKey: ['expos', vars.vendorId] });
        },
    });
};

export const usePauseExpo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ expoId, vendorId }: { expoId: string; vendorId: string }) => {
            const response = await gql<{
                pauseExpo: { success: boolean; message: string; expo: any };
            }>(`
                mutation PauseExpo($expoId: ID!, $vendorId: ID!) {
                    pauseExpo(expoId: $expoId, vendorId: $vendorId) {
                        success
                        message
                        expo { id expoStatus pausedAt }
                    }
                }
            `, { expoId, vendorId });
            return response.pauseExpo;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['expo', vars.expoId] });
            queryClient.invalidateQueries({ queryKey: ['expos', vars.vendorId] });
        },
    });
};

export const useResumeExpo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ expoId, vendorId }: { expoId: string; vendorId: string }) => {
            const response = await gql<{
                resumeExpo: { success: boolean; message: string; expo: any };
            }>(`
                mutation ResumeExpo($expoId: ID!, $vendorId: ID!) {
                    resumeExpo(expoId: $expoId, vendorId: $vendorId) {
                        success
                        message
                        expo { id expoStatus }
                    }
                }
            `, { expoId, vendorId });
            return response.resumeExpo;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['expo', vars.expoId] });
            queryClient.invalidateQueries({ queryKey: ['expos', vars.vendorId] });
        },
    });
};

export const useEndExpo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ expoId, vendorId }: { expoId: string; vendorId: string }) => {
            const response = await gql<{
                endExpo: { success: boolean; message: string; expo: any };
            }>(`
                mutation EndExpo($expoId: ID!, $vendorId: ID!) {
                    endExpo(expoId: $expoId, vendorId: $vendorId) {
                        success
                        message
                        expo { id expoStatus endedAt }
                    }
                }
            `, { expoId, vendorId });
            return response.endExpo;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['expo', vars.expoId] });
            queryClient.invalidateQueries({ queryKey: ['expos', vars.vendorId] });
        },
    });
};

// ─── Log Walk-Up Sale ──────────────────────────────────────────

type LogExpoSaleInput = {
    expoId: string;
    vendorId: string;
    items: { itemId: string; quantity: number }[];
    paymentMethod: string;
    customerName?: string;
    customerEmail?: string;
};

export const useLogExpoSale = (expoId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: LogExpoSaleInput) => {
            const response = await gql<{
                logExpoSale: { success: boolean; message: string; sale: any };
            }>(`
                mutation LogExpoSale($input: LogExpoSaleInput!) {
                    logExpoSale(input: $input) {
                        success
                        message
                        sale {
                            id
                            saleNumber
                            saleChannel
                            paymentMethod
                            customerName
                            subtotal { amount currency }
                            saleStatus
                            createdAt
                            items {
                                itemId
                                itemName
                                quantity
                                lineTotal { amount currency }
                            }
                        }
                    }
                }
            `, { input });
            return response.logExpoSale;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expo-sales', expoId] });
            queryClient.invalidateQueries({ queryKey: ['expo-items', expoId] });
        },
    });
};
