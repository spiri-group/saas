'use client';

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

type Props = {
    title: string;
    isExpanded: boolean;
    onClick?: () => void;
    className?: string;
    icon?: React.ReactNode;
    rightContent?: React.ReactNode;
}

const MerchantCardTitle: React.FC<Props> = ({ 
    title, 
    isExpanded, 
    onClick, 
    className,
    icon,
    rightContent 
}) => {
    const isClickable = onClick !== undefined;
    const Component = isClickable ? 'button' : 'div';
    
    return (
        <Component
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between p-4 text-left",
                isClickable && "hover:opacity-80 transition-opacity cursor-pointer",
                className
            )}
        >
            <div className="flex items-center space-x-3">
                {icon && (
                    <div className="text-merchant-accent-foreground">
                        {icon}
                    </div>
                )}
                <span className="font-semibold text-xl text-merchant-headings-foreground font-merchant-headings transition-colors group-hover:text-merchant-primary">
                    {title}
                </span>
            </div>
            <div className="flex items-center space-x-2">
                {rightContent}
                {isClickable && (isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4 text-merchant-accent-foreground flex-shrink-0" />
                ) : (
                    <ChevronDownIcon className="h-4 w-4 text-merchant-accent-foreground flex-shrink-0" />
                ))}
            </div>
        </Component>
    );
};

export default MerchantCardTitle;