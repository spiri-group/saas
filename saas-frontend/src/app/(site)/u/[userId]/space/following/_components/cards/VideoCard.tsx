'use client';

import { Play } from 'lucide-react';
import CardShell from './CardShell';
import { FeedActivity } from '../../_hooks/useFollowingFeed';

type Props = { activity: FeedActivity; variant: 'snap' | 'grid' };

export default function VideoCard({ activity, variant }: Props) {
    const profilePath = activity.vendorDocType === 'PRACTITIONER'
        ? `/p/${activity.vendorSlug}`
        : `/m/${activity.vendorSlug}`;

    return (
        <CardShell
            activity={activity}
            variant={variant}
            bgClassName="bg-slate-900"
            badge="Video"
            badgeClassName="bg-blue-500/30 text-blue-200"
            cta={{ label: 'Visit Profile', href: profilePath }}
        >
            <div className="flex-1 flex flex-col gap-3">
                {/* Video or cover photo */}
                <div className="relative flex-1 min-h-[200px] rounded-xl overflow-hidden bg-black/30">
                    {activity.media?.url ? (
                        <video
                            src={activity.media.url}
                            poster={activity.coverPhoto?.url}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                        />
                    ) : activity.coverPhoto?.url ? (
                        <>
                            <img
                                src={activity.coverPhoto.url}
                                alt={activity.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Play className="w-7 h-7 text-white ml-1" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-10 h-10 text-white/30" />
                        </div>
                    )}
                </div>

                {activity.title && (
                    <p className="text-sm text-white/80">{activity.title}</p>
                )}
            </div>
        </CardShell>
    );
}
