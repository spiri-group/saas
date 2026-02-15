'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mic, X, ExternalLink } from 'lucide-react';
import { VendorDocType } from '@/utils/spiriverse';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { FeedPost } from '../hooks/UseFeed';

interface ExpandedFeedPostProps {
  post: FeedPost;
  open: boolean;
  onClose: () => void;
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

export default function ExpandedFeedPost({ post, open, onClose }: ExpandedFeedPostProps) {
  const vendorUrl = getVendorProfileUrl(post.vendorSlug, post.vendorDocType);

  if (post.postType === 'ORACLE' && post.oracleMessage) {
    const oracle = post.oracleMessage;
    return (
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent
          className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-purple-950/98 via-indigo-950/98 to-slate-950/98 border-purple-500/20"
          data-testid={`expanded-oracle-${post.vendorId}`}
        >
          <VisuallyHidden>
            <DialogTitle>Oracle message from {post.vendorName}</DialogTitle>
          </VisuallyHidden>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            data-testid="expanded-post-close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Vendor header */}
          <div className="flex items-center gap-4 p-6 pb-0">
            <Link href={vendorUrl} onClick={onClose}>
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-purple-400/30">
                {post.vendorLogo?.url ? (
                  <Image
                    src={post.vendorLogo.url}
                    alt={post.vendorName}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60 text-xl font-medium">
                    {post.vendorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={vendorUrl} onClick={onClose} className="hover:underline">
                <p className="text-white font-semibold text-lg">{post.vendorName}</p>
              </Link>
              <p className="text-purple-300/70 text-sm">Daily Oracle &middot; {formatTimeAgo(oracle.postedAt)}</p>
            </div>
            <Link
              href={vendorUrl}
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              data-testid={`expanded-post-profile-link-${post.vendorId}`}
            >
              <ExternalLink className="w-4 h-4 text-white/50" />
            </Link>
          </div>

          {/* Oracle content — editorial layout */}
          <div className="px-6 py-8">
            {oracle.message && (
              <blockquote className="text-white/90 text-xl sm:text-2xl italic leading-relaxed font-light text-center max-w-xl mx-auto mb-8">
                &ldquo;{oracle.message}&rdquo;
              </blockquote>
            )}

            {/* Audio player */}
            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 max-w-md mx-auto border border-white/10">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Mic className="h-6 w-6 text-purple-300" />
              </div>
              <audio
                src={oracle.audio.url}
                controls
                preload="metadata"
                autoPlay
                className="w-full h-10"
                data-testid={`expanded-oracle-audio-${post.vendorId}`}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Video post
  if (post.video) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent
          className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-slate-950/98 border-white/10"
          data-testid={`expanded-video-${post.vendorId}`}
        >
          <VisuallyHidden>
            <DialogTitle>Video from {post.vendorName}</DialogTitle>
          </VisuallyHidden>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            data-testid="expanded-post-close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Full video player */}
          <div className="relative aspect-video bg-black">
            <video
              src={post.video.media.url}
              poster={post.video.coverPhoto?.url}
              controls
              autoPlay
              preload="auto"
              className="w-full h-full object-contain"
              data-testid={`expanded-video-player-${post.vendorId}`}
            />
          </div>

          {/* Vendor info + title below video */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Link href={vendorUrl} onClick={onClose}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                  {post.vendorLogo?.url ? (
                    <Image
                      src={post.vendorLogo.url}
                      alt={post.vendorName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-lg font-medium">
                      {post.vendorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={vendorUrl} onClick={onClose} className="hover:underline">
                  <p className="text-white font-semibold">{post.vendorName}</p>
                </Link>
                <p className="text-white/50 text-sm">
                  {post.vendorDocType === VendorDocType.PRACTITIONER ? 'Practitioner' : 'Merchant'}
                </p>
              </div>
              <Link
                href={vendorUrl}
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                data-testid={`expanded-post-profile-link-${post.vendorId}`}
              >
                <ExternalLink className="w-4 h-4 text-white/50" />
              </Link>
            </div>

            {post.video.media.name && (
              <p className="text-white/80 text-base">{post.video.media.name}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
