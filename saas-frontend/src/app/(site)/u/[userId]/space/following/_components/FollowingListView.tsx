'use client';

import Link from 'next/link';
import { useMyFollowing, useUnfollowMerchant } from '@/app/(site)/m/_hooks/UseFollow';
import { Button } from '@/components/ui/button';
import { UserMinus } from 'lucide-react';

export default function FollowingListView() {
    const { data: following, isLoading } = useMyFollowing();
    const unfollow = useUnfollowMerchant();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    if (!following || following.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center">
                    <p className="text-white/60 text-lg">You&apos;re not following anyone yet</p>
                    <p className="text-white/30 text-sm mt-2">Head to the Explore tab to discover practitioners and merchants.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-white/5">
                {following.map((vendor: any) => {
                    const profilePath = vendor.docType === 'PRACTITIONER'
                        ? `/p/${vendor.slug}`
                        : `/m/${vendor.slug}`;

                    return (
                        <div key={vendor.id} className="flex items-center gap-3 px-4 py-3">
                            <Link href={profilePath} className="flex items-center gap-3 flex-1 min-w-0">
                                {vendor.logo?.url ? (
                                    <img
                                        src={vendor.logo.url}
                                        alt={vendor.name}
                                        className="w-11 h-11 rounded-full object-cover border border-white/20 flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-purple-600/30 border border-white/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-semibold text-purple-300">
                                            {vendor.name?.charAt(0)}
                                        </span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{vendor.name}</p>
                                    <p className="text-xs text-white/40 truncate">
                                        {vendor.docType === 'PRACTITIONER' ? 'Practitioner' : 'Merchant'}
                                    </p>
                                </div>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/40 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                                onClick={() => unfollow.mutate(vendor.id)}
                                disabled={unfollow.isPending}
                            >
                                <UserMinus className="w-4 h-4" />
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
