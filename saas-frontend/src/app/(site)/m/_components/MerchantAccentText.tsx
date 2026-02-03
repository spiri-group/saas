'use client';

import { cn } from "@/lib/utils";

type AccentTextProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'accent' | 'heading' | 'default';
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
};

/**
 * Component that automatically applies merchant accent font and styling
 * to specific content types in vendor profiles using CSS variables
 */
export default function MerchantAccentText({ 
  children, 
  className, 
  variant = 'accent',
  as: Component = 'span' 
}: AccentTextProps) {
  
  // Get the appropriate font family class based on variant
  const getFontClass = () => {
    switch (variant) {
      case 'heading':
        return 'font-merchant-headings';
      case 'default':
        return 'font-merchant-default';
      case 'accent':
      default:
        return 'font-merchant-accent';
    }
  };

  // Get the appropriate color class based on variant
  const getColorClass = () => {
    switch (variant) {
      case 'heading':
        return 'text-merchant-headings-foreground';
      case 'default':
        return 'text-merchant-default-foreground';
      case 'accent':
      default:
        return 'text-merchant-accent-foreground';
    }
  };

  return (
    <Component 
      className={cn(
        getFontClass(),
        getColorClass(),
        variant === 'accent' && 'font-medium tracking-wide',
        variant === 'heading' && 'font-semibold',
        className
      )}
    >
      {children}
    </Component>
  );
}

/**
 * Pre-configured accent text components for common use cases
 */
export const MerchantBusinessName = ({ children, className, ...props }: Omit<AccentTextProps, 'variant'>) => (
  <span className={cn("text-lg font-bold font-merchant-brand text-merchant-brand-foreground", className)} {...props}>
    {children}
  </span>
);

export const MerchantHeading = ({ children, className, as = 'h2', ...props }: Omit<AccentTextProps, 'variant'>) => (
  <MerchantAccentText variant="heading" as={as} className={cn("text-xl font-semibold", className)} {...props}>
    {children}
  </MerchantAccentText>
);

export const MerchantTagline = ({ children, className, ...props }: Omit<AccentTextProps, 'variant'>) => (
  <MerchantAccentText variant="accent" className={cn("italic text-sm", className)} {...props}>
    {children}
  </MerchantAccentText>
);

export const MerchantQuote = ({ children, className, ...props }: Omit<AccentTextProps, 'variant'>) => (
  <MerchantAccentText variant="accent" className={cn("italic text-lg quotes", className)} {...props}>
    {children}
  </MerchantAccentText>
);

export const MerchantLocationTitle = ({ children, className, ...props }: Omit<AccentTextProps, 'variant'>) => (
  <MerchantAccentText variant="accent" className={cn("font-medium", className)} {...props}>
    {children}
  </MerchantAccentText>
);