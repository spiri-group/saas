'use client'

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    src: string;
    className?: string;
    autoplay?: boolean;
    controls?: boolean;
    muted?: boolean;
    loop?: boolean;
    poster?: string;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
}

const VideoPlayer: React.FC<Props> = ({ 
    src, 
    className, 
    autoplay = false, 
    controls = true, 
    muted = false, 
    loop = false,
    poster,
    onPlay,
    onPause,
    onEnded 
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(muted);
    const [showControls, setShowControls] = useState(false);

    const togglePlay = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
            onPause?.();
        } else {
            videoRef.current.play();
            setIsPlaying(true);
            onPlay?.();
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        setDuration(videoRef.current.duration);
    };

    const handleSeek = (values: number[]) => {
        if (!videoRef.current) return;
        const newTime = values[0];
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleVolumeChange = (values: number[]) => {
        if (!videoRef.current) return;
        const newVolume = values[0];
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        
        if (isMuted) {
            videoRef.current.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            videoRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        }
    };

    const skip = (seconds: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
    };

    return (
        <div 
            className={cn("relative group bg-black rounded-lg overflow-hidden", className)}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-cover"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                autoPlay={autoplay}
                muted={isMuted}
                loop={loop}
                playsInline
            />

            {controls && (
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300",
                    showControls || !isPlaying ? "opacity-100" : "opacity-0"
                )}>
                    {/* Play/Pause Button - Center */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Button
                                size="lg"
                                variant="secondary"
                                className="rounded-full w-16 h-16"
                                onClick={togglePlay}
                            >
                                <Play className="w-8 h-8 ml-1" />
                            </Button>
                        </div>
                    )}

                    {/* Controls Bar - Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                        {/* Progress Bar */}
                        <div className="flex items-center space-x-2 text-white text-sm">
                            <span className="text-xs">{formatTime(currentTime)}</span>
                            <div className="flex-1">
                                <Slider
                                    value={[currentTime]}
                                    max={duration || 100}
                                    step={1}
                                    onValueChange={handleSeek}
                                    className="cursor-pointer"
                                />
                            </div>
                            <span className="text-xs">{formatTime(duration)}</span>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20"
                                    onClick={() => skip(-10)}
                                >
                                    <SkipBack className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20"
                                    onClick={togglePlay}
                                >
                                    {isPlaying ? (
                                        <Pause className="w-4 h-4" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20"
                                    onClick={() => skip(10)}
                                >
                                    <SkipForward className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex items-center space-x-2">
                                {/* Volume Control */}
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-white hover:bg-white/20"
                                        onClick={toggleMute}
                                    >
                                        {isMuted ? (
                                            <VolumeX className="w-4 h-4" />
                                        ) : (
                                            <Volume2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                    <div className="w-20">
                                        <Slider
                                            value={[isMuted ? 0 : volume]}
                                            max={1}
                                            step={0.1}
                                            onValueChange={handleVolumeChange}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white hover:bg-white/20"
                                    onClick={toggleFullscreen}
                                >
                                    <Maximize className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;