'use client';

import React, { useEffect, useRef, useState } from "react";
import { vendor_type } from "@/utils/spiriverse";
import MerchantCard from "./MerchantCard";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
    vendor: vendor_type;
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    } | null;
}

const LatestVideo: React.FC<Props> = ({ vendor, visibility }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Handle autoplay with delay
    useEffect(() => {
        const videoSettings = vendor.videoSettings;

        // Only autoplay if enabled, has a delay, and hasn't played yet
        if (videoSettings?.autoplay && videoSettings.autoplayDelay > 0 && !hasAutoPlayed && videoRef.current) {
            const delay = videoSettings.autoplayDelay * 1000; // Convert to milliseconds

            const timer = setTimeout(() => {
                if (videoRef.current) {
                    // Try to play, handle if browser blocks autoplay
                    videoRef.current.play()
                        .then(() => {
                            setHasAutoPlayed(true);
                            setIsPlaying(true);
                            setShowControls(true);
                        })
                        .catch((error) => {
                            // Autoplay was prevented (common in browsers)
                            console.log('Autoplay prevented:', error);
                        });
                }
            }, delay);

            return () => clearTimeout(timer);
        }
        
        // Handle immediate autoplay
        if (videoSettings?.autoplay && videoSettings.autoplayDelay === 0 && !hasAutoPlayed) {
            setIsPlaying(true);
            setShowControls(true);
            setHasAutoPlayed(true);
        }
    }, [vendor.videoSettings, hasAutoPlayed]);

    // Don't render if no videos
    if (!vendor.videos || vendor.videos.length === 0) {
        return null;
    }

    // For customers (no visibility prop), hide invisible sections completely
    if (visibility === null) {
        return null;
    }

    const currentVideo = vendor.videos[currentIndex];
    const hasMultipleVideos = vendor.videos.length > 1;

    const goToPrevious = () => {
        const wasPlaying = isPlaying;
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : vendor.videos!.length - 1));
        setIsPlaying(false);
        setShowControls(wasPlaying);
        setHasAutoPlayed(false);
        
        // If video was playing, auto-play the next one after a short delay
        if (wasPlaying && videoRef.current) {
            setTimeout(() => {
                if (videoRef.current) {
                    // Keep muted initially to avoid autoplay blocking
                    videoRef.current.muted = true;
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setShowControls(true);
                        // Unmute after starting
                        if (videoRef.current) videoRef.current.muted = false;
                    }).catch(err => {
                        console.log('Autoplay blocked, user needs to click:', err);
                        setIsPlaying(false);
                    });
                }
            }, 100);
        }
    };

    const goToNext = () => {
        const wasPlaying = isPlaying;
        setCurrentIndex((prev) => (prev < vendor.videos!.length - 1 ? prev + 1 : 0));
        setIsPlaying(false);
        setShowControls(wasPlaying);
        setHasAutoPlayed(false);
        
        // If video was playing, auto-play the next one after a short delay
        if (wasPlaying && videoRef.current) {
            setTimeout(() => {
                if (videoRef.current) {
                    // Keep muted initially to avoid autoplay blocking
                    videoRef.current.muted = true;
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setShowControls(true);
                        // Unmute after starting
                        if (videoRef.current) videoRef.current.muted = false;
                    }).catch(err => {
                        console.log('Autoplay blocked, user needs to click:', err);
                        setIsPlaying(false);
                    });
                }
            }, 100);
        }
    };

    const autoplayEnabled = vendor.videoSettings?.autoplay || false;
    const autoplayDelay = vendor.videoSettings?.autoplayDelay || 0;

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

    return (
        <MerchantCard
            vendor={vendor}
            visibility={visibility}
            className="overflow-hidden"
        >
            <div className="relative w-full mx-auto group cursor-pointer" style={{ maxWidth: '300px' }}>
                {/* Video element - always present but may be hidden */}
                <video
                    ref={videoRef}
                    src={currentVideo.media.url}
                    controls={showControls}
                    muted={!isPlaying} // Muted when not playing, unmuted when playing
                    loop={autoplayEnabled} // Loop if autoplay enabled
                    playsInline // Required for mobile autoplay
                    autoPlay={autoplayEnabled && autoplayDelay === 0} // Browser native autoplay if no delay
                    className={`w-full rounded-lg ${!isPlaying && currentVideo.coverPhoto ? 'invisible' : 'visible'}`}
                    style={{ aspectRatio: '9/16' }}
                    preload="metadata"
                    onEnded={handleVideoEnded}
                >
                    Your browser does not support the video tag.
                </video>
                
                {/* Cover photo overlay - show when not playing */}
                {!isPlaying && currentVideo.coverPhoto && (
                    <div 
                        className="absolute inset-0 rounded-lg overflow-hidden"
                        onClick={handlePlayClick}
                    >
                        <img
                            src={currentVideo.coverPhoto.url}
                            alt="Video cover"
                            className="w-full h-full object-cover"
                        />
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="bg-white/90 group-hover:bg-white rounded-full p-4 transform group-hover:scale-110 transition-transform shadow-lg">
                                <Play className="h-8 w-8 text-black fill-black" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Play button overlay - show when not playing and no cover photo */}
                {!isPlaying && !currentVideo.coverPhoto && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg"
                        onClick={handlePlayClick}
                    >
                        <div className="bg-white/90 group-hover:bg-white rounded-full p-4 transform group-hover:scale-110 transition-transform shadow-lg">
                            <Play className="h-8 w-8 text-black fill-black" />
                        </div>
                    </div>
                )}

                {/* Navigation arrows - only show if multiple videos */}
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
                        {/* Video counter */}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                            {currentIndex + 1} / {vendor.videos.length}
                        </div>
                    </>
                )}

                {/* TikTok-style caption overlay */}
                {currentVideo.media.description && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/50 to-transparent rounded-b-lg pointer-events-none">
                        <p className="text-white text-sm font-medium leading-relaxed drop-shadow-lg">
                            {currentVideo.media.description}
                        </p>
                    </div>
                )}
            </div>
            {autoplayEnabled && (
                <p className="text-xs text-merchant-default-foreground/50 mt-2 text-center">
                    {autoplayDelay === 0
                        ? "Autoplays immediately"
                        : `Autoplays after ${autoplayDelay} second${autoplayDelay !== 1 ? 's' : ''}`}
                </p>
            )}
        </MerchantCard>
    );
};

export default LatestVideo;
