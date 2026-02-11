'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type OnboardingTheme = 'neutral' | 'amber' | 'purple';

const BG_GRADIENT: Record<OnboardingTheme, string> = {
    neutral: 'from-slate-900 via-slate-800 to-slate-900',
    amber: 'from-amber-950 via-orange-900 to-slate-900',
    purple: 'from-violet-950 via-purple-900 to-slate-900',
};

const ORB_COLORS: Record<OnboardingTheme, [string, string, string]> = {
    neutral: ['bg-slate-500/20', 'bg-slate-400/20', 'bg-slate-600/10'],
    amber: ['bg-amber-500/20', 'bg-orange-500/20', 'bg-yellow-500/10'],
    purple: ['bg-purple-500/20', 'bg-violet-500/20', 'bg-indigo-500/10'],
};

type Props = {
    theme: OnboardingTheme;
    isFullScreen: boolean;
    marketingContent: ReactNode;
    children: ReactNode;
};

export default function OnboardingShell({ theme, isFullScreen, marketingContent, children }: Props) {
    const orbs = ORB_COLORS[theme];

    return (
        <div className={cn(
            'w-screen min-h-screen-minus-nav relative overflow-hidden transition-colors duration-700',
            'bg-gradient-to-br',
            BG_GRADIENT[theme],
        )}>
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={cn('absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse transition-colors duration-700', orbs[0])} />
                <div className={cn('absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse transition-colors duration-700', orbs[1])} style={{ animationDelay: '1s' }} />
                <div className={cn('absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse transition-colors duration-700', orbs[2])} style={{ animationDelay: '2s' }} />
            </div>

            {/* Content grid with animated transition */}
            <div
                className="relative z-10 w-full min-h-screen-minus-nav grid gap-6 p-6 items-stretch"
                style={{
                    gridTemplateColumns: isFullScreen ? '0fr 1fr' : '1fr 1fr',
                    transition: 'grid-template-columns 700ms ease-in-out',
                }}
            >
                {/* Marketing panel — collapses to 0fr when full-screen */}
                <div
                    className="overflow-hidden hidden lg:flex flex-col transition-opacity duration-700"
                    style={{ opacity: isFullScreen ? 0 : 1 }}
                >
                    <div className="min-w-[400px] h-full">
                        {marketingContent}
                    </div>
                </div>

                {/* Form panel — stretches to center when full-screen */}
                <div className={cn(
                    'flex flex-col transition-all duration-700',
                    isFullScreen ? 'max-w-5xl mx-auto w-full' : '',
                )}>
                    {children}
                </div>
            </div>
        </div>
    );
}
