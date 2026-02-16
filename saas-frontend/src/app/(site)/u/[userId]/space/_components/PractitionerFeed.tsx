'use client';

import { useState } from 'react';
import { Loader2, Flame, Users, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import FeedPost from '@/app/(site)/components/Home/Feed/FeedPost';
import FeedFlipboard from '@/app/(site)/components/Home/Feed/FeedFlipboard';
import RecommendedVendors from '@/app/(site)/components/Home/Feed/RecommendedVendors';
import { useMyFeed, useRecommendedVendors } from '@/app/(site)/components/Home/hooks/UseFeed';
import type { FeedPost as FeedPostType } from '@/app/(site)/components/Home/hooks/UseFeed';

const COLLAPSED_PREVIEW_COUNT = 3;

export default function PractitionerFeed() {
  const [flipboardOpen, setFlipboardOpen] = useState(false);

  const {
    data: feedData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: feedLoading,
  } = useMyFeed();

  const feedPages = feedData?.pages || [];
  const allPosts: FeedPostType[] = feedPages.flatMap(page => page.posts);
  const hasPosts = allPosts.length > 0;
  const previewPosts = allPosts.slice(0, COLLAPSED_PREVIEW_COUNT);
  const remainingCount = Math.max(0, allPosts.length - COLLAPSED_PREVIEW_COUNT);

  // Unique vendor avatars for the summary strip
  const uniqueVendors = Array.from(
    new Map(allPosts.map(p => [p.vendorId, { name: p.vendorName, logo: p.vendorLogo }])).values()
  ).slice(0, 5);

  const { data: recommendedVendors, isLoading: recommendedLoading } = useRecommendedVendors(6);

  const openDigest = () => setFlipboardOpen(true);

  if (feedLoading) {
    return (
      <div className="flex justify-center py-12" data-testid="feed-loading">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div data-testid="practitioner-feed" className="h-full flex flex-col">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-medium text-slate-400">Your Feed</h2>
        </div>
        {hasPosts && (
          <button
            onClick={() => openDigest()}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            data-testid="feed-open-flipboard"
          >
            Open feed
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasPosts ? (
        <>
          {/* Collapsed preview — stacked avatar strip + tap to open */}
          <button
            onClick={() => openDigest()}
            className="w-full mb-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all group cursor-pointer"
            data-testid="feed-summary-card"
          >
            <div className="flex items-center gap-3">
              {/* Stacked avatars */}
              <div className="flex -space-x-2 flex-shrink-0">
                {uniqueVendors.map((vendor, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full overflow-hidden bg-white/20 border-2 border-slate-900 flex-shrink-0"
                  >
                    {vendor.logo?.url ? (
                      <Image src={vendor.logo.url} alt={vendor.name} width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-[10px] font-medium">
                        {vendor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white/80 text-sm font-medium">
                  {allPosts.length} update{allPosts.length !== 1 ? 's' : ''}
                </p>
                <p className="text-white/40 text-xs truncate">
                  from {uniqueVendors.length} practitioner{uniqueVendors.length !== 1 ? 's' : ''} you follow
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
            </div>
          </button>

          {/* Preview cards — first few posts collapsed */}
          <div className="flex flex-col gap-3">
            {previewPosts.map((post, idx) => (
              <FeedPost key={`${post.vendorId}-${idx}`} post={post} onClick={() => openDigest()} />
            ))}
          </div>

          {/* "See more" prompt */}
          {remainingCount > 0 && (
            <button
              onClick={() => openDigest()}
              className="w-full mt-3 py-3 text-center text-sm text-purple-400 hover:text-purple-300 transition-colors rounded-lg hover:bg-white/5"
              data-testid="feed-see-more"
            >
              +{remainingCount} more update{remainingCount !== 1 ? 's' : ''}
            </button>
          )}

          {/* Suggested for you */}
          {recommendedVendors && recommendedVendors.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium text-slate-400">Suggested for you</h3>
              </div>
              <RecommendedVendors vendors={recommendedVendors} layout="grid" />
            </div>
          )}

          {/* Digest overlay */}
          <FeedFlipboard
            posts={allPosts}
            open={flipboardOpen}
            onClose={() => setFlipboardOpen(false)}
            onLoadMore={hasNextPage ? () => fetchNextPage() : undefined}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
          />
        </>
      ) : (
        /* Empty state — discovery experience */
        <div data-testid="feed-empty-state" className="flex-1 flex flex-col">
          <div className="text-center py-8 px-4 rounded-xl bg-white/5 border border-white/10 mb-6 flex-1 flex flex-col items-center justify-center">
            <Flame className="w-8 h-8 text-purple-400/60 mx-auto mb-3" />
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
