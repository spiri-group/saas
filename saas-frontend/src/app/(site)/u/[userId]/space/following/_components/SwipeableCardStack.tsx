'use client';

import { useRef, useEffect, useCallback } from 'react';
import FeedActivityCard from './cards/FeedActivityCard';
import { FeedActivity } from '../_hooks/useFollowingFeed';

type Props = {
    activities: FeedActivity[];
    onLoadMore: () => void;
    hasMore: boolean;
};

/**
 * Full-screen vertical snap scroll feed for mobile.
 * Each card fills the viewport (minus header).
 */
export default function SwipeableCardStack({ activities, onLoadMore, hasMore }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Infinite scroll — trigger load more when sentinel enters viewport
    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onLoadMore();
            },
            { root: containerRef.current, rootMargin: '200px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto snap-y snap-mandatory"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {activities.map((activity) => (
                <div
                    key={activity.id}
                    className="snap-start h-[calc(100dvh-112px)]"
                >
                    <FeedActivityCard activity={activity} variant="snap" />
                </div>
            ))}
            {hasMore && (
                <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                </div>
            )}
        </div>
    );
}
