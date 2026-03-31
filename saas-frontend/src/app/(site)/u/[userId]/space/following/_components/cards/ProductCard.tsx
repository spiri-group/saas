'use client';

import CardShell from './CardShell';
import { FeedActivity } from '../../_hooks/useFollowingFeed';

type Props = { activity: FeedActivity; variant: 'snap' | 'grid' };

export default function ProductCard({ activity, variant }: Props) {
    const meta = activity.metadata ? JSON.parse(activity.metadata) : {};
    const profilePath = activity.vendorDocType === 'PRACTITIONER'
        ? `/p/${activity.vendorSlug}`
        : `/m/${activity.vendorSlug}`;

    return (
        <CardShell
            activity={activity}
            variant={variant}
            bgClassName="bg-gradient-to-br from-amber-900/40 via-slate-900 to-slate-900"
            badge="New Product"
            badgeClassName="bg-amber-500/30 text-amber-200"
            cta={{ label: 'View Product', href: profilePath }}
        >
            <div className="flex-1 flex flex-col gap-4 py-4">
                {activity.media?.url && (
                    <div className="rounded-xl overflow-hidden h-48 bg-black/20">
                        <img
                            src={activity.media.url}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold text-white">{activity.title}</h3>
                    {activity.subtitle && (
                        <p className="text-sm text-white/60 mt-1 line-clamp-2">{activity.subtitle}</p>
                    )}
                </div>
                {meta.price != null && (
                    <span className="text-lg font-bold text-amber-300">
                        ${(meta.price / 100).toFixed(0)}
                    </span>
                )}
            </div>
        </CardShell>
    );
}
