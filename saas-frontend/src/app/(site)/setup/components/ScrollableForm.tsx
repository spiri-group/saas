'use client';

import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
    /** Use dark indicator styling (for dark backgrounds like the basic step) */
    dark?: boolean;
};

/**
 * Wraps form content in a scrollable area with a bounce-arrow indicator
 * that appears when there's hidden content below. Clicking the arrow
 * scrolls down. The arrow disappears once the user reaches the bottom.
 */
export default function ScrollableForm({ children, className, dark }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
    }, [checkScroll]);

    return (
        <>
            <div
                ref={scrollRef}
                className={cn('flex-1 overflow-y-auto min-h-0', className)}
            >
                {children}
            </div>
            {canScroll && (
                <div className="flex-shrink-0 flex justify-center py-1.5 animate-bounce">
                    <button
                        type="button"
                        onClick={() => scrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' })}
                        className={cn(
                            'rounded-full p-1.5 cursor-pointer transition-colors',
                            dark
                                ? 'bg-white/10 border border-white/20 hover:bg-white/20'
                                : 'bg-slate-100 border border-slate-200 hover:bg-slate-200',
                        )}
                    >
                        <ChevronDown className={cn('w-4 h-4', dark ? 'text-white/50' : 'text-slate-400')} />
                    </button>
                </div>
            )}
        </>
    );
}
