'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

type ProfilePictureCropDialogProps = {
    file: File | null;
    open: boolean;
    onConfirm: (croppedBlob: Blob) => void;
    onCancel: () => void;
};

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 400;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const ProfilePictureCropDialog: React.FC<ProfilePictureCropDialogProps> = ({
    file,
    open,
    onConfirm,
    onCancel,
}) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load image when file changes
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            setZoom(1);
            setPan({ x: 0, y: 0 });

            const img = new window.Image();
            img.onload = () => {
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = url;

            return () => URL.revokeObjectURL(url);
        } else {
            setImageUrl(null);
        }
    }, [file]);

    // Calculate how the image should be displayed
    const getImageStyle = useCallback(() => {
        if (naturalSize.width === 0 || naturalSize.height === 0) return {};

        // Scale so shorter side fills the viewport (cover behavior)
        const baseScale = VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height);
        const displayScale = baseScale * zoom;
        const displayWidth = naturalSize.width * displayScale;
        const displayHeight = naturalSize.height * displayScale;

        return {
            width: displayWidth,
            height: displayHeight,
            left: (VIEWPORT_SIZE - displayWidth) / 2 + pan.x,
            top: (VIEWPORT_SIZE - displayHeight) / 2 + pan.y,
            position: 'absolute' as const,
            pointerEvents: 'none' as const,
        };
    }, [naturalSize, zoom, pan]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Touch events for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    };

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        setPan({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleConfirm = () => {
        if (!imageUrl || naturalSize.width === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            // Calculate which portion of the source image maps to the viewport
            const baseScale = VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height);
            const displayScale = baseScale * zoom;

            const imgX = (VIEWPORT_SIZE - naturalSize.width * displayScale) / 2 + pan.x;
            const imgY = (VIEWPORT_SIZE - naturalSize.height * displayScale) / 2 + pan.y;

            // Source rectangle in natural image coordinates
            const srcX = -imgX / displayScale;
            const srcY = -imgY / displayScale;
            const srcWidth = VIEWPORT_SIZE / displayScale;
            const srcHeight = VIEWPORT_SIZE / displayScale;

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

            canvas.toBlob((blob) => {
                if (blob) {
                    onConfirm(blob);
                }
            }, 'image/png');
        };
        img.src = imageUrl;
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <DialogContent className="sm:max-w-md" data-testid="profile-picture-crop-dialog">
                <DialogHeader>
                    <DialogTitle>Adjust Profile Picture</DialogTitle>
                    <DialogDescription>
                        Drag to reposition and use the slider to zoom in or out.
                    </DialogDescription>
                </DialogHeader>

                {/* Crop viewport */}
                <div className="flex flex-col items-center gap-4">
                    <div
                        ref={containerRef}
                        className="relative overflow-hidden rounded-full border-2 border-purple-300 bg-slate-100 cursor-grab active:cursor-grabbing select-none"
                        style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        data-testid="profile-pic-crop-viewport"
                    >
                        {imageUrl && (
                            <img
                                ref={imgRef}
                                src={imageUrl}
                                alt="Crop preview"
                                style={getImageStyle()}
                                draggable={false}
                            />
                        )}
                    </div>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-3 w-full max-w-xs" data-testid="profile-pic-zoom-controls">
                        <ZoomOut className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <Slider
                            value={[zoom]}
                            onValueChange={([v]) => setZoom(v)}
                            min={MIN_ZOOM}
                            max={MAX_ZOOM}
                            step={0.05}
                            className="flex-1"
                            data-testid="profile-pic-zoom-slider"
                        />
                        <ZoomIn className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-slate-500"
                        data-testid="profile-pic-crop-reset-btn"
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                    </Button>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        data-testid="profile-pic-crop-cancel-btn"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        data-testid="profile-pic-crop-confirm-btn"
                    >
                        Looks Good
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProfilePictureCropDialog;
