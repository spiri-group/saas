'use client';

import { useEffect, useState } from 'react';

const BANNER_HEIGHT = 36;

export default function PreviewBanner() {
    const [label, setLabel] = useState<string | null>(null);

    useEffect(() => {
        const host = window.location.hostname;
        const prMatch = host.match(/ca-spiriverse-pr-(\d+)\./);
        if (prMatch) {
            setLabel(`Preview — PR #${prMatch[1]}`);
        } else if (host.match(/ca-spiriverse-br-/)) {
            const branchMatch = host.match(/ca-spiriverse-br-([^.]+)/);
            setLabel(`Preview — ${branchMatch?.[1] ?? 'branch'}`);
        } else {
            return;
        }
        document.documentElement.style.setProperty('--preview-banner-height', `${BANNER_HEIGHT}px`);
        return () => {
            document.documentElement.style.removeProperty('--preview-banner-height');
        };
    }, []);

    if (!label) return null;

    return (
        <>
            <div style={{ height: BANNER_HEIGHT }} />
            <div
                className="fixed top-0 left-0 right-0 z-[9999] bg-purple-600 text-white px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
                style={{ height: BANNER_HEIGHT }}
                data-testid="preview-banner"
            >
                <span>{label}</span>
            </div>
        </>
    );
}
