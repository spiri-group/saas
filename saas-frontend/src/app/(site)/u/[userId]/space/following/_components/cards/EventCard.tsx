'use client';

import { Calendar } from 'lucide-react';
import CardShell from './CardShell';
import { FeedActivity } from '../../_hooks/useFollowingFeed';

type Props = { activity: FeedActivity; variant: 'snap' | 'grid' };

export default function EventCard({ activity, variant }: Props) {
    const profilePath = activity.vendorDocType === 'PRACTITIONER'
        ? `/p/${activity.vendorSlug}`
        : `/m/${activity.vendorSlug}`;

    return (
        <CardShell
            activity={activity}
            variant={variant}
            bgClassName="bg-gradient-to-br from-rose-900/40 via-slate-900 to-slate-900"
            badge="New Event"
            badgeClassName="bg-rose-500/30 text-rose-200"
            cta={{ label: 'View Event', href: profilePath }}
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
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-rose-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{activity.title}</h3>
                        {activity.subtitle && (
                            <p className="text-sm text-white/60 mt-1 line-clamp-2">{activity.subtitle}</p>
                        )}
                    </div>
                </div>
            </div>
        </CardShell>
    );
}
