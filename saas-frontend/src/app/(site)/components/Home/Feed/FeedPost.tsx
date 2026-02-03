'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mic } from 'lucide-react';
import { VendorDocType } from '@/utils/spiriverse';
import type { FeedPost as FeedPostType } from '../hooks/UseFeed';

interface FeedPostProps {
  post: FeedPostType;
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

function VendorHeader({ post, vendorUrl, subtitle }: { post: FeedPostType; vendorUrl: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 p-4 pb-3">
      <Link href={vendorUrl} data-testid={`feed-post-vendor-link-${post.vendorId}`}>
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
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={vendorUrl} className="hover:underline">
          <p className="text-white font-medium text-sm truncate">{post.vendorName}</p>
        </Link>
        <p className="text-white/50 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

export default function FeedPost({ post }: FeedPostProps) {
  const vendorUrl = getVendorProfileUrl(post.vendorSlug, post.vendorDocType);

  if (post.postType === 'ORACLE' && post.oracleMessage) {
    const oracle = post.oracleMessage;
    return (
      <div
        data-testid={`feed-oracle-${post.vendorId}`}
        className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm border border-purple-400/20 rounded-xl overflow-hidden"
      >
        <VendorHeader
          post={post}
          vendorUrl={vendorUrl}
          subtitle={`Daily Oracle \u00B7 ${formatTimeAgo(oracle.postedAt)}`}
        />

        <div className="px-4 pb-4">
          {/* Oracle text message */}
          {oracle.message && (
            <p className="text-white/90 text-sm italic leading-relaxed mb-3">
              &ldquo;{oracle.message}&rdquo;
            </p>
          )}

          {/* Audio player */}
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
            <Mic className="h-5 w-5 text-purple-300 flex-shrink-0" />
            <audio
              src={oracle.audio.url}
              controls
              preload="metadata"
              className="w-full h-8"
              data-testid={`feed-oracle-audio-${post.vendorId}`}
            />
          </div>
        </div>
      </div>
    );
  }

  // Video post
  if (post.video) {
    return (
      <div
        data-testid={`feed-video-${post.vendorId}`}
        className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl overflow-hidden"
      >
        <VendorHeader
          post={post}
          vendorUrl={vendorUrl}
          subtitle={post.vendorDocType === VendorDocType.PRACTITIONER ? 'Practitioner' : 'Merchant'}
        />

        <div className="relative aspect-video bg-black/30">
          <video
            src={post.video.media.url}
            poster={post.video.coverPhoto?.url}
            controls
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>

        {post.video.media.name && (
          <div className="px-4 py-3">
            <p className="text-white/80 text-sm">{post.video.media.name}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
