'use client';

import { Loader2, Rss, Users } from 'lucide-react';
import FeedList from '@/app/(site)/components/Home/Feed/FeedList';
import RecommendedVendors from '@/app/(site)/components/Home/Feed/RecommendedVendors';
import { useMyFeed, useRecommendedVendors } from '@/app/(site)/components/Home/hooks/UseFeed';

export default function PractitionerFeed() {
  const {
    data: feedData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: feedLoading,
  } = useMyFeed();

  const feedPages = feedData?.pages || [];
  const hasPosts = feedPages.some(page => page.posts.length > 0);

  const { data: recommendedVendors, isLoading: recommendedLoading } = useRecommendedVendors(6);

  if (feedLoading) {
    return (
      <div className="flex justify-center py-12" data-testid="feed-loading">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div data-testid="practitioner-feed">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Rss className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-medium text-slate-400">Your Feed</h2>
      </div>

      {hasPosts ? (
        <>
          {/* Main feed */}
          <FeedList
            pages={feedPages}
            hasNextPage={hasNextPage ?? false}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />

          {/* Discover more - inline after feed content */}
          {recommendedVendors && recommendedVendors.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium text-slate-400">Suggested for you</h3>
              </div>
              <RecommendedVendors vendors={recommendedVendors} layout="horizontal" />
            </div>
          )}
        </>
      ) : (
        /* Empty state - discovery experience */
        <div data-testid="feed-empty-state">
          <div className="text-center py-8 px-4 rounded-xl bg-white/5 border border-white/10 mb-6">
            <Rss className="w-8 h-8 text-purple-400/60 mx-auto mb-3" />
            <p className="text-white/80 text-sm font-medium mb-1">Your feed is empty</p>
            <p className="text-white/40 text-xs">
              Follow practitioners and merchants to see their video updates and daily oracle messages here.
            </p>
          </div>

          {recommendedLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400/50" />
            </div>
          ) : recommendedVendors && recommendedVendors.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium text-slate-400">Discover practitioners &amp; merchants</h3>
              </div>
              <RecommendedVendors vendors={recommendedVendors} layout="grid" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
