'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FeedActivity } from '../../_hooks/useFollowingFeed';

type Props = {
    activity: FeedActivity;
    variant: 'snap' | 'grid';
    /** Background gradient or image — applied behind content */
    bgClassName?: string;
    /** Activity type label shown as a pill */
    badge: string;
    /** Badge colour */
    badgeClassName?: string;
    /** Primary CTA button */
    cta?: { label: string; href: string };
    children: ReactNode;
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CardShell({ activity, variant, bgClassName, badge, badgeClassName, cta, children }: Props) {
    const profilePath = activity.vendorDocType === 'PRACTITIONER'
        ? `/p/${activity.vendorSlug}`
        : `/m/${activity.vendorSlug}`;

    return (
        <div
            className={cn(
                'relative flex flex-col overflow-hidden',
                variant === 'snap'
                    ? 'h-full rounded-none'
                    : 'rounded-2xl border border-white/10 min-h-[320px]',
                bgClassName || 'bg-slate-800/80',
            )}
        >
            {/* Vendor bar */}
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-2 relative z-10">
                <Link href={profilePath} className="flex items-center gap-2.5 min-w-0">
                    {activity.vendorLogo?.url ? (
                        <img
                            src={activity.vendorLogo.url}
                            alt={activity.vendorName}
                            className="w-9 h-9 rounded-full object-cover border border-white/20 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-white/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-purple-300">
                                {activity.vendorName.charAt(0)}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{activity.vendorName}</p>
                        <p className="text-xs text-white/40">{timeAgo(activity.publishedAt)}</p>
                    </div>
                </Link>
                <span className={cn(
                    'ml-auto text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0',
                    badgeClassName || 'bg-white/10 text-white/60',
                )}>
                    {badge}
                </span>
            </div>

            {/* Content area — fills remaining space */}
            <div className="flex-1 flex flex-col px-4 pb-4 relative z-10 min-h-0">
                {children}
            </div>

            {/* CTA */}
            {cta && (
                <div className="px-4 pb-4 relative z-10">
                    <Link
                        href={cta.href}
                        className="block w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
                    >
                        {cta.label}
                    </Link>
                </div>
            )}
        </div>
    );
}
