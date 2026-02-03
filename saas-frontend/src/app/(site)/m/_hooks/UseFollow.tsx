'use client';

import { gql } from "@/lib/services/gql";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Check if current user is following a merchant
export const useIsFollowing = (merchantId: string) => {
    return useQuery({
        queryKey: ['is-following', merchantId],
        queryFn: async () => {
            const resp = await gql<{
                isFollowing: boolean
            }>(`
                query IsFollowing($merchantId: ID!) {
                    isFollowing(merchantId: $merchantId)
                }
            `, { merchantId });
            return resp.isFollowing;
        },
        enabled: !!merchantId
    });
};

// Get follower count for a merchant
export const useFollowerCount = (merchantId: string) => {
    return useQuery({
        queryKey: ['follower-count', merchantId],
        queryFn: async () => {
            const resp = await gql<{
                vendor: { followerCount: number }
            }>(`
                query GetFollowerCount($merchantId: String!) {
                    vendor(id: $merchantId) {
                        followerCount
                    }
                }
            `, { merchantId });
            return resp.vendor?.followerCount || 0;
        },
        enabled: !!merchantId
    });
};

// Follow a merchant
export const useFollowMerchant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (merchantId: string) => {
            const resp = await gql<{
                followMerchant: {
                    success: boolean
                    isFollowing: boolean
                    followerCount: number
                    message: string
                }
            }>(`
                mutation FollowMerchant($merchantId: ID!) {
                    followMerchant(merchantId: $merchantId) {
                        success
                        isFollowing
                        followerCount
                        message
                    }
                }
            `, { merchantId });
            return resp.followMerchant;
        },
        onSuccess: (data, merchantId) => {
            // Update the isFollowing cache
            queryClient.setQueryData(['is-following', merchantId], data.isFollowing);
            // Update the follower count cache
            queryClient.setQueryData(['follower-count', merchantId], data.followerCount);
            // Invalidate vendor info to refresh any other displays
            queryClient.invalidateQueries({ queryKey: ['vendorInformation', merchantId] });
            // Refresh feed and recommendations
            queryClient.invalidateQueries({ queryKey: ['my-feed'] });
            queryClient.invalidateQueries({ queryKey: ['recommended-vendors'] });
        }
    });
};

// Unfollow a merchant
export const useUnfollowMerchant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (merchantId: string) => {
            const resp = await gql<{
                unfollowMerchant: {
                    success: boolean
                    isFollowing: boolean
                    followerCount: number
                    message: string
                }
            }>(`
                mutation UnfollowMerchant($merchantId: ID!) {
                    unfollowMerchant(merchantId: $merchantId) {
                        success
                        isFollowing
                        followerCount
                        message
                    }
                }
            `, { merchantId });
            return resp.unfollowMerchant;
        },
        onSuccess: (data, merchantId) => {
            // Update the isFollowing cache
            queryClient.setQueryData(['is-following', merchantId], data.isFollowing);
            // Update the follower count cache
            queryClient.setQueryData(['follower-count', merchantId], data.followerCount);
            // Invalidate vendor info to refresh any other displays
            queryClient.invalidateQueries({ queryKey: ['vendorInformation', merchantId] });
            // Refresh feed and recommendations
            queryClient.invalidateQueries({ queryKey: ['my-feed'] });
            queryClient.invalidateQueries({ queryKey: ['recommended-vendors'] });
        }
    });
};

// Get list of merchants the current user follows
export const useMyFollowing = () => {
    return useQuery({
        queryKey: ['my-following'],
        queryFn: async () => {
            const resp = await gql<{
                myFollowing: Array<{
                    merchantId: string
                    merchantName: string
                    merchantSlug: string
                    merchantLogo: { url: string } | null
                    followedAt: string
                }>
            }>(`
                query MyFollowing {
                    myFollowing {
                        merchantId
                        merchantName
                        merchantSlug
                        merchantLogo {
                            url
                        }
                        followedAt
                    }
                }
            `, {});
            return resp.myFollowing;
        }
    });
};
