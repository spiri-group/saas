'use client';

import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
    isVisible: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
}

const VisibilityToggle: React.FC<Props> = ({ 
    isVisible, 
    onToggle, 
    disabled = false,
    className 
}) => {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling to parent elements
        onToggle();
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                "h-8 w-8 p-0 hover:bg-transparent",
                "text-merchant-accent-foreground/60 hover:text-merchant-accent-foreground",
                className
            )}
            title={isVisible ? "Hide from customers" : "Show to customers"}
        >
            {isVisible ? (
                <Eye size={16} />
            ) : (
                <EyeOff size={16} />
            )}
        </Button>
    );
};

export default VisibilityToggle;