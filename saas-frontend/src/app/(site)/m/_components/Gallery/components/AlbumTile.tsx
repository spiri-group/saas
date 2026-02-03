'use client'

import React, { useState } from 'react';
import { gallery_album } from '../hooks/UseGalleryAlbums';
import { useGalleryItems } from '../hooks/UseGalleryItems';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import AlbumDialog from './AlbumDialog';

interface AlbumTileProps {
  album: gallery_album;
  onAlbumClick?: (album: gallery_album) => void; // Kept for backward compatibility, but now optional
  className?: string;
  merchantBranding?: any;
  merchantId?: string;
}

const AlbumTile: React.FC<AlbumTileProps> = ({ 
  album, 
  onAlbumClick,
  className,
  merchantBranding,
  merchantId
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const { data: galleryItems = [] } = useGalleryItems(album.merchantId, null, album.id);
  
  // Get up to 5 items for the preview, ensure we always have exactly 5
  const availableItems = galleryItems.slice(0, 5);
  const previewItems = [...availableItems];

  // Fill remaining slots by repeating items if we have fewer than 5
  while (previewItems.length < 5 && availableItems.length > 0) {
    const nextIndex = previewItems.length % availableItems.length;
    previewItems.push(availableItems[nextIndex]);
  }

  // Define 5 magazine-style layout patterns - each uses exactly 5 photos
  type MagItem = { className: string; index: number };

  const magazineLayouts: { name: string; pattern: string; items: MagItem[] }[] = [
    {
      name: "hero-left-block",
      pattern: "grid grid-cols-6 grid-rows-6 grid-flow-dense gap-1",
      items: [
        { className: "col-span-4 row-span-4", index: 0 },
        { className: "col-start-5 row-start-1 col-span-2 row-span-3", index: 1 },
        { className: "col-start-5 row-start-4 col-span-2 row-span-3", index: 2 },
        { className: "col-start-1 row-start-5 col-span-2 row-span-2", index: 3 },
        { className: "col-start-3 row-start-5 col-span-2 row-span-2", index: 4 },
      ],
    },
    {
      name: "hero-right-block",
      pattern: "grid grid-cols-6 grid-rows-6 grid-flow-dense gap-1",
      items: [
        { className: "col-start-3 row-start-1 col-span-4 row-span-4", index: 0 },
        { className: "col-start-1 row-start-1 col-span-2 row-span-3", index: 1 },
        { className: "col-start-1 row-start-4 col-span-2 row-span-3", index: 2 },
        { className: "col-start-3 row-start-5 col-span-2 row-span-2", index: 3 },
        { className: "col-start-5 row-start-5 col-span-2 row-span-2", index: 4 },
      ],
    },
    {
      name: "hero-top-banner",
      pattern: "grid grid-cols-6 grid-rows-6 grid-flow-dense gap-1",
      items: [
        { className: "col-span-6 row-span-2", index: 0 },
        { className: "col-start-1 row-start-3 col-span-3 row-span-2", index: 1 },
        { className: "col-start-4 row-start-3 col-span-3 row-span-2", index: 2 },
        { className: "col-start-1 row-start-5 col-span-3 row-span-2", index: 3 },
        { className: "col-start-4 row-start-5 col-span-3 row-span-2", index: 4 },
      ],
    },
    {
      name: "hero-bottom-banner",
      pattern: "grid grid-cols-6 grid-rows-6 grid-flow-dense gap-1",
      items: [
        { className: "col-start-1 row-start-1 col-span-3 row-span-2", index: 1 },
        { className: "col-start-4 row-start-1 col-span-3 row-span-2", index: 2 },
        { className: "col-start-1 row-start-3 col-span-3 row-span-2", index: 3 },
        { className: "col-start-4 row-start-3 col-span-3 row-span-2", index: 4 },
        { className: "col-span-6 row-span-2 row-start-5", index: 0 },
      ],
    },
    {
      name: "tall-center",
      pattern: "grid grid-cols-6 grid-rows-6 grid-flow-dense gap-1",
      items: [
        { className: "col-start-3 row-start-1 col-span-2 row-span-6", index: 0 },
        { className: "col-start-1 row-start-1 col-span-2 row-span-3", index: 1 },
        { className: "col-start-1 row-start-4 col-span-2 row-span-3", index: 2 },
        { className: "col-start-5 row-start-1 col-span-2 row-span-3", index: 3 },
        { className: "col-start-5 row-start-4 col-span-2 row-span-3", index: 4 },
      ],
    },
    {
      name: "tall-left-filmstrip",
      pattern: "grid grid-cols-6 grid-rows-6 grid-flow-dense gap-1",
      items: [
        { className: "col-start-1 row-start-1 col-span-2 row-span-6", index: 0 },
        { className: "col-start-3 row-start-1 col-span-2 row-span-3", index: 1 },
        { className: "col-start-5 row-start-1 col-span-2 row-span-3", index: 2 },
        { className: "col-start-3 row-start-4 col-span-2 row-span-3", index: 3 },
        { className: "col-start-5 row-start-4 col-span-2 row-span-3", index: 4 },
      ],
    },
  ];

  // Use album ID to consistently choose the same layout for each album
  const hash = (s: string) => [...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const layoutIndex = Math.abs(hash(album.id)) % magazineLayouts.length;
  const selectedLayout = magazineLayouts[layoutIndex];

  const handleClick = () => {
    if (onAlbumClick) {
      // Use legacy behavior if onAlbumClick is provided
      onAlbumClick(album);
    } else {
      // Use new dialog behavior
      setShowDialog(true);
    }
  };

  return (
    <>
    <Card
      className={cn(
        // card scales as a single unit
        "cursor-pointer overflow-hidden transform-gpu transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg focus-visible:scale-[1.02] focus-visible:shadow-lg will-change-transform",
        "border-merchant-primary/20 bg-merchant-panel/[var(--merchant-panel-transparency,0.95)] backdrop-blur-sm",
        className
      )}
      onClick={handleClick}
      tabIndex={0} // optional: keyboard focus
      style={{
        backgroundColor: `rgba(var(--merchant-panel, 255, 255, 255), var(--merchant-panel-transparency, 0.95))`,
        borderColor: `rgba(var(--merchant-primary, 99, 102, 241), 0.2)`,
        boxShadow: `0 4px 6px -1px rgba(var(--merchant-box-shadow-color, 0, 0, 0), 0.1), 0 2px 4px -1px rgba(var(--merchant-box-shadow-color, 0, 0, 0), 0.06)`
      }}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b border-merchant-primary/10 p-4">
          <h3 className="truncate text-lg font-semibold text-merchant-headings-foreground">{album.name}</h3>
          {album.description && (
            <p className="mt-1 line-clamp-2 text-sm text-merchant-default-foreground/70">
              {album.description}
            </p>
          )}
          <div className="mt-2">
            <span className="text-xs text-merchant-default-foreground/50">
              {album.itemCount} {album.itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Magazine Grid Preview */}
        <div className="aspect-[4/3] overflow-hidden">
          {galleryItems.length === 0 ? (
            <div className="flex h-full items-center justify-center bg-merchant-primary/5">
              <div className="text-center">
                <ImageIcon className="mx-auto mb-2 h-8 w-8 text-merchant-default-foreground/50" />
                <p className="text-sm text-merchant-default-foreground/50">No images yet</p>
              </div>
            </div>
          ) : (
            <div className={cn(selectedLayout.pattern, "h-full")}>
              {selectedLayout.items.map((layoutItem, i) => {
                const item = previewItems[layoutItem.index];
                return (
                  <div
                    key={item ? item.id : `placeholder-${i}`}
                    className={cn("relative overflow-hidden bg-muted", layoutItem.className)}
                  >
                    {item ? (
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.title || "Gallery item"}
                        className="block h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-merchant-primary/10">
                        <ImageIcon className="h-6 w-6 text-merchant-default-foreground/30" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Album Dialog */}
    <AlbumDialog
      album={album}
      open={showDialog}
      onOpenChange={setShowDialog}
      merchantBranding={merchantBranding}
      merchantId={merchantId || album.merchantId}
    />
  </>
  );
};

export default AlbumTile;