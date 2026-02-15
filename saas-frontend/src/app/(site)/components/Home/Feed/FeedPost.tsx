'use client';

import Image from 'next/image';
import { Mic, Play } from 'lucide-react';
import { VendorDocType } from '@/utils/spiriverse';
import type { FeedPost as FeedPostType } from '../hooks/UseFeed';

interface FeedPostProps {
  post: FeedPostType;
  onClick?: () => void;
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

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function FeedPost({ post, onClick }: FeedPostProps) {
  if (post.postType === 'ORACLE' && post.oracleMessage) {
    const oracle = post.oracleMessage;
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-gradient-to-r from-purple-900/20 to-indigo-900/20 backdrop-blur-sm border border-purple-400/15 rounded-xl p-4 hover:border-purple-400/30 hover:from-purple-900/30 hover:to-indigo-900/30 transition-all group cursor-pointer"
        data-testid={`feed-oracle-${post.vendorId}`}
      >
        <div className="flex items-center gap-3">
          {/* Vendor avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
            {post.vendorLogo?.url ? (
              <Image
                src={post.vendorLogo.url}
                alt={post.vendorName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-medium">
                {post.vendorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Content preview */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-medium text-sm truncate">{post.vendorName}</p>
              <span className="text-white/30 text-xs">&middot;</span>
              <p className="text-white/40 text-xs flex-shrink-0">{formatTimeAgo(oracle.postedAt)}</p>
            </div>
            {oracle.message ? (
              <p className="text-white/60 text-sm truncate italic mt-0.5">
                &ldquo;{oracle.message}&rdquo;
              </p>
            ) : (
              <p className="text-purple-300/60 text-sm mt-0.5">Daily Oracle</p>
            )}
          </div>

          {/* Audio indicator */}
          <div className="p-1.5 rounded-full bg-purple-500/15 flex-shrink-0">
            <Mic className="w-4 h-4 text-purple-300" />
          </div>
        </div>
      </button>
    );
  }

  // Video post — compact card with thumbnail
  if (post.video) {
    const duration = formatDuration(post.video.media.durationSeconds);
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 hover:bg-white/[0.08] transition-all group cursor-pointer"
        data-testid={`feed-video-${post.vendorId}`}
      >
        <div className="flex gap-3 p-3">
          {/* Video thumbnail */}
          <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
            {post.video.coverPhoto?.url ? (
              <Image
                src={post.video.coverPhoto.url}
                alt={post.video.media.name || 'Video'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
            )}
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-2 rounded-full bg-black/50 group-hover:bg-black/70 transition-colors">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            {/* Duration badge */}
            {duration && (
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                {duration}
              </span>
            )}
          </div>

          {/* Video info */}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                {post.vendorLogo?.url ? (
                  <Image
                    src={post.vendorLogo.url}
                    alt={post.vendorName}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60 text-[10px] font-medium">
                    {post.vendorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-white font-medium text-sm truncate">{post.vendorName}</p>
            </div>
            {post.videoCaption && (
              <p className="text-white/60 text-sm line-clamp-2">{post.videoCaption}</p>
            )}
            <p className="text-white/30 text-xs mt-1">
              {post.videoPostedAt ? formatTimeAgo(post.videoPostedAt) : (post.vendorDocType === VendorDocType.PRACTITIONER ? 'Practitioner' : 'Merchant')}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return null;
}
