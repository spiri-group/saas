"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export type OnboardingTheme = 'neutral' | 'faith' | 'amber' | 'purple';

type Props = {
    isFullScreen: boolean;
    isCentered?: boolean;
    marketingContent: ReactNode;
    children: ReactNode;
    /** When set, "Not ready?" cancels to this URL instead of signing out */
    cancelHref?: string;
};

export default function OnboardingShell({ isFullScreen, isCentered, marketingContent, children, cancelHref }: Props) {
    const router = useRouter();
    return (
        <div className={cn(
            "w-full flex-1 flex flex-col min-h-0 relative",
            isCentered && "justify-center",
        )}>
            {/* Content grid with animated transition */}
            <div
                className={cn(
                    "relative z-10 w-full grid gap-4 p-4 md:gap-6 md:p-6 min-h-0",
                    !isCentered && "flex-1",
                    isCentered && "max-w-6xl mx-auto",
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
                    'flex flex-col min-h-0 min-w-0 overflow-hidden transition-all duration-700',
                    isFullScreen ? 'max-w-7xl mx-auto w-full' : '',
                )}>
                    {children}
                </div>
            </div>

            {/* Escape hatch — always visible at bottom, outside the grid */}
            <div className="flex-shrink-0 flex justify-center py-4">
                {cancelHref ? (
                    <button
                        onClick={() => router.push(cancelHref)}
                        className="text-sm text-white/40 hover:text-white/70 hover:underline transition-colors cursor-pointer"
                    >
                        Not ready? Cancel
                    </button>
                ) : (
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-sm text-white/40 hover:text-white/70 hover:underline transition-colors cursor-pointer"
                    >
                        Not ready? Sign out
                    </button>
                )}
            </div>
        </div>
    );
}
