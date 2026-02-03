export interface BaseTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    accent: string;
    links: string;
  };
}

export interface ThemeScheme {
  id: 'light' | 'dark';
  name: string;
  background: string;
  foreground: string;
}

export interface PanelTone {
  id: 'light' | 'dark';
  name: string;
}

// 10 Base Themes
export const BASE_THEMES: BaseTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blues with cosmic undertones',
    colors: {
      primary: '#3b82f6',
      accent: '#6366f1',
      links: '#3b82f6'
    }
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Rich purples with gold highlights',
    colors: {
      primary: '#8b5cf6',
      accent: '#fbbf24',
      links: '#8b5cf6'
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural greens and earth tones',
    colors: {
      primary: '#22c55e',
      accent: '#84cc16',
      links: '#22c55e'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges and coral tones',
    colors: {
      primary: '#f97316',
      accent: '#ef4444',
      links: '#f97316'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calming blues and aqua tones',
    colors: {
      primary: '#06b6d4',
      accent: '#0ea5e9',
      links: '#06b6d4'
    }
  },
  {
    id: 'sand',
    name: 'Sand',
    description: 'Warm beiges and desert tones',
    colors: {
      primary: '#d97706',
      accent: '#92400e',
      links: '#d97706'
    }
  },
  {
    id: 'berry',
    name: 'Berry',
    description: 'Rich pinks and magenta tones',
    colors: {
      primary: '#ec4899',
      accent: '#f472b6',
      links: '#ec4899'
    }
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Professional grays and charcoal',
    colors: {
      primary: '#64748b',
      accent: '#475569',
      links: '#3b82f6'
    }
  },
  {
    id: 'jade',
    name: 'Jade',
    description: 'Fresh mint and emerald greens',
    colors: {
      primary: '#10b981',
      accent: '#059669',
      links: '#10b981'
    }
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Golden yellows and honey tones',
    colors: {
      primary: '#f59e0b',
      accent: '#d97706',
      links: '#f59e0b'
    }
  }
];

// 2 UI Schemes
export const THEME_SCHEMES: ThemeScheme[] = [
  {
    id: 'light',
    name: 'Light',
    background: '#f8fafc', // Off-white instead of pure white
    foreground: '#000000'
  },
  {
    id: 'dark',
    name: 'Dark', 
    background: '#000000',
    foreground: '#ffffff'
  }
];

// 2 Panel Tones
export const PANEL_TONES: PanelTone[] = [
  {
    id: 'light',
    name: 'Light Panel'
  },
  {
    id: 'dark',
    name: 'Dark Panel'
  }
];

// Helper functions to get panel styling based on theme + scheme + tone
export const getPanelStyling = (themeColors: BaseTheme['colors'], scheme: 'light' | 'dark', tone: 'light' | 'dark') => {
  const primaryRgb = hexToRgb(themeColors.primary);
  
  if (scheme === 'dark' && tone === 'dark') {
    // Dark Panel inside dark theme -> muted theme color with separation
    return {
      background: `rgba(${primaryRgb}, 0.25)`,
      foreground: '#e5e5e5',
      border: `rgba(${primaryRgb}, 0.3)`
    };
  }
  
  if (scheme === 'dark' && tone === 'light') {
    // Light panel inside dark theme -> "pop" with theme color accent
    return {
      background: `rgba(248, 248, 248, 0.95)`,
      foreground: themeColors.primary,
      border: `rgba(${primaryRgb}, 0.2)`
    };
  }
  
  if (scheme === 'light' && tone === 'dark') {
    // Dark panel inside light theme -> bold with theme color
    return {
      background: `rgba(${primaryRgb}, 0.9)`,
      foreground: '#ffffff',
      border: `rgba(${primaryRgb}, 0.2)`
    };
  }
  
  // Light panel inside light theme -> crisp and clean with subtle shadows
  return {
    background: `rgba(255, 255, 255, 0.9)`,
    foreground: themeColors.primary,
    border: `rgba(${primaryRgb}, 0.25)`,
    shadow: '0 1px 3px rgba(0, 0, 0, 0.1)', // Subtle shadow instead of glow
    borderWidth: '1px'
  };
};

// Helper to convert hex to RGB
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
};

export const getBaseThemeById = (id: string): BaseTheme | undefined => {
  return BASE_THEMES.find(theme => theme.id === id);
};

export const getThemeSchemeById = (id: 'light' | 'dark'): ThemeScheme | undefined => {
  return THEME_SCHEMES.find(scheme => scheme.id === id);
};

export const getPanelToneById = (id: 'light' | 'dark'): PanelTone | undefined => {
  return PANEL_TONES.find(tone => tone.id === id);
};