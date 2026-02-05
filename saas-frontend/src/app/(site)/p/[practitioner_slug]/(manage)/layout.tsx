'use client'

import { useEffect } from 'react';

export default function PractitionerManageLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const root = document.documentElement;

        // Reset any custom theming CSS variables to restore normal SpiriVerse theming
        root.style.removeProperty('--merchant-primary');
        root.style.removeProperty('--merchant-primary-foreground');
        root.style.removeProperty('--merchant-links');
        root.style.removeProperty('--merchant-brand');
        root.style.removeProperty('--merchant-box-shadow-color');

        root.style.removeProperty('--merchant-brand-foreground');
        root.style.removeProperty('--merchant-default-foreground');
        root.style.removeProperty('--merchant-headings-foreground');
        root.style.removeProperty('--merchant-accent-foreground');

        root.style.removeProperty('--merchant-background');
        root.style.removeProperty('--merchant-background-image');

        root.style.removeProperty('--merchant-panel');
        root.style.removeProperty('--merchant-panel-transparency');
        root.style.removeProperty('--merchant-panel-primary-foreground');
        root.style.removeProperty('--merchant-panel-accent-foreground');

        // Set dark background matching merchant manage layout (slate-900)
        root.style.setProperty('--merchant-background-image', 'none');
        root.style.setProperty('--merchant-background', '15, 23, 42');
        document.body.style.background = 'rgb(15, 23, 42)';

        return () => {
            // Cleanup when leaving manage routes
            root.style.removeProperty('--merchant-background');
            root.style.removeProperty('--merchant-background-image');
            document.body.style.removeProperty('background');
        };
    }, []);

    return <div className="min-h-screen bg-slate-900">{children}</div>;
}
