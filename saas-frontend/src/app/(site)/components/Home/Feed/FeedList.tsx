'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import FeedPost from './FeedPost';
import type { FeedPost as FeedPostType } from '../hooks/UseFeed';

interface FeedListProps {
  pages: Array<{ posts: FeedPostType[]; hasMore: boolean }>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export default function FeedList({ pages, hasNextPage, isFetchingNextPage, fetchNextPage }: FeedListProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allPosts = pages.flatMap(page => page.posts);

  if (allPosts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="feed-list">
      {allPosts.map((post, idx) => (
        <FeedPost key={`${post.vendorId}-${idx}`} post={post} />
      ))}

      {/* Infinite scroll trigger */}
      <div ref={observerRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      )}
    </div>
  );
}
