'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useExploreFeed, FeedActivity } from '../_hooks/useFollowingFeed';
import FeedGrid from './FeedGrid';
import SwipeableCardStack from './SwipeableCardStack';
import useInterfaceSize from '@/components/ux/useInterfaceSize';

const CATEGORIES = [
    { id: undefined, label: 'All' },
    { id: 'readings', label: 'Readings' },
    { id: 'crystals', label: 'Crystals' },
    { id: 'events', label: 'Events' },
    { id: 'healing', label: 'Healing' },
    { id: 'journeys', label: 'Journeys' },
    { id: 'oracle', label: 'Oracle' },
    { id: 'video', label: 'Video' },
] as const;

export default function ExploreView() {
    const [category, setCategory] = useState<string | undefined>(undefined);
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useExploreFeed(category);
    const { isMobile } = useInterfaceSize();

    const activities = useMemo(
        () => data?.pages.flatMap(p => p.activities) ?? [],
        [data]
    );

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Category pills */}
            <div className="flex-shrink-0 px-4 py-3 overflow-x-auto">
                <div className="flex gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.label}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                                category === cat.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80',
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                </div>
            ) : activities.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-6">
                    <div className="text-center">
                        <p className="text-white/60 text-lg">Nothing to explore yet</p>
                        <p className="text-white/30 text-sm mt-2">Check back soon as practitioners and merchants join SpiriVerse.</p>
                    </div>
                </div>
            ) : isMobile ? (
                <SwipeableCardStack
                    activities={activities}
                    onLoadMore={handleLoadMore}
                    hasMore={!!hasNextPage}
                />
            ) : (
                <div className="flex-1 overflow-y-auto p-6">
                    <FeedGrid
                        activities={activities}
                        onLoadMore={handleLoadMore}
                        hasMore={!!hasNextPage}
                    />
                </div>
            )}
        </div>
    );
}
