export type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const getThemeAwareShadow = (
    level: ShadowLevel = 'lg',
    scheme?: 'light' | 'dark'
): string => {
    // Use merchant colored shadows for dark theme, subtle shadows for light theme
    const isLight = scheme === 'light';
    
    if (isLight) {
        // Light theme: subtle black shadows
        switch (level) {
            case 'sm':
                return 'shadow-sm';
            case 'md':
                return 'shadow-md';
            case 'lg':
                return 'shadow-lg';
            case 'xl':
                return 'shadow-xl';
            case '2xl':
                return 'shadow-2xl';
            default:
                return 'shadow-lg';
        }
    } else {
        // Dark theme: colored shadows (same sizes as light mode, just colored)
        switch (level) {
            case 'sm':
                return 'shadow-sm shadow-merchant-sm';
            case 'md':
                return 'shadow-md shadow-merchant-md';
            case 'lg':
                return 'shadow-lg shadow-merchant-lg';
            case 'xl':
                return 'shadow-xl shadow-merchant-xl';
            case '2xl':
                return 'shadow-2xl shadow-merchant-2xl';
            default:
                return 'shadow-lg shadow-merchant-lg';
        }
    }
};

export const getThemeAwareHoverShadow = (
    level: ShadowLevel = 'xl',
    scheme?: 'light' | 'dark'
): string => {
    // Use merchant colored shadows for dark theme, subtle shadows for light theme
    const isLight = scheme === 'light';
    
    if (isLight) {
        // Light theme: subtle black hover shadows
        switch (level) {
            case 'sm':
                return 'hover:shadow-md';
            case 'md':
                return 'hover:shadow-lg';
            case 'lg':
                return 'hover:shadow-xl';
            case 'xl':
                return 'hover:shadow-2xl';
            case '2xl':
                return 'hover:shadow-2xl';
            default:
                return 'hover:shadow-xl';
        }
    } else {
        // Dark theme: colored hover shadows (same behavior as light mode, just colored)
        switch (level) {
            case 'sm':
                return 'hover:shadow-md hover:shadow-merchant-md';
            case 'md':
                return 'hover:shadow-lg hover:shadow-merchant-lg';
            case 'lg':
                return 'hover:shadow-xl hover:shadow-merchant-xl';
            case 'xl':
                return 'hover:shadow-2xl hover:shadow-merchant-2xl';
            case '2xl':
                return 'hover:shadow-2xl hover:shadow-merchant-2xl';
            default:
                return 'hover:shadow-xl hover:shadow-merchant-xl';
        }
    }
};

export const getThemeAwareBorder = (scheme: string | undefined): string => {
    const isDarkScheme = scheme === 'dark';
    
    if (isDarkScheme) {
        return 'border border-white/10';
    } else {
        return 'border border-slate-100';
    }
};