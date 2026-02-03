'use client'

import { useEffect } from 'react';

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Reset all merchant theming CSS variables to restore normal SpiriVerse theming
    const root = document.documentElement;

    // Clear merchant color variables
    root.style.removeProperty('--merchant-primary');
    root.style.removeProperty('--merchant-primary-foreground');
    root.style.removeProperty('--merchant-links');
    root.style.removeProperty('--merchant-brand');
    root.style.removeProperty('--merchant-box-shadow-color');

    // Clear merchant typography variables
    root.style.removeProperty('--merchant-brand-foreground');
    root.style.removeProperty('--merchant-default-foreground');
    root.style.removeProperty('--merchant-headings-foreground');
    root.style.removeProperty('--merchant-accent-foreground');

    // Clear merchant background variables
    root.style.removeProperty('--merchant-background');
    root.style.removeProperty('--merchant-background-image');

    // Clear merchant panel variables
    root.style.removeProperty('--merchant-panel');
    root.style.removeProperty('--merchant-panel-transparency');
    root.style.removeProperty('--merchant-panel-primary-foreground');
    root.style.removeProperty('--merchant-panel-accent-foreground');

    // Set dark SpiriVerse background for manage routes (matching practitioner dashboard)
    root.style.setProperty('--merchant-background-image', 'none');
    root.style.setProperty('--background', 'rgb(15, 23, 42)'); // slate-900

    // Cleanup function to restore theming when leaving manage routes
    return () => {
      // Restore default light background when leaving manage routes
      root.style.setProperty('--background', 'rgb(238, 238, 238)');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {children}
    </div>
  );
}