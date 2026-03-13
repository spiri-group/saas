'use client';

import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

const BANNER_HEIGHT = 36;

export default function ImpersonationBanner() {
    const [email, setEmail] = useState<string | null>(null);
    const [stopping, setStopping] = useState(false);

    useEffect(() => {
        const impersonatingEmail = getCookie('impersonating-user');
        setEmail(impersonatingEmail);
        if (impersonatingEmail) {
            document.documentElement.style.setProperty('--impersonation-banner-height', `${BANNER_HEIGHT}px`);
        }
        return () => {
            document.documentElement.style.removeProperty('--impersonation-banner-height');
        };
    }, []);

    if (!email) return null;

    const handleStop = async () => {
        setStopping(true);
        try {
            await fetch('/api/console/impersonate/stop', { method: 'POST' });
            window.location.href = '/console';
        } catch {
            setStopping(false);
        }
    };

    return (
        <>
            {/* Spacer to push page content down */}
            <div style={{ height: BANNER_HEIGHT }} />
            {/* Fixed banner at very top */}
            <div
                className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black px-4 flex items-center justify-center gap-3 text-sm font-medium shadow-lg"
                style={{ height: BANNER_HEIGHT }}
                data-testid="impersonation-banner"
            >
                <Eye className="h-4 w-4 flex-shrink-0" />
                <span>Viewing as <strong>{email}</strong></span>
                <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded bg-black/20 hover:bg-black/30 transition-colors text-xs font-semibold"
                    data-testid="stop-impersonation-btn"
                >
                    {stopping ? 'Stopping...' : (
                        <>
                            <X className="h-3 w-3" />
                            Stop Viewing
                        </>
                    )}
                </button>
            </div>
        </>
    );
}
