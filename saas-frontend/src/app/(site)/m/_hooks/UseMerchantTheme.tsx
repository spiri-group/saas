'use client'

import { useEffect } from 'react';
import { convert_color } from '@/lib/functions';
import UseVendorBranding from './UseVendorBranding';

/**
 * Custom hook that fetches merchant branding data and automatically applies
 * the theming CSS variables to the document root. This centralizes the theming
 * logic that was previously duplicated across components.
 * 
 * @param merchantId - The merchant ID to fetch branding for
 * @returns The branding query result (same as UseVendorBranding)
 */
const useMerchantTheme = (merchantId: string) => {
  const vendorBranding = UseVendorBranding(merchantId);

  // Apply theming CSS variables when branding data changes
  useEffect(() => {
    if (vendorBranding.data?.vendor.colors) {
      if (vendorBranding.data.vendor.colors.primary) {
        const primary_color = {
          background: convert_color(vendorBranding.data.vendor.colors.primary.background, "hex", "rgb"),
          foreground: convert_color(vendorBranding.data.vendor.colors.primary.foreground, "hex", "rgb")
        }
        document.documentElement.style.setProperty('--merchant-primary', primary_color.background);
        document.documentElement.style.setProperty('--merchant-primary-foreground', primary_color.foreground);
        
        // Set shadow colors for both light and dark themes
        const isDarkTheme = vendorBranding.data.vendor.selectedScheme === 'dark';
        if (isDarkTheme) {
          // For dark themes, use primary color for shadows
          const shadowColor = primary_color.background.replace("rgb(", "").replace(")", "");
          document.documentElement.style.setProperty('--merchant-box-shadow-color', shadowColor);
        } else {
          // For light themes, use a muted version of primary color for shadows
          const shadowColor = primary_color.background.replace("rgb(", "").replace(")", "");
          document.documentElement.style.setProperty('--merchant-box-shadow-color', shadowColor);
        }
      }

      if (vendorBranding.data.vendor.colors.links) {
        const links_color = convert_color(vendorBranding.data.vendor.colors.links, "hex", "rgb");
        document.documentElement.style.setProperty('--merchant-links', links_color);
      }
    }

    // Set background based on mode and scheme
    if (vendorBranding.data?.vendor) {
      const currentScheme = vendorBranding.data.vendor.selectedScheme || 'light';
      const isEasyMode = vendorBranding.data.vendor.mode === 'easy';
      
      if (isEasyMode) {
        // Easy mode: use scheme-based gradient
        if (currentScheme === 'dark') {
          document.documentElement.style.setProperty('--merchant-background-image', 'linear-gradient(to bottom, #000000, #0f172a, #1e293b)');
          document.documentElement.style.setProperty('--merchant-background', '0, 0, 0'); // fallback
        } else {
          document.documentElement.style.setProperty('--merchant-background-image', 'linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)');
          document.documentElement.style.setProperty('--merchant-background', '248, 250, 252'); // fallback
        }
      } else {
        // Advanced mode: use custom background
        if (vendorBranding.data.vendor.background?.color) {
          const background_color = convert_color(vendorBranding.data.vendor.background.color, "hex", "rgb");
          document.documentElement.style.setProperty('--merchant-background', background_color);
        }

        if (vendorBranding.data.vendor.background?.image) {
          document.documentElement.style.setProperty('--merchant-background-image', `url('${vendorBranding.data.vendor.background.image.url}')`);
        } else {
          document.documentElement.style.setProperty('--merchant-background-image', 'none');
        }
      }
    }

    // Legacy font color support
    if (vendorBranding.data?.vendor.font?.brand?.color) {
      const brand_color = convert_color(vendorBranding.data.vendor.font.brand.color, "hex", "rgb");
      document.documentElement.style.setProperty('--merchant-brand', brand_color);
    }

    // Panel styling
    if (vendorBranding.data?.vendor.panels) {
      if (vendorBranding.data.vendor.panels.background) {
        const panel_color = convert_color(vendorBranding.data.vendor.panels.background.color, "hex", "rgb");
        const transparency = vendorBranding.data.vendor.panels.background.transparency;
        document.documentElement.style.setProperty('--merchant-panel', panel_color.replace("rgb(", "").replace(")", ""));
        document.documentElement.style.setProperty('--merchant-panel-transparency', transparency.toString());
      }

      if (vendorBranding.data.vendor.panels.primary?.color) {
        const panel_font_color = convert_color(vendorBranding.data.vendor.panels.primary.color, "hex", "rgb");
        document.documentElement.style.setProperty('--merchant-panel-primary-foreground', panel_font_color);
      }

      if (vendorBranding.data.vendor.panels.accent?.color) {
        const panel_accent_color = convert_color(vendorBranding.data.vendor.panels.accent.color, "hex", "rgb");
        document.documentElement.style.setProperty('--merchant-panel-accent-foreground', panel_accent_color);
      }
    }

    // Font color variables
    if (vendorBranding.data?.vendor) {
      const currentScheme = vendorBranding.data.vendor.selectedScheme || 'light';
      const schemeForegroundColor = currentScheme === 'dark' ? '255, 255, 255' : '0, 0, 0';
      
      if (vendorBranding.data.vendor.font) {
        const fonts = vendorBranding.data.vendor.font;
        
        // Set font color variables (MerchantFontLoader will handle font families)
        if (fonts.brand?.color) {
          const brandColor = convert_color(fonts.brand.color, "hex", "rgb").replace("rgb(", "").replace(")", "");
          document.documentElement.style.setProperty('--merchant-brand-foreground', brandColor);
        } else {
          document.documentElement.style.setProperty('--merchant-brand-foreground', schemeForegroundColor);
        }
        
        if (fonts.default?.color) {
          const defaultColor = convert_color(fonts.default.color, "hex", "rgb").replace("rgb(", "").replace(")", "");
          document.documentElement.style.setProperty('--merchant-default-foreground', defaultColor);
        } else {
          document.documentElement.style.setProperty('--merchant-default-foreground', schemeForegroundColor);
        }
        
        if (fonts.headings?.color) {
          const headingsColor = convert_color(fonts.headings.color, "hex", "rgb").replace("rgb(", "").replace(")", "");
          document.documentElement.style.setProperty('--merchant-headings-foreground', headingsColor);
        } else {
          document.documentElement.style.setProperty('--merchant-headings-foreground', schemeForegroundColor);
        }
        
        if (fonts.accent?.color) {
          const accentColor = convert_color(fonts.accent.color, "hex", "rgb").replace("rgb(", "").replace(")", "");
          document.documentElement.style.setProperty('--merchant-accent-foreground', accentColor);
        } else {
          document.documentElement.style.setProperty('--merchant-accent-foreground', schemeForegroundColor);
        }
      } else {
        // If no fonts are defined, set all foreground colors to scheme defaults
        document.documentElement.style.setProperty('--merchant-brand-foreground', schemeForegroundColor);
        document.documentElement.style.setProperty('--merchant-default-foreground', schemeForegroundColor);
        document.documentElement.style.setProperty('--merchant-headings-foreground', schemeForegroundColor);
        document.documentElement.style.setProperty('--merchant-accent-foreground', schemeForegroundColor);
      }
    }
  }, [vendorBranding.data]);

  return vendorBranding;
};

export default useMerchantTheme;