'use client'

import { CalendarIcon, MapPinIcon, ExternalLinkIcon } from "lucide-react";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils";
import * as NextImage from "next/image";
import { vendor_event_type } from "@/utils/spiriverse";
import { useState, useEffect } from "react";


type UpcomingEventsTileProps = {
    events: any[];
    className?: string;
    merchantBranding?: any;
    highlightedEventId?: string; // ID of the currently featured event
}

const UpcomingEventsTile: React.FC<UpcomingEventsTileProps> = ({ events, className, merchantBranding, highlightedEventId }) => {
    if (!events || events.length === 0) return null;

    const formatEventDate = (startAt: string) => {
        const date = DateTime.fromISO(startAt);
        const now = DateTime.now();
        
        if (date.hasSame(now, 'day')) return 'Today';
        if (date.hasSame(now.plus({ days: 1 }), 'day')) return 'Tomorrow';
        return date.toFormat('MMM dd');
    };

    // Get merchant theme information (matching CatalogueItem logic)
    const merchantScheme = merchantBranding?.selectedScheme as 'light' | 'dark' || 'light';
    const panelTone = 'light'; // Events default to light panel tone
    const rounded = "xl";

    type Scheme = "dark" | "light";
    type PanelTone = "dark" | "light";

    const getPanelStyles = (scheme: Scheme, panelTone: PanelTone): React.CSSProperties => {
        const isDarkPanel = panelTone === "dark";
        const isDarkScheme = scheme === "dark";

        const bgLightGlass = "linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.65))";
        const bgLightFlat = "rgba(255, 255, 255, 0.7)";
        const bgDarkGlass = "linear-gradient(to bottom right, rgba(15,23,42,0.94), rgba(15,23,42,0.84))";
        const bgDarkFlat = "rgba(15, 23, 42, 0.9)";

        const background = isDarkPanel
            ? (isDarkScheme ? bgDarkGlass : bgDarkFlat)
            : (isDarkScheme ? bgLightGlass : bgLightFlat);

        const color = isDarkPanel ? "#F8FAFC" : "#0B1220";

        const border = `1px solid ${
            isDarkPanel
                ? (isDarkScheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)")
                : (isDarkScheme ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)")
        }`;

        const boxShadow = isDarkScheme
            ? "0 8px 24px rgba(0,0,0,0.35)"
            : "0 6px 20px rgba(2,6,23,0.15)";

        const backdropFilter = isDarkScheme ? "saturate(120%) blur(6px)" : "saturate(110%) blur(4px)";

        return { background, color, border, boxShadow, backdropFilter };
    };

    // Show up to 6 events in the list
    const displayEvents = events.slice(0, 6);

    return (
        <div 
            className={cn(
                "w-full flex flex-col h-full transition-all duration-300 ease-out",
                merchantScheme === 'light' 
                    ? "shadow-md border border-gray-200" 
                    : "shadow-xl",
                `rounded-${rounded}`, 
                className
            )}
        >
            {/* Compact Header */}
            <div 
                className={cn("relative w-full group overflow-hidden", `rounded-t-${rounded}`, "h-12 flex items-center justify-between px-3")} 
                style={{ 
                    background: merchantScheme === 'dark'
                        ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
                        : "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)"
                }}
            >
                <h3 className="font-bold text-xs text-white/90">
                    Upcoming Events
                </h3>
                
                {/* Badge */}
                <div 
                    className="px-2 py-0.5 text-xs font-bold rounded shadow-lg"
                    style={{ 
                        backgroundColor: "#dc2626",
                        color: "#ffffff"
                    }}
                >
                    {events.length}
                </div>
            </div>
            
            {/* Events List */}
            <div 
                className={`p-3 pt-2 flex-1 w-full flex flex-col gap-1.5 rounded-b-${rounded} overflow-y-auto`}
                style={getPanelStyles(merchantScheme, panelTone)}
            >
                {displayEvents.map((event, index) => {
                    const isHighlighted = highlightedEventId === event.id;
                    return (
                        <div 
                            key={event.id} 
                            className={cn(
                                "flex items-center justify-between p-2 rounded-md transition-all duration-300 relative group border-l-2",
                                isHighlighted 
                                    ? "bg-merchant-primary/20 border-l-merchant-primary shadow-sm scale-105" 
                                    : "hover:bg-black/5 border-l-transparent hover:border-l-merchant-primary/60",
                                index < displayEvents.length - 1 ? "border-b border-black/8 pb-2" : ""
                            )}
                        >
                            {/* Featured indicator */}
                            {isHighlighted && (
                                <div className="absolute -left-1 top-1 bottom-1 w-0.5 bg-merchant-primary animate-pulse"></div>
                            )}
                            
                            {/* Event title (left side, truncated) */}
                            <span className={cn(
                                "text-xs font-semibold truncate leading-tight flex-1 mr-2",
                                isHighlighted ? "text-merchant-primary" : ""
                            )}>
                                {event.title}
                            </span>
                            
                            {/* Date with calendar icon (right side) */}
                            <div className={cn(
                                "flex items-center text-xs flex-shrink-0",
                                isHighlighted ? "text-merchant-primary opacity-90" : "opacity-80"
                            )}>
                                <CalendarIcon className="h-2.5 w-2.5 mr-1" />
                                <span className="text-xs whitespace-nowrap">
                                    {formatEventDate(event.startAt)}
                                </span>
                            </div>
                        </div>
                    );
                })}
                
                {events.length > 6 && (
                    <div className="text-center text-xs opacity-60 py-1">
                        +{events.length - 6} more
                    </div>
                )}
            </div>
        </div>
    );
};

type FeaturedEventTileProps = {
    events: vendor_event_type[];
    className?: string;
    merchantBranding?: any;
    onCurrentEventChange?: (eventId: string) => void; // Callback when featured event changes
}

const FeaturedEventTile: React.FC<FeaturedEventTileProps> = ({ events, className, merchantBranding, onCurrentEventChange }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Notify parent when current event changes
    useEffect(() => {
        if (events[currentIndex] && onCurrentEventChange) {
            onCurrentEventChange(events[currentIndex].id);
        }
    }, [currentIndex, events, onCurrentEventChange]);
    
    // Cycle through events every 4 seconds
    useEffect(() => {
        if (events.length <= 1) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % events.length);
        }, 4000);
        
        return () => clearInterval(interval);
    }, [events.length]);

    if (!events || events.length === 0) return null;

    const currentEvent = events[currentIndex];
    const startDate = DateTime.fromISO(currentEvent.startAt);
    const isToday = startDate.hasSame(DateTime.now(), 'day');
    const isTomorrow = startDate.hasSame(DateTime.now().plus({ days: 1 }), 'day');
    
    const formatDate = () => {
        if (isToday) return 'Today';
        if (isTomorrow) return 'Tomorrow';
        return startDate.toFormat('MMM dd');
    };


    // Get merchant theme information
    const merchantScheme = merchantBranding?.selectedScheme as 'light' | 'dark' || 'light';
    const panelTone = 'light';
    const rounded = "xl";

    type Scheme = "dark" | "light";
    type PanelTone = "dark" | "light";

    const getPanelStyles = (scheme: Scheme, panelTone: PanelTone): React.CSSProperties => {
        const isDarkPanel = panelTone === "dark";
        const isDarkScheme = scheme === "dark";

        const bgLightGlass = "linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.65))";
        const bgLightFlat = "rgba(255, 255, 255, 0.7)";
        const bgDarkGlass = "linear-gradient(to bottom right, rgba(15,23,42,0.94), rgba(15,23,42,0.84))";
        const bgDarkFlat = "rgba(15, 23, 42, 0.9)";

        const background = isDarkPanel
            ? (isDarkScheme ? bgDarkGlass : bgDarkFlat)
            : (isDarkScheme ? bgLightGlass : bgLightFlat);

        const color = isDarkPanel ? "#F8FAFC" : "#0B1220";

        const border = `1px solid ${
            isDarkPanel
                ? (isDarkScheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)")
                : (isDarkScheme ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)")
        }`;

        const boxShadow = isDarkScheme
            ? "0 8px 24px rgba(0,0,0,0.35)"
            : "0 6px 20px rgba(2,6,23,0.15)";

        const backdropFilter = isDarkScheme ? "saturate(120%) blur(6px)" : "saturate(110%) blur(4px)";

        return { background, color, border, boxShadow, backdropFilter };
    };

    return (
        <div 
            className={cn(
                "w-full flex flex-col h-full transition-all duration-300 ease-out",
                merchantScheme === 'light' 
                    ? "shadow-md border border-gray-200" 
                    : "shadow-xl",
                `rounded-${rounded}`, 
                className
            )}
        >
            <div 
                className={cn("relative w-full group overflow-hidden", `rounded-t-${rounded}`, "h-60")} 
                style={{ 
                    background: merchantScheme === 'dark'
                        ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
                        : "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)"
                }}
            >
                {/* Image with fade transition */}
                <div className="relative w-full h-full group">
                    {currentEvent.landscapeImage && currentEvent.landscapeImage.image ? (
                        <NextImage.default 
                            key={`featured-${currentEvent.id}`}
                            src={currentEvent.landscapeImage.image.media.url}
                            className={`${`rounded-t-${rounded}`} transition-all duration-700 ease-in-out group-hover:scale-110`}
                            style={{ objectFit: "cover", height: "100%" }}
                            fill={true} 
                            alt={currentEvent.landscapeImage.image.media.title || currentEvent.title} 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <CalendarIcon className="h-16 w-16 text-white/30" />
                        </div>
                    )}
                    
                    {/* Hover description overlay */}
                    {currentEvent.description && (
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 rounded-t-xl">
                            <div className="text-white text-sm text-center max-h-full overflow-y-auto">
                                <div dangerouslySetInnerHTML={{ __html: currentEvent.description }} />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Event badges */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <div 
                        className="px-2 py-1 text-xs font-bold rounded shadow-lg bg-merchant-primary text-merchant-primary-foreground"
                    >
                        Featured Event
                    </div>
                    {events.length > 1 && (
                        <div 
                            className="px-2 py-1 text-xs font-medium rounded shadow-lg"
                            style={{ 
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "#ffffff"
                            }}
                        >
                            {currentIndex + 1} of {events.length}
                        </div>
                    )}
                </div>

                {/* Progress indicators */}
                {events.length > 1 && (
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                        <div className="flex gap-1">
                            {events.map((_, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-all duration-300",
                                        index === currentIndex 
                                            ? "bg-white" 
                                            : "bg-white/30"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <div 
                className={`p-3 px-4 h-20 w-full flex flex-col gap-1 rounded-b-${rounded}`}
                style={getPanelStyles(merchantScheme, panelTone)}
            >
                {/* First line: Event name on left, date on right */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate flex-1 mr-2">
                        {currentEvent.title}
                    </span>
                    <div className="flex items-center text-xs opacity-80 flex-shrink-0">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        <span>{formatDate()}</span>
                    </div>
                </div>
                
                {/* Second line: Address on left, URL on right */}
                <div className="flex items-center justify-between text-xs opacity-70">
                    <div className="flex items-center flex-1">
                        {currentEvent.location?.type === "physical" && currentEvent.location.address?.formattedAddress && (
                            <>
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                <span className="truncate">
                                    {currentEvent.location.address.formattedAddress}
                                </span>
                            </>
                        )}
                    </div>
                    
                    {/* External URL indicator */}
                    {currentEvent.location?.externalUrl && (
                        <div 
                            className="flex items-center cursor-pointer hover:opacity-100 transition-opacity ml-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(currentEvent.location.externalUrl, '_blank');
                            }}
                        >
                            <ExternalLinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="text-xs truncate max-w-20">
                                {currentEvent.location.externalUrl.replace(/^https?:\/\//, '').split('/')[0]}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { UpcomingEventsTile, FeaturedEventTile };