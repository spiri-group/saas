'use client';

import { useState, useRef, useEffect } from "react";
import { Session } from "next-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { Star, Heart, MessageCircle, Calendar, CalendarDays, Clock, MapPin, Shield, Award, Sparkles, ShoppingCart, Send, Loader2, Play, Video, Mic, Sun, Pause, Pin, Store, ImageIcon, Wand2 } from "lucide-react";
import { iconsMapping } from "@/icons/social";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Card imports removed — sections are now full-width, no card wrappers
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useIsFollowing, useFollowMerchant, useUnfollowMerchant } from "../../m/_hooks/UseFollow";
import PractitionerSideNav from "../_components/PractitionerSideNav";
import { GalleryTile, MediaThumbnail } from "@/components/ux/GalleryTiles";
import { gallery_item_type } from "@/utils/spiriverse";
import CurrencySpan from "@/components/ux/CurrencySpan";

interface PractitionerProfile {
    pronouns?: string;
    headline: string;
    bio: string;
    spiritualJourney?: string;
    modalities: string[];
    gifts?: string[];
    tools?: {
        id: string;
        name: string;
        description?: string;
        image?: {
            name: string;
            url: string;
            urlRelative: string;
            size: string;
            type: string;
        };
    }[];
    specializations: string[];
    customSpecializations?: string[];
    yearsExperience?: number;
    training?: {
        id: string;
        title: string;
        institution?: string;
        year?: number;
        description?: string;
    }[];
    readingStyle?: string;
    approach?: string;
    whatToExpect?: string;
    clientPrepGuidance?: string;
    availability: string;
    acceptingNewClients: boolean;
    responseTime?: string;
    timezone?: string;
    verification: {
        identityVerified: boolean;
        practitionerVerified: boolean;
        verifiedAt?: string;
        badges?: string[];
    };
    audioIntro?: {
        name: string;
        url: string;
        urlRelative: string;
        size: string;
        type: string;
        durationSeconds?: number;
    };
    oracleMessage?: {
        id: string;
        audio: {
            name: string;
            url: string;
            urlRelative: string;
            size: string;
            type: string;
            durationSeconds?: number;
        };
        message?: string;
        postedAt: string;
        expiresAt: string;
    };
    pinnedReviewIds?: string[];
    linkedShopfronts?: {
        merchantId: string;
        merchantSlug: string;
        merchantName: string;
        merchantLogo?: string;
        displayOrder: number;
    }[];
}

interface VideoMedia {
    url: string;
    description?: string;
}

interface Video {
    media: VideoMedia;
    coverPhoto?: {
        url: string;
    };
}

interface VideoUpdate {
    id: string;
    media: {
        url: string;
        name?: string;
        type?: string;
    };
    coverPhoto?: {
        url: string;
    };
    caption?: string;
    postedAt: string;
}

interface SocialPlatform {
    id: string;
    platform: string;
    url: string;
    handle?: string;
}

interface Practitioner {
    id: string;
    name: string;
    slug: string;
    docType: string;
    practitioner: PractitionerProfile;
    logo?: {
        url: string;
    };
    thumbnail?: {
        image?: {
            media?: {
                url: string;
            };
        };
    };
    banner?: {
        url: string;
    };
    country?: string;
    readingRating?: {
        total_count: number;
        average: number;
    };
    videos?: Video[];
    videoUpdates?: VideoUpdate[];
    videoSettings?: {
        autoplay: boolean;
        autoplayDelay: number;
    };
    social?: {
        style: 'solid' | 'outline';
        platforms: SocialPlatform[];
    };
}

interface Service {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    deliveryMode?: string;
    pricing?: {
        type: string;
        fixedPrice?: {
            amount: number;
            currency: string;
        };
    };
    turnaroundDays?: number;
    thumbnail?: {
        image?: {
            media?: {
                url: string;
            };
        };
    };
}

// Modality display labels
const MODALITY_LABELS: Record<string, string> = {
    TAROT: 'Tarot',
    ORACLE: 'Oracle Cards',
    ASTROLOGY: 'Astrology',
    NUMEROLOGY: 'Numerology',
    MEDIUMSHIP: 'Mediumship',
    CHANNELING: 'Channeling',
    REIKI: 'Reiki',
    ENERGY_HEALING: 'Energy Healing',
    CRYSTAL_HEALING: 'Crystal Healing',
    AKASHIC_RECORDS: 'Akashic Records',
    PAST_LIFE: 'Past Life Reading',
    BREATHWORK: 'Breathwork',
    SOUND_HEALING: 'Sound Healing',
    COACHING: 'Spiritual Coaching',
    COUNSELING: 'Counseling',
    OTHER: 'Other',
};

// Specialization display labels
const SPECIALIZATION_LABELS: Record<string, string> = {
    GRIEF_LOSS: 'Grief & Loss',
    RELATIONSHIPS: 'Relationships',
    CAREER: 'Career',
    LIFE_PURPOSE: 'Life Purpose',
    SPIRITUAL_AWAKENING: 'Spiritual Awakening',
    ANCESTRAL_HEALING: 'Ancestral Healing',
    SHADOW_WORK: 'Shadow Work',
    SELF_DISCOVERY: 'Self Discovery',
    DECISION_MAKING: 'Decision Making',
    HEALTH_WELLNESS: 'Health & Wellness',
    PAST_LIVES: 'Past Lives',
    SPIRIT_COMMUNICATION: 'Spirit Communication',
    OTHER: 'Other',
};

const usePractitionerProfile = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-profile', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: Practitioner }>(
                `query GetPractitioner($id: String!) {
                    vendor(id: $id) {
                        id
                        name
                        slug
                        docType
                        practitioner {
                            pronouns
                            headline
                            bio
                            spiritualJourney
                            modalities
                            gifts
                            tools {
                                id
                                name
                                description
                                image {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                }
                            }
                            specializations
                            customSpecializations
                            yearsExperience
                            training {
                                id
                                title
                                institution
                                year
                                description
                            }
                            readingStyle
                            approach
                            whatToExpect
                            clientPrepGuidance
                            availability
                            acceptingNewClients
                            responseTime
                            timezone
                            verification {
                                identityVerified
                                practitionerVerified
                                verifiedAt
                                badges
                            }
                            audioIntro {
                                name
                                url
                                urlRelative
                                size
                                type
                                durationSeconds
                            }
                            oracleMessage {
                                id
                                audio {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                    durationSeconds
                                }
                                message
                                postedAt
                                expiresAt
                            }
                            pinnedReviewIds
                            linkedShopfronts {
                                merchantId
                                merchantSlug
                                merchantName
                                merchantLogo
                                displayOrder
                            }
                        }
                        logo {
                            url
                        }
                        thumbnail {
                            image {
                                media {
                                    url
                                }
                            }
                        }
                        banner {
                            url
                        }
                        country
                        readingRating {
                            total_count
                            average
                        }
                        videos {
                            media {
                                url
                                description
                            }
                            coverPhoto {
                                url
                            }
                        }
                        videoUpdates {
                            id
                            media {
                                url
                                name
                                type
                            }
                            coverPhoto {
                                url
                            }
                            caption
                            postedAt
                        }
                        videoSettings {
                            autoplay
                            autoplayDelay
                        }
                        social {
                            style
                            platforms {
                                id
                                platform
                                url
                                handle
                            }
                        }
                    }
                }`,
                { id: practitionerId }
            );
            return response.vendor;
        },
        enabled: !!practitionerId,
    });
};

const usePractitionerServices = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-services', practitionerId],
        queryFn: async () => {
            const response = await gql<{ services: Service[] }>(
                `query GetPractitionerServices($merchantId: ID!) {
                    services(merchantId: $merchantId) {
                        id
                        name
                        slug
                        description
                        category
                        deliveryMode
                        pricing {
                            type
                            fixedPrice {
                                amount
                                currency
                            }
                        }
                        turnaroundDays
                        thumbnail {
                            image {
                                media {
                                    url
                                }
                            }
                        }
                    }
                }`,
                { merchantId: practitionerId }
            );
            return (response?.services || []).filter(s => s != null);
        },
        enabled: !!practitionerId,
    });
};

interface PractitionerReview {
    id: string;
    rating: number;
    headline: string;
    text: string;
    createdAt: string;
    userName?: string;
}

const usePractitionerReviews = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-reviews', practitionerId],
        queryFn: async () => {
            const response = await gql<{ practitionerReviews: PractitionerReview[] }>(
                `query GetPractitionerReviews($practitionerId: ID!) {
                    practitionerReviews(practitionerId: $practitionerId) {
                        id
                        rating
                        headline
                        text
                        createdAt
                        userName
                    }
                }`,
                { practitionerId }
            );
            return response.practitionerReviews || [];
        },
        enabled: !!practitionerId,
    });
};

interface VendorEvent {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    timezone: string;
    location: {
        type: 'physical' | 'digital';
        address?: {
            formattedAddress: string;
        };
        externalUrl?: string;
    };
    description?: string;
    landscapeImage?: {
        image?: {
            media?: {
                url: string;
            };
        };
    };
}

const usePractitionerEvents = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-events', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendorEvents: VendorEvent[] }>(
                `query GetPractitionerEvents($vendorId: ID!) {
                    vendorEvents(vendorId: $vendorId) {
                        id
                        title
                        startAt
                        endAt
                        timezone
                        location {
                            type
                            address {
                                formattedAddress
                            }
                            externalUrl
                        }
                        description
                        landscapeImage {
                            image {
                                media {
                                    url
                                }
                            }
                        }
                    }
                }`,
                { vendorId: practitionerId }
            );
            return response.vendorEvents || [];
        },
        enabled: !!practitionerId,
    });
};

const usePractitionerGallery = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-gallery', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                catalogueGalleryItems: gallery_item_type[];
            }>(`
                query GetPractitionerGallery($merchantId: ID!, $limit: Int) {
                    catalogueGalleryItems(merchantId: $merchantId, limit: $limit) {
                        id
                        type
                        title
                        description
                        url
                        thumbnailUrl
                        layout
                        groupId
                        categoryId
                        linkedProducts {
                            id
                            title
                            thumbnailUrl
                            price {
                                amount
                                currency
                            }
                        }
                        tags
                        ref {
                            id
                            partition
                            container
                        }
                        createdAt
                    }
                }
            `, { merchantId: practitionerId, limit: 30 });
            return response.catalogueGalleryItems || [];
        },
        enabled: !!practitionerId,
    });
};

interface PractitionerProfileContentProps {
    session: Session | null;
    practitionerId: string;
    slug: string;
}

// Types for conversation
interface ConversationMessage {
    id: string;
    text: string;
    sentAt: string;
    posted_by_user?: {
        id: string;
        firstname: string;
        lastname?: string;
    };
    posted_by_vendor?: {
        id: string;
        name: string;
    };
}

// Hook for getting customer's conversation with practitioner
// Uses the same messages query that ChatControl uses for consistency
const useCustomerConversation = (practitionerId: string, visitorId: string | undefined, enabled: boolean) => {
    // Build the conversation forObject - same structure as Message Center
    const conversationId = visitorId ? `conv-${visitorId}-${practitionerId}` : null;
    const forObject = conversationId ? {
        id: conversationId,
        partition: [practitionerId],
        container: "Main-Conversation"
    } : null;

    return useQuery({
        queryKey: ['customer-conversation', practitionerId, visitorId],
        queryFn: async () => {
            if (!forObject) return null;

            // Use the same messages query that ChatControl uses
            const response = await gql<{ messages: ConversationMessage[] }>(
                `query GetMessagesForConversation($forObject: RecordRefInput!) {
                    messages(forObject: $forObject) {
                        id
                        text
                        sentAt
                        posted_by_user {
                            id
                            firstname
                            lastname
                        }
                        posted_by_vendor {
                            id
                            name
                        }
                    }
                }`,
                { forObject }
            );

            return {
                conversationId,
                messages: response.messages || [],
                forObject
            };
        },
        enabled: enabled && !!practitionerId && !!visitorId,
    });
};

// Hook for sending a message to practitioner
const useSendMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, message }: { practitionerId: string; message: string }) => {
            const response = await gql<{ sendMessageToPractitioner: { success: boolean; conversationId: string } }>(`
                mutation SendMessageToPractitioner($practitionerId: ID!, $message: String!) {
                    sendMessageToPractitioner(practitionerId: $practitionerId, message: $message) {
                        success
                        conversationId
                    }
                }
            `, { practitionerId, message });
            return response.sendMessageToPractitioner;
        },
        onSuccess: (_, variables) => {
            // Invalidate conversation to refetch messages
            queryClient.invalidateQueries({ queryKey: ['customer-conversation', variables.practitionerId] });
        }
    });
};

// Video Stories Dialog — opens from avatar indicator in the hero
interface VideoStoriesDialogProps {
    videos: Video[];
    practitionerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function VideoStoriesDialog({ videos, practitionerName, open, onOpenChange }: VideoStoriesDialogProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentVideo = videos[currentIndex];
    const hasMultiple = videos.length > 1;

    const goNext = () => setCurrentIndex((i) => (i < videos.length - 1 ? i + 1 : 0));
    const goPrev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : videos.length - 1));

    // Reset index when dialog opens
    useEffect(() => {
        if (open) setCurrentIndex(0);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[85vw] sm:!w-[calc(55vh*9/16)] sm:!max-w-[75vw] !max-h-[calc(55vh+3rem)] p-0 bg-black border-white/10 overflow-hidden flex flex-col" data-testid="video-stories-dialog">
                <DialogHeader className="sr-only">
                    <DialogTitle>{practitionerName}&apos;s Video Updates</DialogTitle>
                    <DialogDescription>Watch video updates from {practitionerName}</DialogDescription>
                </DialogHeader>

                {/* Video */}
                <div className="relative">
                    {/* Progress bars */}
                    {hasMultiple && (
                        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5">
                            {videos.map((_, i) => (
                                <div key={i} className="flex-1 h-1 rounded-full bg-white/20">
                                    <div className={`h-full rounded-full transition-all ${i <= currentIndex ? 'bg-white' : 'bg-transparent'}`} />
                                </div>
                            ))}
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        key={currentVideo.media.url}
                        src={currentVideo.media.url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full max-h-[55vh] object-cover bg-black"
                        onEnded={() => { if (hasMultiple) goNext(); }}
                    />

                    {/* Tap zones for prev/next */}
                    {hasMultiple && (
                        <>
                            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={goPrev} />
                            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={goNext} />
                        </>
                    )}

                    {/* Caption */}
                    {currentVideo.media.description && (
                        <div className="absolute bottom-4 inset-x-0 px-4 z-10 pointer-events-none">
                            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                                <p className="text-white text-sm">{currentVideo.media.description}</p>
                            </div>
                        </div>
                    )}

                    {/* Counter */}
                    {hasMultiple && (
                        <div className="absolute top-8 right-3 z-20 text-white/60 text-xs">
                            {currentIndex + 1} / {videos.length}
                        </div>
                    )}
                </div>

                {/* Close button — big, at the bottom */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="w-full py-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium border-t border-white/10"
                >
                    Close
                </button>
            </DialogContent>
        </Dialog>
    );
}

// Audio Introduction Section Component
interface AudioIntroSectionProps {
    audioIntro: {
        name: string;
        url: string;
        urlRelative: string;
        size: string;
        type: string;
        durationSeconds?: number;
    };
    practitionerName: string;
}

function AudioIntroSection({ audioIntro, practitionerName }: AudioIntroSectionProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <section className="py-8 md:py-10" data-testid="audio-intro-section">
            <div className="px-4 md:px-8 lg:px-12">
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden">
                    <audio
                        ref={audioRef}
                        src={audioIntro.url}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => setIsPlaying(false)}
                    />
                    <button
                        type="button"
                        onClick={togglePlay}
                        className="w-14 h-14 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 rounded-full transition-colors flex-shrink-0 shadow-lg"
                    >
                        {isPlaying ? (
                            <Pause className="h-6 w-6 text-white" />
                        ) : (
                            <Play className="h-6 w-6 text-white ml-0.5" />
                        )}
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 mb-2">
                            <Mic className="w-4 h-4 text-indigo-400 inline-block mr-1.5 -mt-0.5" />
                            Meet {practitionerName}
                        </p>
                        <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                            <div
                                className="bg-indigo-400 h-2 rounded-full transition-all"
                                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-white/40">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-white/40 mt-3 text-center">
                    Listen to {practitionerName}&apos;s voice introduction to get a sense of their energy and style.
                </p>
            </div>
        </section>
    );
}

// Daily Oracle Message Section Component
interface OracleMessageSectionProps {
    oracleMessage: {
        id: string;
        audio: {
            name: string;
            url: string;
            urlRelative: string;
            size: string;
            type: string;
            durationSeconds?: number;
        };
        message?: string;
        postedAt: string;
        expiresAt: string;
    };
    practitionerName: string;
}

function OracleMessageSection({ oracleMessage, practitionerName }: OracleMessageSectionProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Check if oracle message has expired
    const isExpired = new Date(oracleMessage.expiresAt) < new Date();
    if (isExpired) return null;

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Calculate time remaining
    const getTimeRemaining = () => {
        const now = new Date();
        const expiry = new Date(oracleMessage.expiresAt);
        const diff = expiry.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    // Format post time
    const formatPostedTime = () => {
        const posted = new Date(oracleMessage.postedAt);
        return posted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <section className="border-y border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-amber-900/20 to-amber-950/30" data-testid="oracle-message-section">
            <div className="px-4 md:px-8 lg:px-12 py-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Sun className="w-5 h-5 text-amber-400" />
                        <span className="text-amber-300 font-semibold">Daily Oracle</span>
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                            {getTimeRemaining()} remaining
                        </Badge>
                    </div>
                    <p className="text-sm text-amber-200/60">
                        Today&apos;s message from {practitionerName}, shared at {formatPostedTime()}
                    </p>
                </div>

                {/* Audio player */}
                <div className="relative mt-4 bg-white/5 border border-amber-500/20 rounded-xl p-4">
                    <audio
                        ref={audioRef}
                        src={oracleMessage.audio.url}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => setIsPlaying(false)}
                    />

                    <div className="flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={togglePlay}
                            className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-full transition-all flex-shrink-0 shadow-lg"
                        >
                            {isPlaying ? (
                                <Pause className="h-5 w-5 text-white" />
                            ) : (
                                <Play className="h-5 w-5 text-white ml-0.5" />
                            )}
                        </button>
                        <div className="flex-grow">
                            <p className="text-sm font-medium text-amber-200 mb-2">Listen to Today&apos;s Oracle</p>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                                <div
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-amber-400/60">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Caption overlay - shows during playback */}
                    {oracleMessage.message && isPlaying && (
                        <div className="mt-3 animate-in fade-in duration-300">
                            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3">
                                <p className="text-amber-100 text-sm font-medium text-center leading-relaxed">
                                    {oracleMessage.message}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// Gallery Section Component
interface PractitionerGallerySectionProps {
    items: gallery_item_type[];
    practitionerId: string;
    slug: string;
}

function PractitionerGallerySection({ items, practitionerId, slug }: PractitionerGallerySectionProps) {
    const PREVIEW_COUNT = 8;
    const displayItems = items.slice(0, PREVIEW_COUNT);
    const hasMore = items.length > PREVIEW_COUNT;

    return (
        <section className="py-12 md:py-16 bg-slate-900/50" data-testid="gallery-section">
            <div className="px-4 md:px-8 lg:px-12">
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 text-center">
                    <ImageIcon className="w-6 h-6 md:w-7 md:h-7 text-indigo-400 inline-block mr-3 -mt-1" />
                    Gallery
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" style={{ '--border': 'rgba(255, 255, 255, 0.1)' } as React.CSSProperties}>
                    {displayItems.map((item) => (
                        <div key={item.id} data-testid={`gallery-item-${item.id}`}>
                            <GalleryTile
                                item={item}
                                merchantId={practitionerId}
                            />
                        </div>
                    ))}
                </div>
                {hasMore && (
                    <div className="flex justify-center mt-8">
                        <Link
                            href={`/p/${slug}/gallery`}
                            data-testid="gallery-view-all-btn"
                        >
                            <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
                                View all {items.length} items
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}

export default function PractitionerProfileContent({
    session,
    practitionerId,
    slug,
}: PractitionerProfileContentProps) {
    const isAuthenticated = !!session?.user;
    // Check if the logged-in user is the owner of this practitioner profile
    const isOwner = session?.user?.vendors?.some(v => v.id === practitionerId) ?? false;
    const { data: practitioner, isLoading, error } = usePractitionerProfile(practitionerId);
    const { data: services } = usePractitionerServices(practitionerId);
    const { data: reviews } = usePractitionerReviews(practitionerId);
    const { data: events } = usePractitionerEvents(practitionerId);
    const { data: galleryItems } = usePractitionerGallery(practitionerId);

    // Follow state
    const { data: isFollowing, isLoading: isFollowingLoading } = useIsFollowing(practitionerId);
    const followMutation = useFollowMerchant();
    const unfollowMutation = useUnfollowMerchant();

    // Message dialog state
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);
    const [messageText, setMessageText] = useState('');
    const sendMessageMutation = useSendMessage();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversation when dialog opens
    const { data: conversation, isLoading: conversationLoading } = useCustomerConversation(
        practitionerId,
        session?.user?.id,
        messageDialogOpen && isAuthenticated
    );

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation?.messages]);

    // Video stories state
    const [videoStoriesOpen, setVideoStoriesOpen] = useState(false);

    // Ref for services section
    const servicesRef = useRef<HTMLDivElement>(null);

    const handleFollowToggle = () => {
        if (isFollowing) {
            unfollowMutation.mutate(practitionerId);
        } else {
            followMutation.mutate(practitionerId);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;

        try {
            await sendMessageMutation.mutateAsync({ practitionerId, message: messageText });
            setMessageText('');
            // Don't close dialog - keep conversation open
        } catch {
            toast.error("Error", {
                description: "Failed to send message. Please try again.",
            });
        }
    };

    const formatMessageTime = (sentAt: string) => {
        const date = new Date(sentAt);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) {
            return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    };

    const handleBookReading = () => {
        // Scroll to services section
        if (servicesRef.current) {
            servicesRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const isFollowPending = followMutation.isPending || unfollowMutation.isPending;

    if (isLoading) {
        return <ProfileSkeleton />;
    }

    if (error || !practitioner) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-white mb-2">Practitioner not found</h1>
                    <p className="text-white/60">This practitioner profile may have been removed or is not yet public.</p>
                </div>
            </div>
        );
    }

    const profile = practitioner.practitioner;

    // Build video list — prefer videoUpdates, fall back to legacy videos
    const videoUpdateVideos: Video[] = (practitioner.videoUpdates || [])
        .filter(v => v.media?.url && !v.media.url.endsWith('/'))
        .map(v => ({
            media: { url: v.media.url, description: v.caption || undefined },
            coverPhoto: v.coverPhoto?.url ? { url: v.coverPhoto.url } : undefined,
        }));
    const legacyVideos: Video[] = (practitioner.videos || [])
        .filter(v => v.media?.url && !v.media.url.endsWith('/'));
    const allVideos = videoUpdateVideos.length > 0 ? videoUpdateVideos : legacyVideos;

    // Check if any video update was posted in the last 3 days
    const hasRecentVideoUpdate = (practitioner.videoUpdates || []).some(v => {
        if (!v.postedAt) return false;
        const postedDate = new Date(v.postedAt);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return postedDate > threeDaysAgo;
    });

    return (
        <>
            {/* Show sidebar for practitioner owners */}
            {isOwner && session && (
                <PractitionerSideNav
                    session={session}
                    practitionerId={practitionerId}
                    practitionerSlug={slug}
                />
            )}
            <div className={`min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 ${isOwner ? 'md:ml-[200px]' : ''}`}>
                {/* Hero Section */}
                <div className="relative">
                    {/* Background — fixed height, overflow hidden for image containment */}
                    <div className="h-[30vh] md:h-[45vh] lg:h-[50vh] overflow-hidden">
                        {practitioner.banner?.url ? (
                            <>
                                <Image
                                    src={practitioner.banner.url}
                                    alt={practitioner.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-950" />
                        )}
                    </div>

                    {/* Profile info — overlaps hero with negative margin, flows naturally on mobile */}
                    <div className="relative z-10 -mt-20 md:-mt-56 lg:-mt-72 px-4 md:px-8 lg:px-12 pb-6 md:pb-8">
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-2xl border-2 border-white/20 shadow-2xl" data-testid="practitioner-profile-avatar">
                                    <AvatarImage src={practitioner.logo?.url || practitioner.thumbnail?.image?.media?.url} alt={practitioner.name} className="rounded-2xl" data-testid="practitioner-profile-avatar-img" />
                                    <AvatarFallback className="text-2xl sm:text-3xl md:text-5xl bg-indigo-900 text-indigo-300 rounded-2xl" data-testid="practitioner-profile-avatar-fallback">
                                        {practitioner.name?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                                            {practitioner.name}
                                        </h1>
                                        {profile?.pronouns && (
                                            <span className="text-sm text-white/50">({profile.pronouns})</span>
                                        )}
                                        {profile?.headline && (
                                            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 mt-1">{profile.headline}</p>
                                        )}
                                    </div>

                                    {/* Verification badges */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        {profile?.verification?.practitionerVerified && (
                                            <Badge className="bg-white/10 text-white/80 border-white/20">
                                                <Shield className="w-3 h-3 mr-1" />
                                                Verified
                                            </Badge>
                                        )}
                                        {profile?.verification?.badges?.includes('FEATURED') && (
                                            <Badge className="bg-white/10 text-white/80 border-white/20">
                                                <Award className="w-3 h-3 mr-1" />
                                                Featured
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex flex-wrap gap-3 sm:gap-4 mt-2 sm:mt-3 text-sm text-white/70">
                                    {practitioner.readingRating && practitioner.readingRating.total_count > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            <span className="font-semibold text-white">{practitioner.readingRating.average.toFixed(1)}</span>
                                            <span>({practitioner.readingRating.total_count} reviews)</span>
                                        </div>
                                    )}
                                    {profile?.yearsExperience && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-indigo-400" />
                                            <span>{profile.yearsExperience} years experience</span>
                                        </div>
                                    )}
                                    {practitioner.country && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4 text-indigo-400" />
                                            <span>{practitioner.country}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Availability */}
                                <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    {profile?.acceptingNewClients ? (
                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 w-fit">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Accepting New Clients
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-white/10 text-white/50 border-white/10 w-fit">
                                            Not Accepting New Clients
                                        </Badge>
                                    )}
                                    {profile?.responseTime && (
                                        <span className="text-sm text-white/50">
                                            Usually responds within {profile.responseTime}
                                        </span>
                                    )}
                                </div>

                                {/* CTA Buttons */}
                                <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-5">
                                    <Button
                                        className="bg-white text-indigo-900 hover:bg-white/90 font-semibold"
                                        onClick={handleBookReading}
                                        data-testid="book-reading-btn"
                                    >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Book a Reading
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                                        onClick={() => setMessageDialogOpen(true)}
                                        data-testid="send-message-btn"
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        Send Message
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-white/80 hover:text-white hover:bg-white/10"
                                        onClick={handleFollowToggle}
                                        disabled={!isAuthenticated || isFollowPending || isFollowingLoading}
                                        data-testid="follow-btn"
                                        title={!isAuthenticated ? 'Login to follow' : undefined}
                                    >
                                        {isFollowPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                                        )}
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Button>
                                </div>

                                {/* Social Links */}
                                {practitioner.social && practitioner.social.platforms && practitioner.social.platforms.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3 sm:mt-4" data-testid="social-links">
                                        {practitioner.social.platforms.map((social) => (
                                            <a
                                                key={social.id}
                                                href={social.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:opacity-80 transition-opacity"
                                                title={social.handle || social.platform}
                                                data-testid={`social-link-${social.platform}`}
                                            >
                                                {practitioner.social?.style === 'solid' ? (
                                                    <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                                        {iconsMapping[social.platform]?.('solid')}
                                                    </div>
                                                ) : (
                                                    <div className="p-2 text-white/70 hover:text-white transition-colors">
                                                        {iconsMapping[social.platform]?.('outline')}
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Video Updates — compact preview strip in hero */}
                                {allVideos.length > 0 && (
                                    <div className="flex items-center gap-3 mt-3 sm:mt-4" data-testid="video-section">
                                        <button
                                            onClick={() => setVideoStoriesOpen(true)}
                                            className="relative flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 transition-colors group"
                                        >
                                            {hasRecentVideoUpdate && (
                                                <span className="absolute -top-2 -right-2 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 shadow-lg animate-pulse">
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-200" />
                                                    </span>
                                                    New
                                                </span>
                                            )}
                                            <div className="flex -space-x-2">
                                                {allVideos.slice(0, 3).map((video, i) => (
                                                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border-2 border-slate-950 flex-shrink-0 relative">
                                                        <MediaThumbnail
                                                            item={{
                                                                type: 'video',
                                                                url: video.media.url,
                                                                thumbnailUrl: video.coverPhoto?.url,
                                                                title: video.media.description || 'Video update',
                                                            }}
                                                            className="w-full h-full object-cover"
                                                            showPlayIcon={false}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Play className="w-4 h-4 text-white/70 fill-white/70 group-hover:text-white group-hover:fill-white transition-colors" />
                                                <span className="text-xs sm:text-sm text-white/70 group-hover:text-white transition-colors">
                                                    {allVideos.length === 1 ? 'Video Update' : `${allVideos.length} Video Updates`}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* === FULL-WIDTH SECTIONS — single column flow === */}

                {/* Oracle Message Strip */}
                {profile?.oracleMessage && (
                    <OracleMessageSection
                        oracleMessage={profile.oracleMessage}
                        practitionerName={practitioner.name}
                    />
                )}

                {/* Audio Introduction */}
                {profile?.audioIntro && (
                    <AudioIntroSection
                        audioIntro={profile.audioIntro}
                        practitionerName={practitioner.name}
                    />
                )}

                {/* Services Section */}
                {services && services.filter(s => s != null).length > 0 && (
                    <section ref={servicesRef} className="py-12 md:py-16 bg-slate-900/50" data-testid="services-section">
                        <div className="px-4 md:px-8 lg:px-12">
                            <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 text-center">
                                <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 text-indigo-400 inline-block mr-3 -mt-1" />
                                Available Services
                            </h2>
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {services.filter(s => s != null).map((service) => {
                                    const imageUrl = service.thumbnail?.image?.media?.url;
                                    const hasImage = imageUrl && !imageUrl.endsWith('/');
                                    return (
                                    <Link
                                        key={service.id}
                                        href={`/p/${slug}/services/${service.slug || service.id}`}
                                        className="block group"
                                    >
                                        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-indigo-400/30 hover:bg-white/[0.07] transition-all h-full flex flex-col">
                                            {/* Service image — only shown when a real image URL exists */}
                                            {hasImage && (
                                                <div className="relative h-48 overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={imageUrl}
                                                        alt={service.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            )}
                                            <div className={`p-5 flex flex-col flex-1 ${!hasImage ? 'justify-center' : ''}`}>
                                                <h4 className="text-lg font-semibold text-white truncate">{service.name}</h4>
                                                {service.description && (
                                                    <div className="text-sm text-white/60 line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: service.description }} />
                                                )}
                                                <div className="flex items-center gap-3 mt-3">
                                                    {service.pricing?.fixedPrice && (
                                                        <span className="text-xl font-bold text-indigo-300">
                                                            <CurrencySpan value={service.pricing.fixedPrice} withAnimation={false} />
                                                        </span>
                                                    )}
                                                    {service.category && (
                                                        <Badge className="bg-white/10 text-white/60 border-white/10 text-xs">
                                                            {service.category}
                                                        </Badge>
                                                    )}
                                                    {service.turnaroundDays && (
                                                        <span className="text-xs text-white/40">
                                                            {service.turnaroundDays} day delivery
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* Gallery Section */}
                {galleryItems && galleryItems.length > 0 && (
                    <PractitionerGallerySection
                        items={galleryItems}
                        practitionerId={practitionerId}
                        slug={slug}
                    />
                )}

                {/* About + Modalities — two-column layout */}
                <section className="py-12 md:py-16">
                    <div className="px-4 md:px-8 lg:px-12">
                        <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-16">
                            {/* Left — Modalities & Specializations */}
                            {((profile?.modalities && profile.modalities.length > 0) || (profile?.specializations && profile.specializations.length > 0) || (profile?.tools && profile.tools.length > 0) || (profile?.training && profile.training.length > 0)) && (
                                <div className="lg:sticky lg:top-8 lg:self-start">
                                    <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-6">
                                        Services & Specializations
                                    </h2>

                                    {profile?.modalities && profile.modalities.length > 0 && (
                                        <div className="mb-6">
                                            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Modalities</p>
                                            <div className="flex flex-wrap gap-2">
                                                {profile.modalities.map((mod) => (
                                                    <Badge key={mod} className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                                        {MODALITY_LABELS[mod] || mod}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {profile?.specializations && profile.specializations.length > 0 && (
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Specializations</p>
                                            <div className="flex flex-wrap gap-2">
                                                {profile.specializations.map((spec) => (
                                                    <Badge key={spec} className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                                        {SPECIALIZATION_LABELS[spec] || spec}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Training & Credentials */}
                                    {profile?.training && profile.training.length > 0 && (
                                        <div className="mt-8 pt-8 border-t border-white/10">
                                            <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-5">
                                                <Award className="w-4 h-4 text-indigo-400 inline-block mr-2 -mt-0.5" />
                                                Training & Credentials
                                            </h3>
                                            <div className="space-y-4">
                                                {profile.training.map((cred) => (
                                                    <div key={cred.id} className="border-l-2 border-indigo-400/30 pl-4">
                                                        <h4 className="font-medium text-white text-sm">{cred.title}</h4>
                                                        {cred.institution && (
                                                            <p className="text-xs text-white/60">{cred.institution}</p>
                                                        )}
                                                        {cred.year && (
                                                            <p className="text-xs text-white/40">{cred.year}</p>
                                                        )}
                                                        {cred.description && (
                                                            <p className="text-xs text-white/60 mt-1">{cred.description}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tools Collection */}
                                    {profile?.tools && profile.tools.length > 0 && (
                                        <div className="mt-8 pt-8 border-t border-white/10">
                                            <h3 className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-5">
                                                <Wand2 className="w-4 h-4 text-purple-400 inline-block mr-2 -mt-0.5" />
                                                Tools Collection
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {profile.tools.map((tool) => (
                                                    <div key={tool.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                                        {tool.image?.url ? (
                                                            <img
                                                                src={tool.image.url}
                                                                alt={tool.name}
                                                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                                <Wand2 className="w-5 h-5 text-purple-400" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <h4 className="font-medium text-white text-sm truncate">{tool.name}</h4>
                                                            {tool.description && (
                                                                <p className="text-xs text-white/50 line-clamp-1">{tool.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Right — About the medium */}
                            {(profile?.bio || profile?.spiritualJourney || profile?.approach || profile?.whatToExpect) && (
                                <div>
                                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-8">
                                        About {practitioner.name}
                                    </h2>
                                    <div className="space-y-8">
                                        {profile?.bio && (
                                            <div>
                                                <p className="text-lg md:text-xl text-white/70 whitespace-pre-line leading-relaxed">{profile.bio}</p>
                                            </div>
                                        )}

                                        {profile?.spiritualJourney && !(profile.bio && profile.bio.includes(profile.spiritualJourney)) && (
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-semibold text-white/90 mb-3">My Spiritual Journey</h3>
                                                <p className="text-white/60 whitespace-pre-line leading-relaxed">{profile.spiritualJourney}</p>
                                            </div>
                                        )}

                                        {profile?.approach && !(profile.bio && profile.bio.includes(profile.approach)) && (
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-semibold text-white/90 mb-3">My Approach</h3>
                                                <p className="text-white/60 whitespace-pre-line leading-relaxed">{profile.approach}</p>
                                            </div>
                                        )}

                                        {profile?.whatToExpect && (
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-semibold text-white/90 mb-3">What to Expect</h3>
                                                <p className="text-white/60 whitespace-pre-line leading-relaxed">{profile.whatToExpect}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Reviews Section */}
                <section className="py-12 md:py-16 bg-indigo-950/50" data-testid="reviews-section">
                    <div className="px-4 md:px-8 lg:px-12">
                        {(practitioner.readingRating && practitioner.readingRating.total_count > 0) || (reviews && reviews.length > 0) ? (
                            <div>
                                {/* Rating Summary */}
                                {practitioner.readingRating && practitioner.readingRating.total_count > 0 && (
                                    <div className="text-center mb-10">
                                        <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                                            {practitioner.readingRating.average.toFixed(1)}
                                        </div>
                                        <div className="flex items-center gap-1 justify-center mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-5 h-5 ${
                                                        star <= Math.round(practitioner.readingRating!.average)
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-white/20'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-sm text-white/50">
                                            Based on {practitioner.readingRating.total_count} {practitioner.readingRating.total_count === 1 ? 'review' : 'reviews'}
                                        </p>
                                    </div>
                                )}

                                <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 text-center">
                                    What Clients Say
                                </h2>

                                {/* Pinned Testimonials */}
                                {reviews && reviews.length > 0 && profile?.pinnedReviewIds && profile.pinnedReviewIds.length > 0 && (
                                    <div className="grid gap-5 sm:grid-cols-2 mb-8" data-testid="pinned-testimonials">
                                        {reviews.filter(r => profile.pinnedReviewIds?.includes(r.id)).map((review) => (
                                            <div key={review.id} className="relative rounded-2xl bg-white/5 border border-white/10 p-6">
                                                <div className="absolute -top-3 -left-2">
                                                    <div className="bg-indigo-500 rounded-full p-1.5">
                                                        <Pin className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                                <div className="text-4xl text-indigo-400/30 font-serif leading-none mb-3">&ldquo;</div>
                                                {review.headline && (
                                                    <h4 className="font-medium text-white mb-2">{review.headline}</h4>
                                                )}
                                                <p className="text-white/60 text-sm leading-relaxed">{review.text}</p>
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-7 h-7">
                                                            <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs">
                                                                {review.userName?.slice(0, 2).toUpperCase() || 'AN'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium text-white/70">
                                                            {review.userName || 'Anonymous'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-3.5 h-3.5 ${
                                                                    star <= review.rating
                                                                        ? 'text-amber-400 fill-amber-400'
                                                                        : 'text-white/20'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Unpinned Reviews */}
                                {reviews && reviews.length > 0 && (
                                    <div className="space-y-4">
                                        {reviews.filter(r => !profile?.pinnedReviewIds?.includes(r.id)).map((review) => (
                                            <div key={review.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-7 h-7">
                                                            <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs">
                                                                {review.userName?.slice(0, 2).toUpperCase() || 'AN'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium text-white/70">
                                                            {review.userName || 'Anonymous'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-3.5 h-3.5 ${
                                                                    star <= review.rating
                                                                        ? 'text-amber-400 fill-amber-400'
                                                                        : 'text-white/20'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.headline && (
                                                    <h4 className="font-medium text-white mb-1">{review.headline}</h4>
                                                )}
                                                <p className="text-white/60 text-sm">{review.text}</p>
                                                <p className="text-xs text-white/30 mt-2">
                                                    {new Date(review.createdAt).toLocaleDateString('en-AU', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Star className="w-12 h-12 text-white/10 mx-auto mb-3" />
                                <p className="text-white/50">No reviews yet</p>
                                <p className="text-sm text-white/30 mt-1">
                                    Be the first to book a reading and leave a review!
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Linked Shopfronts */}
                {profile?.linkedShopfronts && profile.linkedShopfronts.length > 0 && (
                    <section className="py-12 md:py-16" data-testid="shopfronts-section">
                        <div className="px-4 md:px-8 lg:px-12">
                            <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 text-center">
                                <Store className="w-6 h-6 md:w-7 md:h-7 text-amber-400 inline-block mr-3 -mt-1" />
                                My Shops
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {profile.linkedShopfronts
                                    .sort((a, b) => a.displayOrder - b.displayOrder)
                                    .map((shop) => (
                                        <Link
                                            key={shop.merchantId}
                                            href={`/m/${shop.merchantSlug}`}
                                            className="group block"
                                            data-testid={`shop-link-${shop.merchantId}`}
                                        >
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 hover:bg-white/[0.07] transition-all">
                                                {shop.merchantLogo ? (
                                                    <img
                                                        src={shop.merchantLogo}
                                                        alt={shop.merchantName}
                                                        className="h-12 w-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                        <Store className="h-5 w-5 text-amber-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white group-hover:text-amber-300 transition-colors truncate">
                                                        {shop.merchantName}
                                                    </p>
                                                    <p className="text-xs text-white/40">View shop &rarr;</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Upcoming Events */}
                {events && events.length > 0 && (
                    <section className="py-12 md:py-16 bg-slate-900/50" data-testid="events-section">
                        <div className="px-4 md:px-8 lg:px-12">
                            <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 text-center">
                                <CalendarDays className="w-6 h-6 md:w-7 md:h-7 text-indigo-400 inline-block mr-3 -mt-1" />
                                Upcoming Events
                            </h2>
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {events.slice(0, 6).map((event) => {
                                    const startDate = new Date(event.startAt);
                                    const endDate = new Date(event.endAt);
                                    const isSameDay = startDate.toDateString() === endDate.toDateString();

                                    return (
                                        <div
                                            key={event.id}
                                            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-indigo-400/30 transition-colors"
                                        >
                                            {event.landscapeImage?.image?.media?.url ? (
                                                <div className="relative h-40 overflow-hidden">
                                                    <img
                                                        src={event.landscapeImage.image.media.url}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-40 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center">
                                                    <CalendarDays className="w-10 h-10 text-white/20" />
                                                </div>
                                            )}
                                            <div className="p-4">
                                                <h4 className="font-semibold text-white truncate">{event.title}</h4>
                                                <div className="flex items-center gap-1.5 text-sm text-white/60 mt-1.5">
                                                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span>
                                                        {startDate.toLocaleDateString('en-AU', {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                        {!isSameDay && ` - ${endDate.toLocaleDateString('en-AU', {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {events.length > 6 && (
                                <p className="text-sm text-white/40 mt-6 text-center">
                                    +{events.length - 6} more events
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {/* Bottom spacer */}
                <div className="h-16" />
            </div>

            {/* Message Dialog with Conversation History — NO CHANGES to dialog styling */}
            <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col" data-testid="conversation-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={practitioner.logo?.url} alt={practitioner.name} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                    {practitioner.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span>Message {practitioner.name}</span>
                        </DialogTitle>
                        <DialogDescription>
                            {conversation?.messages?.length
                                ? 'Continue your conversation below.'
                                : 'Start a conversation with this practitioner.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Messages Area */}
                    <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-slate-50" data-testid="messages-container">
                        {conversationLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : conversation?.messages && conversation.messages.length > 0 ? (
                            <div className="space-y-3">
                                {conversation.messages.map((msg) => {
                                    const isFromPractitioner = !!msg.posted_by_vendor;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isFromPractitioner ? 'justify-start' : 'justify-end'}`}
                                            data-testid={`message-${msg.id}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                                    isFromPractitioner
                                                        ? 'bg-white border border-slate-200 text-slate-800'
                                                        : 'bg-indigo-600 text-white'
                                                }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                                <p className={`text-xs mt-1 ${isFromPractitioner ? 'text-slate-400' : 'text-indigo-200'}`}>
                                                    {formatMessageTime(msg.sentAt)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                                <p>No messages yet</p>
                                <p className="text-sm">Send a message to start the conversation</p>
                            </div>
                        )}
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-2 pt-2">
                        <Textarea
                            placeholder="Type your message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            rows={2}
                            className="flex-1 resize-none"
                            data-testid="message-input"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={sendMessageMutation.isPending || !messageText.trim()}
                            className="self-end"
                            data-testid="send-message-submit-btn"
                        >
                            {sendMessageMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Video Stories Dialog */}
            {allVideos.length > 0 && (
                <VideoStoriesDialog
                    videos={allVideos}
                    practitionerName={practitioner.name}
                    open={videoStoriesOpen}
                    onOpenChange={setVideoStoriesOpen}
                />
            )}
        </>
    );
}

function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
            {/* Hero skeleton */}
            <div className="relative">
                <div className="h-[30vh] md:h-[45vh] bg-indigo-950/50 animate-pulse" />
                <div className="relative z-10 -mt-16 md:-mt-28 px-4 md:px-8 lg:px-12 pb-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-36 md:h-36 rounded-2xl bg-white/10 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-3 min-w-0">
                            <div className="h-8 sm:h-10 w-48 sm:w-64 bg-white/10 rounded animate-pulse" />
                            <div className="h-5 sm:h-6 w-full max-w-xs sm:max-w-sm bg-white/10 rounded animate-pulse" />
                            <div className="flex gap-4">
                                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                            </div>
                            <div className="flex gap-2 sm:gap-3">
                                <div className="h-10 w-32 sm:w-36 bg-white/10 rounded animate-pulse" />
                                <div className="h-10 w-32 sm:w-36 bg-white/10 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Services section skeleton */}
            <div className="py-12 md:py-16 bg-slate-900/50">
                <div className="px-4 md:px-8 lg:px-12">
                    <div className="h-8 w-56 bg-white/10 rounded animate-pulse mx-auto mb-8" />
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="h-48 bg-white/5 animate-pulse" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="h-48 bg-white/5 animate-pulse" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="hidden lg:block rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="h-48 bg-white/5 animate-pulse" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* About section skeleton */}
            <div className="py-12 md:py-16">
                <div className="px-4 md:px-8 lg:px-12 space-y-4">
                    <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                </div>
            </div>
        </div>
    );
}
