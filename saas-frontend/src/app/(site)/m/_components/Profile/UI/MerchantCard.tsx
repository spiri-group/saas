'use client';

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { vendor_type } from "@/utils/spiriverse";
import { getThemeAwareShadow, getThemeAwareHoverShadow, getThemeAwareBorder } from "../utils/themeAwareShadows";
import MerchantCardTitle from "./MerchantCardTitle";
import VisibilityToggle from "./VisibilityToggle";

type Props = {
    vendor: vendor_type;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    expandable?: boolean;
    defaultExpanded?: boolean;
    title?: string;
    titleIcon?: React.ReactNode;
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    };
}

const MerchantCard: React.FC<Props> = ({ 
    vendor, 
    children, 
    className, 
    style, 
    expandable = false, 
    defaultExpanded = false, 
    title,
    titleIcon,
    visibility
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // For customers (no visibility prop), hide invisible cards completely
    // For owners (visibility prop exists), never hide - just gray out instead
    
    const shadowClasses = {
        primary: getThemeAwareShadow('lg', vendor.selectedScheme as 'light' | 'dark'),
        hover: getThemeAwareHoverShadow('xl', vendor.selectedScheme as 'light' | 'dark'),
        border: getThemeAwareBorder(vendor.selectedScheme)
    };

    // Gray out the card if owner is viewing and it's set to not visible
    const isGrayedOut = visibility && !visibility.isVisible;

    if (title) {
        return (
            <div 
                className={cn(
                    "rounded-xl transition-all duration-200 backdrop-blur-sm font-merchant-default text-merchant-default-foreground",
                    shadowClasses.primary,
                    shadowClasses.hover,
                    shadowClasses.border,
                    isGrayedOut && "opacity-50 grayscale",
                    className
                )}
                style={{ 
                    backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency))`,
                    ...style
                }}
            >
                {/* Header */}
                <MerchantCardTitle
                    title={title}
                    icon={titleIcon}
                    isExpanded={isExpanded}
                    onClick={expandable ? () => setIsExpanded(!isExpanded) : undefined}
                    rightContent={visibility && (
                        <VisibilityToggle
                            isVisible={visibility.isVisible}
                            onToggle={visibility.toggle}
                            disabled={visibility.isPending}
                        />
                    )}
                />
                
                {/* Content */}
                {(expandable ? isExpanded : true) && (
                    <div className={expandable ? "px-4 pb-4 border-t border-merchant-accent-foreground/10" : "px-4 pb-4"}>
                        <div className={expandable ? "pt-3" : ""}>
                            {children}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className={cn(
                "rounded-xl transition-all duration-200 backdrop-blur-sm font-merchant-default text-merchant-default-foreground",
                shadowClasses.primary,
                shadowClasses.hover,
                shadowClasses.border,
                isGrayedOut && "opacity-50 grayscale",
                className
            )}
            style={{ 
                backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency))`,
                ...style
            }}
        >
            {visibility ? (
                <div className="flex flex-col">
                    <div className="flex items-center justify-between p-4 pb-2">
                        <div className="flex-grow" />
                        <VisibilityToggle
                            isVisible={visibility.isVisible}
                            onToggle={visibility.toggle}
                            disabled={visibility.isPending}
                        />
                    </div>
                    <div className="px-4 pb-4">
                        {children}
                    </div>
                </div>
            ) : (
                <div className="p-4">
                    {children}
                </div>
            )}
        </div>
    );
};

export default MerchantCard;