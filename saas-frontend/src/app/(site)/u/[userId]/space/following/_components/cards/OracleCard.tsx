'use client';

import { Sparkles } from 'lucide-react';
import CardShell from './CardShell';
import { FeedActivity } from '../../_hooks/useFollowingFeed';

type Props = { activity: FeedActivity; variant: 'snap' | 'grid' };

export default function OracleCard({ activity, variant }: Props) {
    const profilePath = activity.vendorDocType === 'PRACTITIONER'
        ? `/p/${activity.vendorSlug}`
        : `/m/${activity.vendorSlug}`;

    return (
        <CardShell
            activity={activity}
            variant={variant}
            bgClassName="bg-gradient-to-br from-indigo-900/90 via-purple-900/80 to-slate-900"
            badge="Oracle"
            badgeClassName="bg-purple-500/30 text-purple-200"
            cta={{ label: 'Visit Profile', href: profilePath }}
        >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
                <Sparkles className="w-8 h-8 text-purple-300/60" />
                <p className="text-xl sm:text-2xl font-light text-white/90 leading-relaxed max-w-sm italic">
                    &ldquo;{activity.title}&rdquo;
                </p>
                {activity.media?.url && (
                    <audio
                        src={activity.media.url}
                        controls
                        className="w-full max-w-xs mt-2"
                    />
                )}
            </div>
        </CardShell>
    );
}
