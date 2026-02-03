'use client'

import { useEffect } from 'react';

export default function PractitionerManageLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Reset any custom theming CSS variables to restore normal SpiriVerse theming
        const root = document.documentElement;

        // Clear any custom color variables
        root.style.removeProperty('--merchant-primary');
        root.style.removeProperty('--merchant-primary-foreground');
        root.style.removeProperty('--merchant-links');
        root.style.removeProperty('--merchant-brand');
        root.style.removeProperty('--merchant-box-shadow-color');

        // Clear typography variables
        root.style.removeProperty('--merchant-brand-foreground');
        root.style.removeProperty('--merchant-default-foreground');
        root.style.removeProperty('--merchant-headings-foreground');
        root.style.removeProperty('--merchant-accent-foreground');

        // Clear background variables
        root.style.removeProperty('--merchant-background');
        root.style.removeProperty('--merchant-background-image');

        // Clear panel variables
        root.style.removeProperty('--merchant-panel');
        root.style.removeProperty('--merchant-panel-transparency');
        root.style.removeProperty('--merchant-panel-primary-foreground');
        root.style.removeProperty('--merchant-panel-accent-foreground');

        // Set default SpiriVerse background for manage routes
        root.style.setProperty('--merchant-background-image', 'none');
        root.style.setProperty('--merchant-background', '248, 250, 252'); // Light gray background

        return () => {
            // Cleanup when leaving manage routes
        };
    }, []);

    return <>{children}</>;
}
