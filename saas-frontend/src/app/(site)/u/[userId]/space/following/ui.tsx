'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useFollowingFeed } from './_hooks/useFollowingFeed';
import SwipeableCardStack from './_components/SwipeableCardStack';
import FeedGrid from './_components/FeedGrid';
import ExploreView from './_components/ExploreView';
import FollowingListView from './_components/FollowingListView';
import useInterfaceSize from '@/components/ux/useInterfaceSize';
import { Compass, Flame, Users } from 'lucide-react';

type Tab = 'feed' | 'explore' | 'following';

export default function FollowingUI() {
    const [activeTab, setActiveTab] = useState<Tab>('feed');

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Tab bar */}
            <div className="flex-shrink-0 border-b border-white/10">
                <div className="flex">
                    {([
                        { id: 'feed', label: 'Feed', icon: Flame },
                        { id: 'explore', label: 'Explore', icon: Compass },
                        { id: 'following', label: 'Following', icon: Users },
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative',
                                activeTab === id
                                    ? 'text-white'
                                    : 'text-white/40 hover:text-white/60',
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                            {activeTab === id && (
                                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-purple-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'feed' && <FeedView />}
                {activeTab === 'explore' && <ExploreView />}
                {activeTab === 'following' && <FollowingListView />}
            </div>
        </div>
    );
}

function FeedView() {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFollowingFeed();
    const { isMobile } = useInterfaceSize();

    const activities = useMemo(
        () => data?.pages.flatMap(p => p.activities) ?? [],
        [data]
    );

    const followingCount = data?.pages[0]?.followingCount ?? 0;

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <Flame className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-lg font-medium">
                        {followingCount === 0
                            ? 'Your feed is empty'
                            : 'No new updates'
                        }
                    </p>
                    <p className="text-white/30 text-sm mt-2">
                        {followingCount === 0
                            ? 'Follow practitioners and merchants to see their updates here.'
                            : 'Check back later for new content from the people you follow.'
                        }
                    </p>
                </div>
            </div>
        );
    }

    if (isMobile) {
        return (
            <SwipeableCardStack
                activities={activities}
                onLoadMore={handleLoadMore}
                hasMore={!!hasNextPage}
            />
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <FeedGrid
                activities={activities}
                onLoadMore={handleLoadMore}
                hasMore={!!hasNextPage}
            />
        </div>
    );
}
