'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Mic, Play, ExternalLink, Loader2 } from 'lucide-react';
import { VendorDocType } from '@/utils/spiriverse';
import type { FeedPost } from '../hooks/UseFeed';

interface FeedFlipboardProps {
  posts: FeedPost[];
  open: boolean;
  onClose: () => void;
  startIndex?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
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

function OracleDigestCard({ post }: { post: FeedPost }) {
  const [listening, setListening] = useState(false);
  const oracle = post.oracleMessage;
  if (!oracle) return null;
  const vendorUrl = getVendorProfileUrl(post.vendorSlug, post.vendorDocType);

  return (
    <div
      className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-400/15 rounded-2xl overflow-hidden"
      data-testid={`digest-oracle-${post.vendorId}`}
    >
      {/* Vendor row */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Link href={vendorUrl} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 ring-1 ring-purple-400/20">
            {post.vendorLogo?.url ? (
              <Image src={post.vendorLogo.url} alt={post.vendorName} width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-medium">
                {post.vendorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={vendorUrl} className="hover:underline">
            <p className="text-white font-medium text-sm truncate">{post.vendorName}</p>
          </Link>
          <p className="text-purple-300/50 text-xs">Daily Oracle &middot; {formatTimeAgo(oracle.postedAt)}</p>
        </div>
      </div>

      {/* Quote */}
      {oracle.message && (
        <div className="px-5 pb-4">
          <blockquote className="text-white/85 text-lg sm:text-xl italic leading-relaxed font-light">
            &ldquo;{oracle.message}&rdquo;
          </blockquote>
        </div>
      )}

      {/* Audio — tap to reveal */}
      <div className="px-5 pb-5">
        {listening ? (
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="p-2 rounded-full bg-purple-500/20 flex-shrink-0">
              <Mic className="h-5 w-5 text-purple-300" />
            </div>
            <audio
              src={oracle.audio.url}
              controls
              autoPlay
              preload="auto"
              className="w-full h-9"
              data-testid={`digest-oracle-audio-${post.vendorId}`}
            />
          </div>
        ) : (
          <button
            onClick={() => setListening(true)}
            className="flex items-center gap-2 text-purple-300/70 hover:text-purple-200 transition-colors text-sm"
            data-testid={`digest-oracle-listen-${post.vendorId}`}
          >
            <Mic className="w-4 h-4" />
            Listen to message
          </button>
        )}
      </div>
    </div>
  );
}

function VideoDigestCard({ post }: { post: FeedPost }) {
  const [playing, setPlaying] = useState(false);
  const video = post.video;
  if (!video) return null;
  const vendorUrl = getVendorProfileUrl(post.vendorSlug, post.vendorDocType);

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
      data-testid={`digest-video-${post.vendorId}`}
    >
      {/* Video area */}
      {playing ? (
        <div className="relative aspect-video bg-black">
          <video
            src={video.media.url}
            poster={video.coverPhoto?.url}
            controls
            autoPlay
            preload="auto"
            className="w-full h-full object-contain"
            data-testid={`digest-video-player-${post.vendorId}`}
          />
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video bg-black/30 group cursor-pointer"
          data-testid={`digest-video-play-${post.vendorId}`}
        >
          {video.coverPhoto?.url ? (
            <Image src={video.coverPhoto.url} alt={video.media.name || 'Video'} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="p-4 rounded-full bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        </button>
      )}

      {/* Info below */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Link href={vendorUrl} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20">
              {post.vendorLogo?.url ? (
                <Image src={post.vendorLogo.url} alt={post.vendorName} width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-medium">
                  {post.vendorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={vendorUrl} className="hover:underline">
              <p className="text-white font-medium text-sm truncate">{post.vendorName}</p>
            </Link>
            <p className="text-white/40 text-xs">
              {post.vendorDocType === VendorDocType.PRACTITIONER ? 'Practitioner' : 'Merchant'}
            </p>
          </div>
          <Link
            href={vendorUrl}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-white/30" />
          </Link>
        </div>
        {video.media.name && (
          <p className="text-white/70 text-sm mt-3">{video.media.name}</p>
        )}
      </div>
    </div>
  );
}

export default function FeedFlipboard({ posts, open, onClose, onLoadMore, hasMore, isLoadingMore }: FeedFlipboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Infinite load on scroll
  useEffect(() => {
    if (!open || !hasMore || !onLoadMore) return;
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
        onLoadMore();
      }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [open, hasMore, onLoadMore]);

  if (!open) return null;

  // Group posts by vendor for a curated feel
  const oraclePosts = posts.filter(p => p.postType === 'ORACLE' && p.oracleMessage);
  const videoPosts = posts.filter(p => p.postType === 'VIDEO' && p.video);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl" data-testid="feed-digest">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        data-testid="digest-close"
      >
        <X className="w-5 h-5 text-white/70" />
      </button>

      {/* Scrollable digest */}
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
          {/* Header — like opening a letter */}
          <div className="text-center mb-12">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">From your practitioners</p>
            <h1 className="text-white text-2xl sm:text-3xl font-light" data-testid="digest-heading">
              Today&apos;s Messages
            </h1>
          </div>

          {/* Oracle messages first — the spiritual heart */}
          {oraclePosts.length > 0 && (
            <div className="mb-12">
              {oraclePosts.length > 1 && (
                <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Oracle Messages</p>
              )}
              <div className="space-y-5">
                {oraclePosts.map((post, idx) => (
                  <OracleDigestCard key={`oracle-${post.vendorId}-${idx}`} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* Divider between sections */}
          {oraclePosts.length > 0 && videoPosts.length > 0 && (
            <div className="flex items-center gap-4 mb-12">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-white/15 text-xs">&middot;</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          )}

          {/* Video updates */}
          {videoPosts.length > 0 && (
            <div className="mb-12">
              {videoPosts.length > 1 && (
                <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Video Updates</p>
              )}
              <div className="space-y-5">
                {videoPosts.map((post, idx) => (
                  <VideoDigestCard key={`video-${post.vendorId}-${idx}`} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* Loading more */}
          {isLoadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          )}

          {/* End of digest */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <div className="flex items-center gap-4 justify-center mb-4">
                <div className="w-8 h-px bg-white/10" />
                <span className="text-white/15 text-xs">&middot;</span>
                <div className="w-8 h-px bg-white/10" />
              </div>
              <p className="text-white/20 text-xs">You&apos;re all caught up</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
