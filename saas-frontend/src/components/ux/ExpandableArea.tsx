import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Button, ButtonProps } from '../ui/button';
import { cn } from '@/lib/utils';

interface ExpandableAreaProps {
    heightPercent: number;
    readMoreButtonProps?: ButtonProps;
    children: ReactNode;
    verb?: string
}

const ExpandableArea: React.FC<ExpandableAreaProps> = ({ 
    heightPercent, 
    readMoreButtonProps,
    verb="Read", 
    children }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkHeight = () => {
            if (contentRef.current) {
                const contentHeight = contentRef.current.scrollHeight;
                const containerHeight = (heightPercent / 100) * window.innerHeight;
                setShowReadMore(contentHeight > containerHeight);
            }
        };

        checkHeight();
        window.addEventListener('resize', checkHeight);

        return () => {
            window.removeEventListener('resize', checkHeight);
        };
    }, [heightPercent]);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const contentStyle = showReadMore && !isExpanded
        ? { maxHeight: `${heightPercent}vh`, overflow: 'hidden' }
        : { maxHeight: 'none', overflow: 'visible' };

    const ReadMoreButton = () => {
        const { className, ...props } = readMoreButtonProps || {};

        return (
            <Button 
                className={cn(`justify-start pl-0 py-1`, className)}
                variant="link"
                onClick={toggleExpand}
                {...props}
            >
                { isExpanded ? `${verb} less` : `${verb} more` }
            </Button>
        );
    }

    return (
        <>
        <div
            ref={contentRef}
            style={contentStyle}
        >
            {children}
        </div>
        {showReadMore && (
            <ReadMoreButton />
        )}
        </>
    );
};

export default ExpandableArea;