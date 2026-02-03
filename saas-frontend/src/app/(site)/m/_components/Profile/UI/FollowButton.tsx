'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useIsFollowing, useFollowMerchant, useUnfollowMerchant, useFollowerCount } from '../../../_hooks/UseFollow';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
    merchantId: string;
    showCount?: boolean;
    variant?: 'default' | 'compact' | 'icon-only';
    className?: string;
}

export default function FollowButton({
    merchantId,
    showCount = true,
    variant = 'default',
    className
}: FollowButtonProps) {
    const { data: isFollowing, isLoading: isCheckingFollow } = useIsFollowing(merchantId);
    const { data: followerCount } = useFollowerCount(merchantId);
    const followMutation = useFollowMerchant();
    const unfollowMutation = useUnfollowMerchant();

    const isLoading = isCheckingFollow || followMutation.isPending || unfollowMutation.isPending;

    const handleToggleFollow = () => {
        if (isFollowing) {
            unfollowMutation.mutate(merchantId);
        } else {
            followMutation.mutate(merchantId);
        }
    };

    const formatCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    if (variant === 'icon-only') {
        return (
            <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFollow}
                disabled={isLoading}
                className={cn(
                    "rounded-full transition-all",
                    isFollowing
                        ? "text-red-500 hover:text-red-600"
                        : "text-merchant-default-foreground/70 hover:text-red-500",
                    className
                )}
                title={isFollowing ? "Unfollow" : "Follow"}
            >
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : isFollowing ? (
                    <Heart className="h-5 w-5 fill-current" />
                ) : (
                    <Heart className="h-5 w-5" />
                )}
            </Button>
        );
    }

    if (variant === 'compact') {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleFollow}
                    disabled={isLoading}
                    className={cn(
                        "rounded-full px-3 transition-all",
                        isFollowing
                            ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            : "text-merchant-default-foreground/70 hover:text-red-500 hover:bg-red-500/10"
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : isFollowing ? (
                        <Heart className="h-4 w-4 fill-current mr-1" />
                    ) : (
                        <Heart className="h-4 w-4 mr-1" />
                    )}
                    {isFollowing ? 'Following' : 'Follow'}
                </Button>
                {showCount && followerCount !== undefined && (
                    <span className="text-sm text-merchant-default-foreground/60">
                        {formatCount(followerCount)} {followerCount === 1 ? 'follower' : 'followers'}
                    </span>
                )}
            </div>
        );
    }

    // Default variant
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <Button
                variant={isFollowing ? "outline" : "default"}
                onClick={handleToggleFollow}
                disabled={isLoading}
                className={cn(
                    "w-full transition-all",
                    isFollowing
                        ? "border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500"
                        : "bg-merchant-primary text-merchant-primary-foreground hover:opacity-90"
                )}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isFollowing ? 'Unfollowing...' : 'Following...'}
                    </>
                ) : isFollowing ? (
                    <>
                        <Heart className="h-4 w-4 fill-current mr-2" />
                        Following
                    </>
                ) : (
                    <>
                        <Heart className="h-4 w-4 mr-2" />
                        Follow
                    </>
                )}
            </Button>
            {showCount && followerCount !== undefined && (
                <p className="text-center text-sm text-merchant-default-foreground/60">
                    {formatCount(followerCount)} {followerCount === 1 ? 'follower' : 'followers'}
                </p>
            )}
        </div>
    );
}
