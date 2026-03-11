"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type OnboardingTheme = 'neutral' | 'faith' | 'amber' | 'purple';

type Props = {
    isFullScreen: boolean;
    isCentered?: boolean;
    marketingContent: ReactNode;
    children: ReactNode;
    /** Called when the user bails out of onboarding */
    onCancel?: () => void;
};

export default function OnboardingShell({ isFullScreen, isCentered, marketingContent, children, onCancel }: Props) {
    return (
        <div className="w-full flex-1 flex flex-col min-h-0 relative">
            {/* Content grid with animated transition */}
            <div
                className={cn(
                    "relative z-10 w-full grid gap-4 p-4 md:gap-6 md:p-6 min-h-0",
                    !isCentered && "flex-1",
                    isCentered && "max-w-6xl mx-auto my-auto",
                )}
                style={{
                    gridTemplateColumns: isFullScreen ? '0fr 1fr' : '1fr 1fr',
                    gridTemplateRows: isCentered ? 'auto' : '1fr',
                    transition: 'grid-template-columns 700ms ease-in-out',
                }}
            >
                {/* Marketing panel — collapses to 0fr when full-screen */}
                <div
                    className="overflow-hidden hidden lg:flex flex-col transition-opacity duration-700 min-w-0"
                    style={{ opacity: isFullScreen ? 0 : 1 }}
                >
                    {marketingContent}
                </div>

                {/* Form panel — stretches to center when full-screen */}
                <div className={cn(
                    'flex flex-col min-h-0 min-w-0 overflow-x-hidden overflow-y-auto transition-all duration-700',
                    isFullScreen ? 'max-w-7xl mx-auto w-full' : '',
                )}>
                    {children}
                </div>
            </div>

            {/* Escape hatch — visible after the basic step */}
            {onCancel && (
                <div className="flex-shrink-0 flex justify-center py-2 md:py-4">
                    <button
                        onClick={onCancel}
                        className="text-sm text-white/40 hover:text-white/70 hover:underline transition-colors cursor-pointer py-2 px-4"
                    >
                        I&apos;ll do this later
                    </button>
                </div>
            )}
        </div>
    );
}
