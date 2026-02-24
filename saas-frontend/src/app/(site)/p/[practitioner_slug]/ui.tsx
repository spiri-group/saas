'use client';

import { useState, useRef, useEffect } from "react";
import { Session } from "next-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { Star, Heart, MessageCircle, Calendar, CalendarDays, Clock, MapPin, Shield, Award, Sparkles, ShoppingCart, Send, Loader2, Play, ChevronLeft, ChevronRight, Video, Mic, Sun, Pause, Pin, Store } from "lucide-react";
import { iconsMapping } from "@/icons/social";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useIsFollowing, useFollowMerchant, useUnfollowMerchant } from "../../m/_hooks/UseFollow";
import PractitionerSideNav from "../_components/PractitionerSideNav";

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
            return response.services || [];
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

// Video Section Component
interface PractitionerVideoSectionProps {
    videos: Video[];
    videoSettings?: {
        autoplay: boolean;
        autoplayDelay: number;
    };
    practitionerName: string;
}

function PractitionerVideoSection({ videos, videoSettings, practitionerName }: PractitionerVideoSectionProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Handle autoplay with delay
    useEffect(() => {
        if (videoSettings?.autoplay && videoSettings.autoplayDelay > 0 && !hasAutoPlayed && videoRef.current) {
            const delay = videoSettings.autoplayDelay * 1000;
            const timer = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play()
                        .then(() => {
                            setHasAutoPlayed(true);
                            setIsPlaying(true);
                            setShowControls(true);
                        })
                        .catch((error) => {
                            console.log('Autoplay prevented:', error);
                        });
                }
            }, delay);
            return () => clearTimeout(timer);
        }

        if (videoSettings?.autoplay && videoSettings.autoplayDelay === 0 && !hasAutoPlayed) {
            setIsPlaying(true);
            setShowControls(true);
            setHasAutoPlayed(true);
        }
    }, [videoSettings, hasAutoPlayed]);

    const currentVideo = videos[currentIndex];
    const hasMultipleVideos = videos.length > 1;

    const goToPrevious = () => {
        const wasPlaying = isPlaying;
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1));
        setIsPlaying(false);
        setShowControls(wasPlaying);
        setHasAutoPlayed(false);

        if (wasPlaying && videoRef.current) {
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.muted = true;
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setShowControls(true);
                        if (videoRef.current) videoRef.current.muted = false;
                    }).catch(err => {
                        console.log('Autoplay blocked:', err);
                        setIsPlaying(false);
                    });
                }
            }, 100);
        }
    };

    const goToNext = () => {
        const wasPlaying = isPlaying;
        setCurrentIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
        setIsPlaying(false);
        setShowControls(wasPlaying);
        setHasAutoPlayed(false);

        if (wasPlaying && videoRef.current) {
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.muted = true;
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setShowControls(true);
                        if (videoRef.current) videoRef.current.muted = false;
                    }).catch(err => {
                        console.log('Autoplay blocked:', err);
                        setIsPlaying(false);
                    });
                }
            }, 100);
        }
    };

    const handlePlayClick = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
                setShowControls(true);
            }
        }
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        setShowControls(false);
    };

    const autoplayEnabled = videoSettings?.autoplay || false;
    const autoplayDelay = videoSettings?.autoplayDelay || 0;

    return (
        <Card className="mt-6 backdrop-blur-xl bg-white/95 shadow-xl border-0" data-testid="video-section">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Video className="w-5 h-5 text-purple-600" />
                    Video Introduction
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center">
                    <div className="relative w-full max-w-[280px] group cursor-pointer">
                        <video
                            ref={videoRef}
                            src={currentVideo.media.url}
                            controls={showControls}
                            muted={!isPlaying}
                            loop={autoplayEnabled}
                            playsInline
                            autoPlay={autoplayEnabled && autoplayDelay === 0}
                            className={`w-full rounded-lg ${!isPlaying && currentVideo.coverPhoto ? 'invisible' : 'visible'}`}
                            style={{ aspectRatio: '9/16' }}
                            preload="metadata"
                            onEnded={handleVideoEnded}
                        >
                            Your browser does not support the video tag.
                        </video>

                        {/* Cover photo overlay */}
                        {!isPlaying && currentVideo.coverPhoto && (
                            <div
                                className="absolute inset-0 rounded-lg overflow-hidden"
                                onClick={handlePlayClick}
                            >
                                <img
                                    src={currentVideo.coverPhoto.url}
                                    alt={`${practitionerName} video`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                    <div className="bg-white/90 group-hover:bg-white rounded-full p-4 transform group-hover:scale-110 transition-transform shadow-lg">
                                        <Play className="h-8 w-8 text-purple-600 fill-purple-600" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Play button overlay when no cover photo */}
                        {!isPlaying && !currentVideo.coverPhoto && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg"
                                onClick={handlePlayClick}
                            >
                                <div className="bg-white/90 group-hover:bg-white rounded-full p-4 transform group-hover:scale-110 transition-transform shadow-lg">
                                    <Play className="h-8 w-8 text-purple-600 fill-purple-600" />
                                </div>
                            </div>
                        )}

                        {/* Navigation arrows for multiple videos */}
                        {hasMultipleVideos && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                                    aria-label="Previous video"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                                    aria-label="Next video"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                    {currentIndex + 1} / {videos.length}
                                </div>
                            </>
                        )}

                        {/* Caption overlay */}
                        {currentVideo.media.description && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/50 to-transparent rounded-b-lg pointer-events-none">
                                <p className="text-white text-sm font-medium leading-relaxed drop-shadow-lg">
                                    {currentVideo.media.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
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
        <Card className="mt-6 backdrop-blur-xl bg-white/95 shadow-xl border-0" data-testid="audio-intro-section">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Mic className="w-5 h-5 text-purple-600" />
                    Meet {practitionerName}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
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
                        className="w-14 h-14 flex items-center justify-center bg-purple-600 hover:bg-purple-700 rounded-full transition-colors flex-shrink-0 shadow-lg"
                    >
                        {isPlaying ? (
                            <Pause className="h-6 w-6 text-white" />
                        ) : (
                            <Play className="h-6 w-6 text-white ml-0.5" />
                        )}
                    </button>
                    <div className="flex-grow">
                        <p className="text-sm font-medium text-slate-700 mb-2">Voice Introduction</p>
                        <div className="w-full bg-purple-200 rounded-full h-2 mb-1">
                            <div
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                    Listen to {practitionerName}&apos;s voice introduction to get a sense of their energy and style.
                </p>
            </CardContent>
        </Card>
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
        <Card className="mt-6 backdrop-blur-xl bg-gradient-to-br from-amber-50/95 to-orange-50/95 shadow-xl border-0 border-t-4 border-t-amber-400" data-testid="oracle-message-section">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <Sun className="w-5 h-5 text-amber-500" />
                        <span className="text-amber-800">Daily Oracle</span>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                        {getTimeRemaining()} remaining
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-amber-700/80">
                    Today&apos;s message from {practitionerName}, shared at {formatPostedTime()}
                </p>

                {/* Audio player with TikTok-style caption overlay */}
                <div className="relative bg-gradient-to-r from-amber-100/80 to-orange-100/80 rounded-lg p-4 border border-amber-200">
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
                            className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full transition-all flex-shrink-0 shadow-lg"
                        >
                            {isPlaying ? (
                                <Pause className="h-6 w-6 text-white" />
                            ) : (
                                <Play className="h-6 w-6 text-white ml-0.5" />
                            )}
                        </button>
                        <div className="flex-grow">
                            <p className="text-sm font-medium text-amber-800 mb-2">Listen to Today&apos;s Oracle</p>
                            <div className="w-full bg-amber-200 rounded-full h-2 mb-1">
                                <div
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-amber-600">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Caption overlay - shows during playback like TikTok */}
                    {oracleMessage.message && isPlaying && (
                        <div className="absolute inset-x-4 bottom-16 pointer-events-none animate-in fade-in duration-300">
                            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
                                <p className="text-white text-sm font-medium text-center leading-relaxed">
                                    {oracleMessage.message}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-slate-800 mb-2">Practitioner not found</h1>
                    <p className="text-slate-600">This practitioner profile may have been removed or is not yet public.</p>
                </div>
            </div>
        );
    }

    const profile = practitioner.practitioner;

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
            <div className={`min-h-screen bg-gradient-to-b from-violet-950 via-purple-900 to-slate-900 ${isOwner ? 'md:ml-[200px]' : ''}`}>
                {/* Hero Banner */}
                <div className={`relative overflow-hidden ${practitioner.banner?.url ? 'h-64 md:h-80' : 'h-32 md:h-40'}`}>
                {practitioner.banner?.url ? (
                    <Image
                        src={practitioner.banner.url}
                        alt={practitioner.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700" />
                )}
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Profile Content */}
            <div className={`mx-auto px-4 md:px-8 lg:px-12 relative z-10 pb-16 ${practitioner.banner?.url ? '-mt-32' : '-mt-16'}`}>
                {/* Profile Header Card */}
                <Card className="backdrop-blur-xl bg-white/95 shadow-2xl border-0">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                                    <AvatarImage src={practitioner.logo?.url || practitioner.thumbnail?.image?.media?.url} alt={practitioner.name} />
                                    <AvatarFallback className="text-3xl bg-purple-100 text-purple-700">
                                        {practitioner.name?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                            {practitioner.name}
                                        </h1>
                                        {profile?.pronouns && (
                                            <span className="text-sm text-slate-500">({profile.pronouns})</span>
                                        )}
                                        <p className="text-lg text-purple-700 mt-1">{profile?.headline}</p>
                                    </div>

                                    {/* Verification badges */}
                                    <div className="flex gap-2">
                                        {profile?.verification?.practitionerVerified && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                <Shield className="w-3 h-3 mr-1" />
                                                Verified
                                            </Badge>
                                        )}
                                        {profile?.verification?.badges?.includes('FEATURED') && (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                                <Award className="w-3 h-3 mr-1" />
                                                Featured
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
                                    {practitioner.readingRating && practitioner.readingRating.total_count > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                            <span className="font-semibold">{practitioner.readingRating.average.toFixed(1)}</span>
                                            <span>({practitioner.readingRating.total_count} reviews)</span>
                                        </div>
                                    )}
                                    {profile?.yearsExperience && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-purple-500" />
                                            <span>{profile.yearsExperience} years experience</span>
                                        </div>
                                    )}
                                    {practitioner.country && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4 text-purple-500" />
                                            <span>{practitioner.country}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Availability */}
                                <div className="mt-4">
                                    {profile?.acceptingNewClients ? (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Accepting New Clients
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                            Not Accepting New Clients
                                        </Badge>
                                    )}
                                    {profile?.responseTime && (
                                        <span className="ml-2 text-sm text-slate-500">
                                            Usually responds within {profile.responseTime}
                                        </span>
                                    )}
                                </div>

                                {/* CTA Buttons */}
                                <div className="flex flex-wrap gap-3 mt-6">
                                    <Button
                                        className="bg-purple-600 hover:bg-purple-700"
                                        onClick={handleBookReading}
                                        data-testid="book-reading-btn"
                                    >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Book a Reading
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                                        onClick={() => setMessageDialogOpen(true)}
                                        data-testid="send-message-btn"
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        Send Message
                                    </Button>
                                    <Button
                                        variant="ghost"
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
                                    <div className="flex flex-wrap gap-2 mt-4" data-testid="social-links">
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
                                                    <div className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                                                        {iconsMapping[social.platform]?.('solid')}
                                                    </div>
                                                ) : (
                                                    <div className="p-2">
                                                        {iconsMapping[social.platform]?.('outline')}
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Two Column Layout for Desktop */}
                <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] lg:gap-8">
                    {/* Main Column - Services, Videos, About, Training, Reviews */}
                    <div className="space-y-6">
                        {/* Available Services */}
                        {services && services.filter(s => s != null).length > 0 && (
                            <Card ref={servicesRef} className="backdrop-blur-xl bg-white/95 shadow-xl border-0" data-testid="services-section">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                                        Available Services
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {services.filter(s => s != null).map((service) => (
                                            <Link
                                                key={service.id}
                                                href={`/p/${slug}/services/${service.slug || service.id}`}
                                                className="block"
                                            >
                                                <div className="border rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer bg-white h-full">
                                                    <div className="flex gap-4">
                                                        {service.thumbnail?.image?.media?.url && (
                                                            <div className="flex-shrink-0 w-20 h-20 relative rounded-md overflow-hidden">
                                                                <Image
                                                                    src={service.thumbnail.image.media.url}
                                                                    alt={service.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-slate-900 truncate">{service.name}</h4>
                                                            {service.description && (
                                                                <div className="text-sm text-slate-600 line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: service.description }} />
                                                            )}
                                                            <div className="flex items-center gap-3 mt-2">
                                                                {service.pricing?.fixedPrice && (
                                                                    <span className="text-purple-700 font-semibold">
                                                                        ${(service.pricing.fixedPrice.amount / 100).toFixed(2)}
                                                                    </span>
                                                                )}
                                                                {service.category && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {service.category}
                                                                    </Badge>
                                                                )}
                                                                {service.turnaroundDays && (
                                                                    <span className="text-xs text-slate-500">
                                                                        {service.turnaroundDays} day delivery
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Video Section */}
                        {practitioner.videos && practitioner.videos.length > 0 && (
                            <PractitionerVideoSection
                                videos={practitioner.videos}
                                videoSettings={practitioner.videoSettings}
                                practitionerName={practitioner.name}
                            />
                        )}

                        {/* About */}
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                            <CardHeader>
                                <CardTitle className="text-lg">About {practitioner.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {profile?.bio && (
                                    <div>
                                        <p className="text-slate-700 whitespace-pre-line">{profile.bio}</p>
                                    </div>
                                )}

                                {profile?.spiritualJourney && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">My Spiritual Journey</h4>
                                        <p className="text-slate-600 whitespace-pre-line">{profile.spiritualJourney}</p>
                                    </div>
                                )}

                                {profile?.approach && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">My Approach</h4>
                                        <p className="text-slate-600 whitespace-pre-line">{profile.approach}</p>
                                    </div>
                                )}

                                {profile?.whatToExpect && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">What to Expect</h4>
                                        <p className="text-slate-600 whitespace-pre-line">{profile.whatToExpect}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Training & Credentials */}
                        {profile?.training && profile.training.length > 0 && (
                            <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Award className="w-5 h-5 text-purple-600" />
                                        Training & Credentials
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {profile.training.map((cred) => (
                                            <div key={cred.id} className="border-l-2 border-purple-200 pl-4">
                                                <h4 className="font-medium text-slate-800">{cred.title}</h4>
                                                {cred.institution && (
                                                    <p className="text-sm text-slate-600">{cred.institution}</p>
                                                )}
                                                {cred.year && (
                                                    <p className="text-xs text-slate-500">{cred.year}</p>
                                                )}
                                                {cred.description && (
                                                    <p className="text-sm text-slate-600 mt-1">{cred.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Reviews Section */}
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0" data-testid="reviews-section">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Star className="w-5 h-5 text-purple-600" />
                                    Client Reviews
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(practitioner.readingRating && practitioner.readingRating.total_count > 0) || (reviews && reviews.length > 0) ? (
                                    <div className="space-y-4">
                                        {/* Rating Summary */}
                                        {practitioner.readingRating && practitioner.readingRating.total_count > 0 && (
                                            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                                                <div className="text-4xl font-bold text-purple-700">
                                                    {practitioner.readingRating.average.toFixed(1)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-5 h-5 ${
                                                                    star <= Math.round(practitioner.readingRating!.average)
                                                                        ? 'text-amber-500 fill-amber-500'
                                                                        : 'text-slate-300'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        Based on {practitioner.readingRating.total_count} {practitioner.readingRating.total_count === 1 ? 'review' : 'reviews'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pinned Testimonials */}
                                        {reviews && reviews.length > 0 && profile?.pinnedReviewIds && profile.pinnedReviewIds.length > 0 && (
                                            <div className="space-y-3" data-testid="pinned-testimonials">
                                                <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                                                    <Pin className="w-4 h-4" />
                                                    <span>Highlighted Reviews</span>
                                                </div>
                                                {reviews.filter(r => profile.pinnedReviewIds?.includes(r.id)).map((review) => (
                                                    <div key={review.id} className="relative border-2 border-purple-200 bg-purple-50/50 rounded-lg p-4">
                                                        <div className="absolute -top-2 -left-2">
                                                            <div className="bg-purple-500 rounded-full p-1">
                                                                <Pin className="w-3 h-3 text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                                                                        {review.userName?.slice(0, 2).toUpperCase() || 'AN'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium text-slate-700">
                                                                    {review.userName || 'Anonymous'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={`w-4 h-4 ${
                                                                            star <= review.rating
                                                                                ? 'text-amber-500 fill-amber-500'
                                                                                : 'text-slate-300'
                                                                        }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {review.headline && (
                                                            <h4 className="font-medium text-slate-800 mb-1">{review.headline}</h4>
                                                        )}
                                                        <p className="text-slate-600 text-sm">{review.text}</p>
                                                        <p className="text-xs text-slate-400 mt-2">
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

                                        {/* Individual Reviews */}
                                        {reviews && reviews.length > 0 && (
                                            <div className="space-y-4">
                                                {reviews.filter(r => !profile?.pinnedReviewIds?.includes(r.id)).map((review) => (
                                                    <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                                                                        {review.userName?.slice(0, 2).toUpperCase() || 'AN'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium text-slate-700">
                                                                    {review.userName || 'Anonymous'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={`w-4 h-4 ${
                                                                            star <= review.rating
                                                                                ? 'text-amber-500 fill-amber-500'
                                                                                : 'text-slate-300'
                                                                        }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {review.headline && (
                                                            <h4 className="font-medium text-slate-800 mb-1">{review.headline}</h4>
                                                        )}
                                                        <p className="text-slate-600 text-sm">{review.text}</p>
                                                        <p className="text-xs text-slate-400 mt-2">
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
                                        <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-500">No reviews yet</p>
                                        <p className="text-sm text-slate-400 mt-1">
                                            Be the first to book a reading and leave a review!
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Column - Oracle, Audio, Modalities, Shops, Events */}
                    <div className="space-y-6 mt-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
                        {/* Daily Oracle Message */}
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

                        {/* Modalities & Specializations */}
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Star className="w-5 h-5 text-purple-600" />
                                    Services & Specializations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {profile?.modalities && profile.modalities.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">Modalities</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.modalities.map((mod) => (
                                                <Badge key={mod} variant="secondary" className="bg-purple-100 text-purple-700">
                                                    {MODALITY_LABELS[mod] || mod}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {profile?.specializations && profile.specializations.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">Specializations</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.specializations.map((spec) => (
                                                <Badge key={spec} variant="secondary" className="bg-violet-100 text-violet-700">
                                                    {SPECIALIZATION_LABELS[spec] || spec}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Linked Shopfronts */}
                        {profile?.linkedShopfronts && profile.linkedShopfronts.length > 0 && (
                            <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0" data-testid="shopfronts-section">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Store className="w-5 h-5 text-amber-600" />
                                        My Shops
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {profile.linkedShopfronts
                                            .sort((a, b) => a.displayOrder - b.displayOrder)
                                            .map((shop) => (
                                                <Link
                                                    key={shop.merchantId}
                                                    href={`/m/${shop.merchantSlug}`}
                                                    className="group block"
                                                    data-testid={`shop-link-${shop.merchantId}`}
                                                >
                                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all">
                                                        {shop.merchantLogo ? (
                                                            <img
                                                                src={shop.merchantLogo}
                                                                alt={shop.merchantName}
                                                                className="h-10 w-10 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                                <Store className="h-5 w-5 text-amber-600" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-800 group-hover:text-amber-700 transition-colors truncate text-sm">
                                                                {shop.merchantName}
                                                            </p>
                                                            <p className="text-xs text-slate-500">View shop →</p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Upcoming Events */}
                        {events && events.length > 0 && (
                            <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0" data-testid="events-section">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CalendarDays className="w-5 h-5 text-purple-600" />
                                        Upcoming Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {events.slice(0, 3).map((event) => {
                                            const startDate = new Date(event.startAt);
                                            const endDate = new Date(event.endAt);
                                            const isSameDay = startDate.toDateString() === endDate.toDateString();

                                            return (
                                                <div
                                                    key={event.id}
                                                    className="flex gap-3 p-3 rounded-lg border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
                                                >
                                                    {event.landscapeImage?.image?.media?.url ? (
                                                        <div className="flex-shrink-0 w-16 h-12 relative rounded-md overflow-hidden">
                                                            <img
                                                                src={event.landscapeImage.image.media.url}
                                                                alt={event.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex-shrink-0 w-16 h-12 rounded-md bg-purple-100 flex items-center justify-center">
                                                            <CalendarDays className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-slate-900 truncate text-sm">{event.title}</h4>
                                                        <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                                                            <Calendar className="w-3 h-3 flex-shrink-0" />
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
                                    {events.length > 3 && (
                                        <p className="text-xs text-slate-500 mt-3 text-center">
                                            +{events.length - 3} more events
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Message Dialog with Conversation History */}
            <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col" data-testid="conversation-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={practitioner.logo?.url} alt={practitioner.name} />
                                <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
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
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
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
                                                        : 'bg-purple-600 text-white'
                                                }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                                <p className={`text-xs mt-1 ${isFromPractitioner ? 'text-slate-400' : 'text-purple-200'}`}>
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
            </div>
        </>
    );
}

function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-900 to-slate-900">
            <div className="h-64 md:h-80 bg-purple-800/50 animate-pulse" />
            <div className="mx-auto px-4 md:px-8 lg:px-12 -mt-32 relative z-10 pb-16">
                {/* Header Card Skeleton */}
                <Card className="backdrop-blur-xl bg-white/95 shadow-2xl border-0">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-32 h-32 rounded-full bg-slate-200 animate-pulse" />
                            <div className="flex-1 space-y-4">
                                <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
                                <div className="h-6 w-96 bg-slate-200 rounded animate-pulse" />
                                <div className="flex gap-4">
                                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Two Column Layout Skeleton */}
                <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] lg:gap-8">
                    {/* Main Column Skeleton */}
                    <div className="space-y-6">
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                            <CardContent className="p-6">
                                <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-4" />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="h-32 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-32 bg-slate-200 rounded animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                            <CardContent className="p-6 space-y-3">
                                <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Skeleton */}
                    <div className="space-y-6 mt-6 lg:mt-0">
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                            <CardContent className="p-6 space-y-3">
                                <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
                                <div className="flex flex-wrap gap-2">
                                    <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="backdrop-blur-xl bg-white/95 shadow-xl border-0">
                            <CardContent className="p-6 space-y-3">
                                <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
                                <div className="h-16 w-full bg-slate-200 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
