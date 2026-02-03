'use client';

import { useEffect } from 'react';

/** Spiritual-themed font categories for merchants */
const FONT_MAP: Record<string, { cssFamily: string; googleQuery: string; fallback: string }> = {
  // Clean & Modern
  'clean': {
    cssFamily: '"Inter", "Lato", "Open Sans", sans-serif',
    googleQuery: 'Inter:wght@300;400;500;600;700|Lato:wght@300;400;700',
    fallback: 'ui-sans-serif, system-ui, sans-serif',
  },
  
  // Elegant & Sophisticated
  'decorative': {
    cssFamily: '"Playfair Display", "Crimson Text", "Cormorant Garamond", serif',
    googleQuery: 'Playfair+Display:wght@300;400;500;600;700|Crimson+Text:wght@400;600',
    fallback: 'ui-serif, Georgia, "Libre Baskerville", serif',
  },
  
  // Flowing & Artistic
  'script': {
    cssFamily: '"Satisfy", "Great Vibes", "Pacifico", cursive',
    googleQuery: 'Satisfy|Great+Vibes',
    fallback: '"Apple Chancery", "Brush Script MT", "Lucida Handwriting", cursive',
  },
  
  // Personal & Warm
  'written': {
    cssFamily: '"Playwrite US Modern", "Kalam", "Caveat", cursive',
    googleQuery: 'Playwrite+US+Modern:wght@100..400',
    fallback: '"Comic Sans MS", "Marker Felt", cursive',
  },
  
  // Mystical & Ancient
  'gothic': {
    cssFamily: '"Cinzel", "Cinzel Decorative", "Uncial Antiqua", serif',
    googleQuery: 'Cinzel:wght@400;500;600|Cinzel+Decorative:wght@400;700',
    fallback: '"Copperplate", "Optima", "Avenir", serif',
  },
  
  // Modern & Technical
  'robot': {
    cssFamily: '"JetBrains Mono", "Source Code Pro", "Fira Code", monospace',
    googleQuery: 'JetBrains+Mono:wght@300;400;500;700|Source+Code+Pro:wght@400;600',
    fallback: '"Courier New", "Monaco", monospace',
  },
};

type FontConfig = {
  brand?: string;
  default?: string;
  headings?: string;
  accent?: string;
};

export default function MerchantFontLoader({ fonts }: { fonts?: FontConfig }) {
  useEffect(() => {
    // Set CSS variables for each font type
    const brandFont = fonts?.brand && FONT_MAP[fonts.brand] ? FONT_MAP[fonts.brand] : FONT_MAP['clean'];
    const defaultFont = fonts?.default && FONT_MAP[fonts.default] ? FONT_MAP[fonts.default] : FONT_MAP['clean'];
    const headingsFont = fonts?.headings && FONT_MAP[fonts.headings] ? FONT_MAP[fonts.headings] : FONT_MAP['clean'];
    const accentFont = fonts?.accent && FONT_MAP[fonts.accent] ? FONT_MAP[fonts.accent] : FONT_MAP['clean'];

    // Set CSS variables immediately to avoid reflow
    document.documentElement.style.setProperty('--font-merchant-brand', brandFont.cssFamily);
    document.documentElement.style.setProperty('--font-merchant-default', defaultFont.cssFamily);
    document.documentElement.style.setProperty('--font-merchant-headings', headingsFont.cssFamily);
    document.documentElement.style.setProperty('--font-merchant-accent', accentFont.cssFamily);

    // Collect unique fonts to load
    const uniqueFonts = new Set<string>();
    if (fonts?.brand && FONT_MAP[fonts.brand]) uniqueFonts.add(FONT_MAP[fonts.brand].googleQuery);
    if (fonts?.default && FONT_MAP[fonts.default]) uniqueFonts.add(FONT_MAP[fonts.default].googleQuery);
    if (fonts?.headings && FONT_MAP[fonts.headings]) uniqueFonts.add(FONT_MAP[fonts.headings].googleQuery);
    if (fonts?.accent && FONT_MAP[fonts.accent]) uniqueFonts.add(FONT_MAP[fonts.accent].googleQuery);
    
    // If no fonts specified, load default
    if (uniqueFonts.size === 0) {
      uniqueFonts.add(defaultFont.googleQuery);
    }

    if (uniqueFonts.size === 0) return;

    // Create preconnect links
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';

    // Create stylesheet link with all unique fonts
    const fontQueries = Array.from(uniqueFonts).join('|');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fontQueries.split('|').map(q => `family=${q}`).join('&')}&display=swap`;

    document.head.append(preconnect1, preconnect2, link);
    return () => { 
      preconnect1.remove(); 
      preconnect2.remove(); 
      link.remove(); 
    };
  }, [fonts]);

  return null;
}