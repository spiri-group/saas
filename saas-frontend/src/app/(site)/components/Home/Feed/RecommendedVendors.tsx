'use client';

import Link from 'next/link';
import Image from 'next/image';
import { VendorDocType } from '@/utils/spiriverse';
import FollowButton from '@/app/(site)/m/_components/Profile/UI/FollowButton';
import type { RecommendedVendor } from '../hooks/UseFeed';

interface RecommendedVendorsProps {
  vendors: RecommendedVendor[];
  layout?: 'horizontal' | 'grid';
}

function getVendorProfileUrl(slug: string, docType: string): string {
  return docType === VendorDocType.PRACTITIONER ? `/p/${slug}` : `/m/${slug}`;
}

export default function RecommendedVendors({ vendors, layout = 'horizontal' }: RecommendedVendorsProps) {
  if (vendors.length === 0) return null;

  const containerClass = layout === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'flex gap-3 overflow-x-auto pb-2 scrollbar-hide';

  return (
    <div data-testid="recommended-vendors">
      <div className={containerClass}>
        {vendors.map(vendor => (
          <div
            key={vendor.id}
            data-testid={`recommended-vendor-${vendor.id}`}
            className={`bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 flex-shrink-0 ${
              layout === 'horizontal' ? 'w-64' : ''
            }`}
          >
            <Link href={getVendorProfileUrl(vendor.slug, vendor.docType)} className="block">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                  {vendor.logo?.url ? (
                    <Image
                      src={vendor.logo.url}
                      alt={vendor.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-lg font-medium">
                      {vendor.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{vendor.name}</p>
                  {vendor.headline && (
                    <p className="text-white/60 text-xs truncate">{vendor.headline}</p>
                  )}
                </div>
              </div>
            </Link>

            {vendor.modalities && vendor.modalities.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {vendor.modalities.slice(0, 3).map((mod, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200/80"
                  >
                    {mod.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            )}

            {vendor.matchReason && (
              <p className="text-white/40 text-[10px] mb-2 italic">{vendor.matchReason}</p>
            )}

            <FollowButton merchantId={vendor.id} variant="compact" showCount={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
