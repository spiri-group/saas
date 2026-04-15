'use client';

import CardShell from './CardShell';
import { FeedActivity } from '../../_hooks/useFollowingFeed';

type Props = { activity: FeedActivity; variant: 'snap' | 'grid' };

export default function GenericCard({ activity, variant }: Props) {
    const profilePath = activity.vendorDocType === 'PRACTITIONER'
        ? `/p/${activity.vendorSlug}`
        : `/m/${activity.vendorSlug}`;

    const badgeLabel = activity.activityType
        .replace(/_/g, ' ')
        .replace(/^NEW /, '')
        .toLowerCase()
        .replace(/^\w/, c => c.toUpperCase());

    return (
        <CardShell
            activity={activity}
            variant={variant}
            badge={badgeLabel}
            cta={{ label: 'Visit Profile', href: profilePath }}
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
                        <p className="text-sm text-white/60 mt-1 line-clamp-3">{activity.subtitle}</p>
                    )}
                </div>
            </div>
        </CardShell>
    );
}
