'use client';

import { useRef, useEffect } from 'react';
import FeedActivityCard from './cards/FeedActivityCard';
import { FeedActivity } from '../_hooks/useFollowingFeed';

type Props = {
    activities: FeedActivity[];
    onLoadMore: () => void;
    hasMore: boolean;
};

/**
 * Magazine-style masonry grid for desktop.
 */
export default function FeedGrid({ activities, onLoadMore, hasMore }: Props) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onLoadMore();
            },
            { rootMargin: '400px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {activities.map((activity) => (
                    <FeedActivityCard key={activity.id} activity={activity} variant="grid" />
                ))}
            </div>
            {hasMore && (
                <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                </div>
            )}
        </div>
    );
}
