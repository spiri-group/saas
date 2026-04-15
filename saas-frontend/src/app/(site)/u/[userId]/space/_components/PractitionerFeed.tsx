'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Flame, Users, ChevronRight, Sparkles, Play, ShoppingBag, Calendar } from 'lucide-react';
import { useFollowingFeed, FeedActivity } from '../following/_hooks/useFollowingFeed';
import { useRecommendedVendors } from '@/app/(site)/components/Home/hooks/UseFeed';
import RecommendedVendors from '@/app/(site)/components/Home/Feed/RecommendedVendors';

const PREVIEW_COUNT = 4;

const ACTIVITY_ICONS: Record<string, typeof Sparkles> = {
    ORACLE_MESSAGE: Sparkles,
    VIDEO_UPDATE: Play,
    NEW_SERVICE: Sparkles,
    NEW_PRODUCT: ShoppingBag,
    NEW_EVENT: Calendar,
};

const ACTIVITY_LABELS: Record<string, string> = {
    ORACLE_MESSAGE: 'Oracle',
    VIDEO_UPDATE: 'Video',
    NEW_SERVICE: 'New service',
    NEW_PRODUCT: 'New product',
    NEW_EVENT: 'New event',
    NEW_GALLERY_ITEM: 'Gallery',
    NEW_JOURNEY: 'Journey',
};

function MiniActivityCard({ activity }: { activity: FeedActivity }) {
    const Icon = ACTIVITY_ICONS[activity.activityType] || Sparkles;
    const label = ACTIVITY_LABELS[activity.activityType] || 'Update';

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/5">
            {activity.vendorLogo?.url ? (
                <Image
                    src={activity.vendorLogo.url}
                    alt={activity.vendorName}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover border border-white/20 flex-shrink-0"
                />
            ) : (
                <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-purple-300">
                        {activity.vendorName.charAt(0)}
                    </span>
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{activity.title}</p>
                <p className="text-xs text-white/40 truncate">{activity.vendorName}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-purple-400/60" />
                <span className="text-xs text-white/30">{label}</span>
            </div>
        </div>
    );
}

export default function PractitionerFeed() {
    const params = useParams();
    const userId = params?.userId as string;
    const followingHref = `/u/${userId}/space/following`;

    const { data: feedData, isLoading: feedLoading } = useFollowingFeed();
    const { data: recommendedVendors, isLoading: recommendedLoading } = useRecommendedVendors(6);

    const activities = useMemo(
        () => feedData?.pages.flatMap(p => p.activities) ?? [],
        [feedData]
    );
    const previewActivities = activities.slice(0, PREVIEW_COUNT);
    const remainingCount = Math.max(0, activities.length - PREVIEW_COUNT);
    const followingCount = feedData?.pages[0]?.followingCount ?? 0;

    // Unique vendor avatars
    const uniqueVendors = useMemo(() => {
        return Array.from(
            new Map(activities.map(a => [a.vendorId, { name: a.vendorName, logo: a.vendorLogo }])).values()
        ).slice(0, 5);
    }, [activities]);

    if (feedLoading) {
        return (
            <div className="flex justify-center py-12" data-testid="feed-loading">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
        );
    }

    const hasPosts = activities.length > 0;

    return (
        <div data-testid="practitioner-feed" className="h-full flex flex-col">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-medium text-slate-400">Your Feed</h2>
                </div>
                <Link
                    href={followingHref}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    data-testid="feed-open-following"
                >
                    {hasPosts ? 'View all' : 'Explore'}
                    <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {hasPosts ? (
                <>
                    {/* Summary card — links to full Following page */}
                    <Link
                        href={followingHref}
                        className="w-full mb-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all group block"
                        data-testid="feed-summary-card"
                    >
                        <div className="flex items-center gap-3">
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
                                    {activities.length} update{activities.length !== 1 ? 's' : ''}
                                </p>
                                <p className="text-white/40 text-xs truncate">
                                    from {uniqueVendors.length} {uniqueVendors.length !== 1 ? 'people' : 'person'} you follow
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
                        </div>
                    </Link>

                    {/* Mini activity previews */}
                    <div className="flex flex-col gap-2">
                        {previewActivities.map((activity) => (
                            <MiniActivityCard key={activity.id} activity={activity} />
                        ))}
                    </div>

                    {/* See more link */}
                    {remainingCount > 0 && (
                        <Link
                            href={followingHref}
                            className="w-full mt-3 py-3 text-center text-sm text-purple-400 hover:text-purple-300 transition-colors rounded-lg hover:bg-white/5 block"
                            data-testid="feed-see-more"
                        >
                            +{remainingCount} more update{remainingCount !== 1 ? 's' : ''}
                        </Link>
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
                </>
            ) : (
                /* Empty state — discovery experience */
                <div data-testid="feed-empty-state" className="flex-1 flex flex-col">
                    <Link
                        href={`${followingHref}?tab=explore`}
                        className="text-center py-8 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all mb-6 flex-1 flex flex-col items-center justify-center block"
                    >
                        <Flame className="w-8 h-8 text-purple-400/60 mx-auto mb-3" />
                        <p className="text-white/80 text-sm font-medium mb-1">Your feed is empty</p>
                        <p className="text-white/40 text-xs">
                            Tap to explore and follow practitioners and merchants.
                        </p>
                    </Link>

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
