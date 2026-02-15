'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Mic, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { VendorDocType } from '@/utils/spiriverse';
import type { FeedPost } from '../hooks/UseFeed';

interface FeedFlipboardProps {
  posts: FeedPost[];
  open: boolean;
  onClose: () => void;
  startIndex?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function getVendorProfileUrl(slug: string, docType: string): string {
  return docType === VendorDocType.PRACTITIONER ? `/p/${slug}` : `/m/${slug}`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function OracleCard({ post }: { post: FeedPost }) {
  const oracle = post.oracleMessage;
  if (!oracle) return null;
  const vendorUrl = getVendorProfileUrl(post.vendorSlug, post.vendorDocType);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 px-6 sm:px-12">
      {/* Vendor info */}
      <Link href={vendorUrl} className="flex items-center gap-3 mb-8 group" data-testid={`flipboard-oracle-vendor-${post.vendorId}`}>
        <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20 ring-2 ring-purple-400/30 flex-shrink-0">
          {post.vendorLogo?.url ? (
            <Image src={post.vendorLogo.url} alt={post.vendorName} width={56} height={56} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-xl font-medium">
              {post.vendorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-white font-semibold text-lg group-hover:underline">{post.vendorName}</p>
          <p className="text-purple-300/60 text-sm">Daily Oracle &middot; {formatTimeAgo(oracle.postedAt)}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-white/30 ml-2" />
      </Link>

      {/* Oracle message — large editorial text */}
      {oracle.message && (
        <blockquote className="text-white/90 text-2xl sm:text-3xl lg:text-4xl italic leading-relaxed font-light text-center max-w-2xl mb-10">
          &ldquo;{oracle.message}&rdquo;
        </blockquote>
      )}

      {/* Audio player */}
      <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 w-full max-w-md border border-white/10">
        <div className="p-3 rounded-full bg-purple-500/20 flex-shrink-0">
          <Mic className="h-6 w-6 text-purple-300" />
        </div>
        <audio
          src={oracle.audio.url}
          controls
          preload="metadata"
          className="w-full h-10"
          data-testid={`flipboard-oracle-audio-${post.vendorId}`}
        />
      </div>
    </div>
  );
}

function VideoCard({ post, isActive }: { post: FeedPost; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = post.video;
  if (!video) return null;
  const vendorUrl = getVendorProfileUrl(post.vendorSlug, post.vendorDocType);

  // Pause video when not the active card
  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950">
      {/* Video takes most of the space */}
      <div className="flex-1 relative min-h-0 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={video.media.url}
          poster={video.coverPhoto?.url}
          controls
          preload="metadata"
          className="w-full h-full object-contain"
          data-testid={`flipboard-video-player-${post.vendorId}`}
        />
      </div>

      {/* Vendor info + title below */}
      <div className="p-5 sm:p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={vendorUrl} className="flex-shrink-0" data-testid={`flipboard-video-vendor-${post.vendorId}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20">
              {post.vendorLogo?.url ? (
                <Image src={post.vendorLogo.url} alt={post.vendorName} width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60 text-lg font-medium">
                  {post.vendorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={vendorUrl} className="hover:underline">
              <p className="text-white font-semibold truncate">{post.vendorName}</p>
            </Link>
            <p className="text-white/40 text-sm">
              {post.vendorDocType === VendorDocType.PRACTITIONER ? 'Practitioner' : 'Merchant'}
            </p>
          </div>
          <Link href={vendorUrl} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ExternalLink className="w-4 h-4 text-white/40" />
          </Link>
        </div>
        {video.media.name && (
          <p className="text-white/70 text-base mt-3">{video.media.name}</p>
        )}
      </div>
    </div>
  );
}

export default function FeedFlipboard({ posts, open, onClose, startIndex = 0, onLoadMore, hasMore }: FeedFlipboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Scroll to start index on open
  useEffect(() => {
    if (open && containerRef.current && startIndex > 0) {
      const target = containerRef.current.children[startIndex] as HTMLElement;
      target?.scrollIntoView({ behavior: 'instant' });
    }
  }, [open, startIndex]);

  // Track active card via scroll position
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const cardHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);
    setActiveIndex(newIndex);

    // Load more when near the end
    if (hasMore && onLoadMore && newIndex >= posts.length - 3) {
      onLoadMore();
    }
  }, [posts.length, hasMore, onLoadMore]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        const next = Math.min(activeIndex + 1, posts.length - 1);
        (container.children[next] as HTMLElement)?.scrollIntoView({ behavior: 'smooth' });
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        (container.children[prev] as HTMLElement)?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, activeIndex, posts.length, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="feed-flipboard">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors backdrop-blur-sm"
        data-testid="flipboard-close"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Page indicator */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[60] bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-white/70 text-xs font-medium" data-testid="flipboard-page-indicator">
          {activeIndex + 1} / {posts.length}
        </span>
      </div>

      {/* Navigation hints */}
      {activeIndex > 0 && (
        <button
          onClick={() => {
            const prev = containerRef.current?.children[activeIndex - 1] as HTMLElement;
            prev?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] p-1 text-white/30 hover:text-white/60 transition-colors"
          data-testid="flipboard-prev"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {activeIndex < posts.length - 1 && (
        <button
          onClick={() => {
            const next = containerRef.current?.children[activeIndex + 1] as HTMLElement;
            next?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] p-1 text-white/30 hover:text-white/60 transition-colors animate-bounce"
          data-testid="flipboard-next"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Scroll-snap container — each card is a full viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        data-testid="flipboard-scroll-container"
      >
        {posts.map((post, idx) => (
          <div
            key={`${post.vendorId}-${post.postType}-${idx}`}
            className="h-screen w-full snap-start snap-always"
          >
            {post.postType === 'ORACLE' && post.oracleMessage ? (
              <OracleCard post={post} />
            ) : post.video ? (
              <VideoCard post={post} isActive={idx === activeIndex} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
