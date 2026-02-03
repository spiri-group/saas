'use client'

import { Star, Sparkles, ArrowRight, MapPin, Monitor, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import * as NextImage from "next/image";
import { FeaturedPractitioner, FeaturedService } from "../hooks/UseFeaturedPractitioners";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type FeaturedPractitionersTileProps = {
    practitioners: FeaturedPractitioner[];
    className?: string;
    merchantBranding?: any;
    onCurrentPractitionerChange?: (practitionerId: string) => void;
}

const FeaturedPractitionersTile: React.FC<FeaturedPractitionersTileProps> = ({
    practitioners,
    className,
    merchantBranding,
    onCurrentPractitionerChange
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Notify parent when current practitioner changes
    useEffect(() => {
        if (practitioners[currentIndex] && onCurrentPractitionerChange) {
            onCurrentPractitionerChange(practitioners[currentIndex].practitionerId);
        }
    }, [currentIndex, practitioners, onCurrentPractitionerChange]);

    // Cycle through practitioners every 5 seconds
    useEffect(() => {
        if (practitioners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % practitioners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [practitioners.length]);

    if (!practitioners || practitioners.length === 0) return null;

    const currentPractitioner = practitioners[currentIndex];

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
        <Link
            href={`/p/${currentPractitioner.practitionerSlug}`}
            className={cn(
                "w-full flex flex-col h-full transition-all duration-300 ease-out cursor-pointer",
                merchantScheme === 'light'
                    ? "shadow-md border border-gray-200 hover:shadow-lg"
                    : "shadow-xl hover:shadow-2xl",
                `rounded-${rounded}`,
                className
            )}
            data-testid={`featured-practitioner-card-${currentPractitioner.practitionerId}`}
        >
            <div
                className={cn("relative w-full group overflow-hidden", `rounded-t-${rounded}`, "h-60")}
                style={{
                    background: merchantScheme === 'dark'
                        ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
                        : "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)"
                }}
            >
                {/* Avatar/Image with fade transition */}
                <div className="relative w-full h-full group flex items-center justify-center">
                    {currentPractitioner.practitionerAvatar ? (
                        <NextImage.default
                            key={`featured-${currentPractitioner.practitionerId}`}
                            src={currentPractitioner.practitionerAvatar}
                            className={`${`rounded-t-${rounded}`} transition-all duration-700 ease-in-out group-hover:scale-110`}
                            style={{ objectFit: "cover", height: "100%" }}
                            fill={true}
                            alt={currentPractitioner.practitionerName}
                        />
                    ) : (
                        <Avatar className="h-32 w-32">
                            <AvatarFallback className="text-4xl bg-purple-600 text-white">
                                {currentPractitioner.practitionerName?.charAt(0) || "P"}
                            </AvatarFallback>
                        </Avatar>
                    )}

                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Featured badge */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <div
                        className="px-2 py-1 text-xs font-bold rounded shadow-lg bg-purple-600 text-white flex items-center gap-1"
                    >
                        <Sparkles className="h-3 w-3" />
                        Featured Practitioner
                    </div>
                    {practitioners.length > 1 && (
                        <div
                            className="px-2 py-1 text-xs font-medium rounded shadow-lg"
                            style={{
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "#ffffff"
                            }}
                        >
                            {currentIndex + 1} of {practitioners.length}
                        </div>
                    )}
                </div>

                {/* Rating badge */}
                {currentPractitioner.practitionerRating && currentPractitioner.practitionerRating.total_count > 0 && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded shadow-lg bg-black/70 text-white text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{currentPractitioner.practitionerRating.average.toFixed(1)}</span>
                        <span className="opacity-70">({currentPractitioner.practitionerRating.total_count})</span>
                    </div>
                )}

                {/* Progress indicators */}
                {practitioners.length > 1 && (
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                        <div className="flex gap-1">
                            {practitioners.map((_, index) => (
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
                className={`p-3 px-4 h-24 w-full flex flex-col gap-2 rounded-b-${rounded}`}
                style={getPanelStyles(merchantScheme, panelTone)}
            >
                {/* Name and View Profile button */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate flex-1 mr-2">
                        {currentPractitioner.practitionerName}
                    </span>
                    <div className="flex items-center text-xs text-purple-600 font-medium">
                        <span>View Profile</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                </div>

                {/* Headline */}
                {currentPractitioner.practitionerHeadline && (
                    <p className="text-xs opacity-70 line-clamp-1">
                        {currentPractitioner.practitionerHeadline}
                    </p>
                )}

                {/* Availability dots + delivery badges */}
                <div className="flex items-center gap-2">
                    {/* Day-of-week availability dots */}
                    {currentPractitioner.storeSchedule?.scheduleMode === "STORE_SPECIFIC" && currentPractitioner.storeSchedule.weekdays && (
                        <div className="flex items-center gap-0.5" data-testid="availability-dots">
                            {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
                                const dayData = currentPractitioner.storeSchedule?.weekdays?.find(d => d.day === i);
                                const isAvailable = dayData?.enabled ?? false;
                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                                            isAvailable
                                                ? "bg-green-500 text-white"
                                                : "bg-gray-200 text-gray-400"
                                        )}
                                        title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}: ${isAvailable ? "Available" : "Unavailable"}`}
                                    >
                                        {label}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Delivery badges */}
                    {currentPractitioner.deliveryContext?.inStore && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-green-100 text-green-700">
                            <MapPin className="w-2 h-2 mr-0.5" />
                            In-Store
                        </Badge>
                    )}
                    {currentPractitioner.deliveryContext?.online && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-blue-100 text-blue-700">
                            <Monitor className="w-2 h-2 mr-0.5" />
                            Online
                        </Badge>
                    )}
                </div>

                {/* Modalities */}
                {currentPractitioner.practitionerModalities && currentPractitioner.practitionerModalities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {currentPractitioner.practitionerModalities.slice(0, 3).map((modality) => (
                            <Badge
                                key={modality}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700"
                            >
                                {modality.replace(/_/g, " ")}
                            </Badge>
                        ))}
                        {currentPractitioner.practitionerModalities.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100">
                                +{currentPractitioner.practitionerModalities.length - 3}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
};

type FeaturedPractitionersListTileProps = {
    practitioners: FeaturedPractitioner[];
    className?: string;
    merchantBranding?: any;
    highlightedPractitionerId?: string;
}

const FeaturedPractitionersListTile: React.FC<FeaturedPractitionersListTileProps> = ({
    practitioners,
    className,
    merchantBranding,
    highlightedPractitionerId
}) => {
    if (!practitioners || practitioners.length === 0) return null;

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

    const displayPractitioners = practitioners.slice(0, 6);

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
                        : "linear-gradient(to bottom, #7c3aed, #6d28d9, #5b21b6)"
                }}
            >
                <h3 className="font-bold text-xs text-white/90 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Featured Practitioners
                </h3>

                {/* Badge */}
                <div
                    className="px-2 py-0.5 text-xs font-bold rounded shadow-lg"
                    style={{
                        backgroundColor: "#ffffff",
                        color: "#7c3aed"
                    }}
                >
                    {practitioners.length}
                </div>
            </div>

            {/* Practitioners List */}
            <div
                className={`p-3 pt-2 flex-1 w-full flex flex-col gap-1.5 rounded-b-${rounded} overflow-y-auto`}
                style={getPanelStyles(merchantScheme, panelTone)}
            >
                {displayPractitioners.map((practitioner, index) => {
                    const isHighlighted = highlightedPractitionerId === practitioner.practitionerId;
                    return (
                        <Link
                            href={`/p/${practitioner.practitionerSlug}`}
                            key={practitioner.id}
                            className={cn(
                                "flex items-center justify-between p-2 rounded-md transition-all duration-300 relative group border-l-2",
                                isHighlighted
                                    ? "bg-purple-500/20 border-l-purple-500 shadow-sm scale-105"
                                    : "hover:bg-black/5 border-l-transparent hover:border-l-purple-500/60",
                                index < displayPractitioners.length - 1 ? "border-b border-black/8 pb-2" : ""
                            )}
                        >
                            {/* Avatar and name */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={practitioner.practitionerAvatar} />
                                    <AvatarFallback className="bg-purple-600 text-white text-xs">
                                        {practitioner.practitionerName?.charAt(0) || "P"}
                                    </AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                    "text-xs font-semibold truncate leading-tight",
                                    isHighlighted ? "text-purple-600" : ""
                                )}>
                                    {practitioner.practitionerName}
                                </span>
                            </div>

                            {/* Rating */}
                            {practitioner.practitionerRating && practitioner.practitionerRating.total_count > 0 && (
                                <div className={cn(
                                    "flex items-center text-xs flex-shrink-0",
                                    isHighlighted ? "text-purple-600 opacity-90" : "opacity-80"
                                )}>
                                    <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs whitespace-nowrap">
                                        {practitioner.practitionerRating.average.toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </Link>
                    );
                })}

                {practitioners.length > 6 && (
                    <div className="text-center text-xs opacity-60 py-1">
                        +{practitioners.length - 6} more
                    </div>
                )}
            </div>
        </div>
    );
};

type FeaturedServiceCardProps = {
    service: FeaturedService;
    merchantBranding?: any;
    className?: string;
    priceOverride?: { amount: number; currency: string };
}

const FeaturedServiceCard: React.FC<FeaturedServiceCardProps> = ({
    service,
    merchantBranding,
    className,
    priceOverride
}) => {
    const merchantScheme = merchantBranding?.selectedScheme as 'light' | 'dark' || 'light';
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

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    return (
        <Link
            href={`/p/${service.practitionerSlug}/service/${service.id}?featuringId=${service.featuringRelationshipId}`}
            className={cn(
                "flex flex-col h-full transition-all duration-300 ease-out cursor-pointer",
                merchantScheme === 'light'
                    ? "shadow-md border border-gray-200 hover:shadow-lg"
                    : "shadow-xl hover:shadow-2xl",
                `rounded-${rounded}`,
                className
            )}
            data-testid={`featured-service-card-${service.id}`}
        >
            <div
                className={cn("relative w-full group overflow-hidden aspect-square", `rounded-t-${rounded}`)}
                style={{
                    background: merchantScheme === 'dark'
                        ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
                        : "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)"
                }}
            >
                {service.thumbnail?.url ? (
                    <NextImage.default
                        src={service.thumbnail.url}
                        className={`${`rounded-t-${rounded}`} transition-all duration-700 ease-in-out group-hover:scale-110`}
                        style={{ objectFit: "cover" }}
                        fill={true}
                        alt={service.name}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-purple-300" />
                    </div>
                )}

                {/* Featured badge */}
                <div className="absolute top-2 left-2 z-10">
                    <div className="px-2 py-1 text-[10px] font-bold rounded shadow-lg bg-purple-600 text-white flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Featured
                    </div>
                </div>

                {/* Price badge */}
                <div className="absolute bottom-2 right-2 z-10">
                    <div className="px-2 py-1 text-xs font-bold rounded shadow-lg bg-black/70 text-white">
                        {priceOverride
                            ? formatPrice(priceOverride.amount, priceOverride.currency)
                            : formatPrice(service.price.amount, service.price.currency)
                        }
                    </div>
                </div>
            </div>

            <div
                className={`p-3 flex-1 flex flex-col gap-1 rounded-b-${rounded}`}
                style={getPanelStyles(merchantScheme, 'light')}
            >
                <span className="text-sm font-bold truncate">
                    {service.name}
                </span>

                <div className="flex items-center gap-1.5 text-xs opacity-70">
                    <Avatar className="h-4 w-4">
                        <AvatarImage src={service.practitionerAvatar} />
                        <AvatarFallback className="bg-purple-600 text-white text-[8px]">
                            {service.practitionerName?.charAt(0) || "P"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{service.practitionerName}</span>
                </div>
            </div>
        </Link>
    );
};

type FeaturedPractitionersGridProps = {
    practitioners: FeaturedPractitioner[];
    className?: string;
    merchantBranding?: any;
}

const FeaturedPractitionersGrid: React.FC<FeaturedPractitionersGridProps> = ({
    practitioners,
    className,
    merchantBranding
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!practitioners || practitioners.length === 0) return null;

    const merchantScheme = merchantBranding?.selectedScheme as 'light' | 'dark' || 'light';

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)} data-testid="featured-practitioners-grid">
            {practitioners.map((practitioner) => {
                const isExpanded = expandedId === practitioner.id;
                const schedule = practitioner.storeSchedule;
                const delivery = practitioner.deliveryContext;
                const priceOverrides = practitioner.servicePriceOverrides;

                return (
                    <div
                        key={practitioner.id}
                        className={cn(
                            "rounded-xl overflow-hidden transition-all duration-300",
                            merchantScheme === 'light'
                                ? "shadow-md border border-gray-200 bg-white"
                                : "shadow-xl bg-slate-800/80 border border-slate-700"
                        )}
                        data-testid={`featured-grid-card-${practitioner.practitionerId}`}
                    >
                        {/* Header with avatar */}
                        <Link href={`/p/${practitioner.practitionerSlug}`} className="block p-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={practitioner.practitionerAvatar} />
                                    <AvatarFallback className="bg-purple-600 text-white">
                                        {practitioner.practitionerName?.charAt(0) || "P"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">{practitioner.practitionerName}</h3>
                                    {practitioner.practitionerHeadline && (
                                        <p className="text-xs opacity-70 truncate">{practitioner.practitionerHeadline}</p>
                                    )}
                                </div>
                                {practitioner.practitionerRating && practitioner.practitionerRating.total_count > 0 && (
                                    <div className="flex items-center gap-0.5 text-yellow-500 flex-shrink-0">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        <span className="text-xs font-medium">{practitioner.practitionerRating.average.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        </Link>

                        {/* Availability + Delivery badges */}
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                            {schedule?.scheduleMode === "STORE_SPECIFIC" && schedule.weekdays && (
                                <div className="flex items-center gap-0.5" data-testid={`grid-availability-dots-${practitioner.practitionerId}`}>
                                    {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
                                        const dayData = schedule.weekdays?.find(d => d.day === i);
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                                                    dayData?.enabled
                                                        ? "bg-green-500 text-white"
                                                        : "bg-gray-200 text-gray-400"
                                                )}
                                            >
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {delivery?.inStore && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700">
                                    <MapPin className="w-2.5 h-2.5 mr-0.5" /> In-Store
                                </Badge>
                            )}
                            {delivery?.online && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700">
                                    <Monitor className="w-2.5 h-2.5 mr-0.5" /> Online
                                </Badge>
                            )}
                        </div>

                        {/* Modalities */}
                        {practitioner.practitionerModalities && practitioner.practitionerModalities.length > 0 && (
                            <div className="px-4 pb-2 flex flex-wrap gap-1">
                                {practitioner.practitionerModalities.slice(0, 3).map((m) => (
                                    <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700">
                                        {m.replace(/_/g, " ")}
                                    </Badge>
                                ))}
                                {practitioner.practitionerModalities.length > 3 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100">
                                        +{practitioner.practitionerModalities.length - 3}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Expand/collapse for schedule + pricing details */}
                        <button
                            className={cn(
                                "w-full px-4 py-2 text-xs flex items-center justify-center gap-1 transition-colors",
                                merchantScheme === 'light'
                                    ? "text-purple-600 hover:bg-purple-50 border-t border-gray-100"
                                    : "text-purple-400 hover:bg-slate-700/50 border-t border-slate-700"
                            )}
                            onClick={() => setExpandedId(isExpanded ? null : practitioner.id)}
                            data-testid={`expand-practitioner-${practitioner.practitionerId}`}
                        >
                            {isExpanded ? (
                                <>Hide Details <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>View Schedule &amp; Pricing <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                            <div className={cn(
                                "px-4 pb-4 space-y-3",
                                merchantScheme === 'light' ? "bg-gray-50" : "bg-slate-800/50"
                            )}>
                                {/* Weekly schedule */}
                                {schedule?.scheduleMode === "STORE_SPECIFIC" && schedule.weekdays && (
                                    <div>
                                        <p className="text-xs font-semibold mb-1 opacity-70">Store Schedule</p>
                                        <div className="space-y-0.5">
                                            {schedule.weekdays.filter(d => d.enabled).map((day) => (
                                                <div key={day.day} className="flex justify-between text-xs">
                                                    <span className="font-medium">{day.dayName}</span>
                                                    <span className="opacity-70">
                                                        {day.timeSlots.map(s => `${s.start}-${s.end}`).join(", ")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(!schedule || schedule.scheduleMode === "PRACTITIONER_DEFAULT") && (
                                    <p className="text-xs opacity-50">Using practitioner&apos;s own schedule</p>
                                )}

                                {/* Price overrides */}
                                {priceOverrides && priceOverrides.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold mb-1 opacity-70">Services at this store</p>
                                        <div className="space-y-0.5">
                                            {priceOverrides.map((po) => (
                                                <div key={po.serviceId} className="flex justify-between text-xs">
                                                    <span>{po.serviceName}</span>
                                                    <span className="font-medium">
                                                        {po.fixedPrice ? formatPrice(po.fixedPrice.amount, po.fixedPrice.currency) : "Custom"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export { FeaturedPractitionersTile, FeaturedPractitionersListTile, FeaturedServiceCard, FeaturedPractitionersGrid };
