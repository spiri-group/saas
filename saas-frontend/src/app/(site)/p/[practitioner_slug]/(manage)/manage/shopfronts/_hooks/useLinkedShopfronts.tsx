'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { toast } from 'sonner';
import { linked_shopfront_type } from '@/utils/spiriverse';

// Query to get practitioner's linked shopfronts
export const useLinkedShopfronts = (practitionerId: string) => {
    return useQuery({
        queryKey: ['linked-shopfronts', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                vendor: {
                    id: string;
                    practitioner: {
                        linkedShopfronts: linked_shopfront_type[] | null;
                    } | null;
                } | null;
            }>(`
                query GetLinkedShopfronts($practitionerId: String!) {
                    vendor(id: $practitionerId) {
                        id
                        practitioner {
                            linkedShopfronts {
                                merchantId
                                merchantSlug
                                merchantName
                                merchantLogo
                                displayOrder
                            }
                        }
                    }
                }
            `, { practitionerId });
            return response.vendor?.practitioner?.linkedShopfronts || [];
        },
        enabled: !!practitionerId,
    });
};

// Mutation to link a shopfront
export const useLinkShopfront = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, merchantId }: { practitionerId: string; merchantId: string }) => {
            const response = await gql<{
                link_shopfront_to_practitioner: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation LinkShopfront($practitionerId: ID!, $merchantId: ID!) {
                    link_shopfront_to_practitioner(practitionerId: $practitionerId, merchantId: $merchantId) {
                        code
                        success
                        message
                    }
                }
            `, { practitionerId, merchantId });
            return response.link_shopfront_to_practitioner;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success("Shopfront linked successfully");
                queryClient.invalidateQueries({ queryKey: ['linked-shopfronts', variables.practitionerId] });
            } else {
                toast.error(data.message || "Failed to link shopfront");
            }
        },
        onError: (error) => {
            console.error('Failed to link shopfront:', error);
            toast.error("Failed to link shopfront. Please try again.");
        },
    });
};

// Mutation to unlink a shopfront
export const useUnlinkShopfront = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, merchantId }: { practitionerId: string; merchantId: string }) => {
            const response = await gql<{
                unlink_shopfront_from_practitioner: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation UnlinkShopfront($practitionerId: ID!, $merchantId: ID!) {
                    unlink_shopfront_from_practitioner(practitionerId: $practitionerId, merchantId: $merchantId) {
                        code
                        success
                        message
                    }
                }
            `, { practitionerId, merchantId });
            return response.unlink_shopfront_from_practitioner;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success("Shopfront unlinked");
                queryClient.invalidateQueries({ queryKey: ['linked-shopfronts', variables.practitionerId] });
            } else {
                toast.error(data.message || "Failed to unlink shopfront");
            }
        },
        onError: (error) => {
            console.error('Failed to unlink shopfront:', error);
            toast.error("Failed to unlink shopfront. Please try again.");
        },
    });
};

// Mutation to update shopfront order
export const useUpdateShopfrontOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, merchantId, displayOrder }: { practitionerId: string; merchantId: string; displayOrder: number }) => {
            const response = await gql<{
                update_linked_shopfront_order: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation UpdateShopfrontOrder($practitionerId: ID!, $merchantId: ID!, $displayOrder: Int!) {
                    update_linked_shopfront_order(practitionerId: $practitionerId, merchantId: $merchantId, displayOrder: $displayOrder) {
                        code
                        success
                        message
                    }
                }
            `, { practitionerId, merchantId, displayOrder });
            return response.update_linked_shopfront_order;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['linked-shopfronts', variables.practitionerId] });
            } else {
                toast.error(data.message || "Failed to update order");
            }
        },
        onError: (error) => {
            console.error('Failed to update shopfront order:', error);
            toast.error("Failed to update order. Please try again.");
        },
    });
};
