'use client';

import React from "react";
import { vendor_type } from "@/utils/spiriverse";
import { Mail, Phone, LinkIcon, MapPin } from "lucide-react";
import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { isNullOrWhitespace } from "@/lib/functions";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type ContactButtonProps = {
    vendor: vendor_type;
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    } | null;
};

export const FloatingContactButton: React.FC<ContactButtonProps> = ({ vendor, visibility }) => {
    // Hide completely if visibility is explicitly null (customer view + not visible)
    if (visibility === null) {
        return null;
    }

    const hasContactInfo = !isNullOrWhitespace(vendor.contact?.public?.email) || 
                          vendor.contact?.public?.phoneNumber != null || 
                          !isNullOrWhitespace(vendor.website);

    if (!hasContactInfo) {
        return null;
    }

    return (
        <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
                <Button
                    variant="default"
                    size="icon"
                    className={cn(
                        "rounded-full w-14 h-14 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl group",
                        visibility && !visibility.isVisible && "opacity-50"
                    )}
                    style={{
                        backgroundColor: vendor.colors?.primary?.background || 'var(--primary)',
                        color: vendor.colors?.primary?.foreground || 'var(--primary-foreground)'
                    }}
                >
                    <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Phone size={22} />
                    </motion.div>
                </Button>
            </HoverCardTrigger>
            <HoverCardContent 
                side="right" 
                align="center"
                sideOffset={16}
                className="w-80 backdrop-blur-sm font-merchant-default text-merchant-default-foreground border-0 shadow-xl"
                style={{
                    backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency))`,
                }}
                asChild
            >
                <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <div className="flex flex-col space-y-3">
                    <h4 className="font-semibold text-sm font-merchant-headings text-merchant-headings-foreground">Contact Information</h4>
                    {!isNullOrWhitespace(vendor.contact.public.email) && (
                        <Link 
                            href={`mailto:${vendor.contact.public.email}`} 
                            className="flex flex-row items-center space-x-3 hover:underline text-sm text-merchant-links"
                        >
                            <Mail style={vendor.colors != null ? {
                                color: `${vendor.colors.primary.background}`
                            } : {}} size={16} />
                            <span className="text-merchant-default-foreground">{vendor.contact.public.email}</span>
                        </Link>
                    )}
                    {vendor.contact.public.phoneNumber != null && (
                        <Link 
                            href={`tel:${vendor.contact.public.phoneNumber.value}`} 
                            className="flex flex-row items-center space-x-3 hover:underline text-sm text-merchant-links"
                        >
                            <Phone style={vendor.colors != null ? {
                                color: `${vendor.colors.primary.background}`
                            } : {}} size={16} />
                            <span className="text-merchant-default-foreground">{vendor.contact.public.phoneNumber.displayAs}</span>
                        </Link>
                    )}
                    {!isNullOrWhitespace(vendor.website) && (
                        <Link 
                            target="_blank" 
                            href={vendor.website} 
                            className="flex flex-row items-center space-x-3 hover:underline text-sm text-merchant-links"
                        >
                            <LinkIcon style={vendor.colors != null ? {
                                color: `${vendor.colors.primary.background}`
                            } : {}} size={16} />
                            <span className="truncate text-merchant-default-foreground">{vendor.website}</span>
                        </Link>
                    )}
                </div>
                </motion.div>
            </HoverCardContent>
        </HoverCard>
    );
};

type LocationButtonProps = {
    vendor: vendor_type;
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    } | null;
};

export const FloatingLocationButton: React.FC<LocationButtonProps> = ({ vendor, visibility }) => {
    // Hide completely if visibility is explicitly null (customer view + not visible)
    if (visibility === null) {
        return null;
    }

    if (!vendor.locations || vendor.locations.length === 0) {
        return null;
    }

    return (
        <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
                <Button
                    variant="default"
                    size="icon"
                    className={cn(
                        "rounded-full w-14 h-14 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl group",
                        visibility && !visibility.isVisible && "opacity-50"
                    )}
                    style={{
                        backgroundColor: vendor.colors?.primary?.background || 'var(--primary)',
                        color: vendor.colors?.primary?.foreground || 'var(--primary-foreground)'
                    }}
                >
                    <motion.div
                        whileHover={{ 
                            y: [0, -4, 0, -4, 0],
                            scale: 1.1 
                        }}
                        transition={{ duration: 0.6 }}
                    >
                        <MapPin size={22} />
                    </motion.div>
                </Button>
            </HoverCardTrigger>
            <HoverCardContent 
                side="right" 
                align="center"
                sideOffset={16}
                className="w-80 backdrop-blur-sm max-h-96 overflow-y-auto font-merchant-default text-merchant-default-foreground border-0 shadow-xl"
                style={{
                    backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency))`,
                }}
                asChild
            >
                <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <div className="flex flex-col space-y-3">
                    <h4 className="font-semibold text-sm font-merchant-headings text-merchant-headings-foreground">
                        {vendor.locations.length === 1 ? 'Location' : `Locations (${vendor.locations.length})`}
                    </h4>
                    <ul className="flex flex-col space-y-3">
                        {vendor.locations.map((location) => (
                            <li key={location.id} className="flex flex-col space-y-1">
                                <div className="flex flex-row space-x-2 items-start">
                                    <MapPin 
                                        color={vendor.colors != null ? vendor.colors.primary.background : "var(--primary)"}
                                        className="flex-none mt-0.5" 
                                        size={14} 
                                    />
                                    <div className="flex flex-col flex-grow">
                                        <span className="font-medium text-sm font-merchant-accent text-merchant-accent-foreground">{location.title}</span>
                                        <span className="text-xs text-merchant-default-foreground opacity-75">
                                            {location.address.formattedAddress}
                                        </span>
                                        {location.services && location.services.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {location.services.slice(0, 3).map((service, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className="text-xs px-2 py-0.5 rounded-full"
                                                        style={{
                                                            backgroundColor: vendor.colors?.primary?.background ? 
                                                                `${vendor.colors.primary.background}20` : 
                                                                'var(--primary-20)',
                                                            color: vendor.colors?.primary?.background || 'var(--primary)'
                                                        }}
                                                    >
                                                        {service}
                                                    </span>
                                                ))}
                                                {location.services.length > 3 && (
                                                    <span className="text-xs text-merchant-default-foreground opacity-75">
                                                        +{location.services.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                </motion.div>
            </HoverCardContent>
        </HoverCard>
    );
};
