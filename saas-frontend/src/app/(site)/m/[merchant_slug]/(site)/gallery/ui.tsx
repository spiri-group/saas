'use client'

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { 
  ImageIcon, 
  SearchIcon
} from 'lucide-react';
import withProtection from '@/components/ux/HOC/withProtection';
import { useGalleryAlbums } from '../../../_components/Gallery/hooks/UseGalleryAlbums';
import useMerchantTheme from '../../../_hooks/UseMerchantTheme';
import AlbumTile from '../../../_components/Gallery/components/AlbumTile';
import MerchantFontLoader from '../../../_components/MerchantFontLoader';
import HasMerchantAccess from '../../../_hooks/HasMerchantAccess';

interface GalleryUIProps {
  merchantId: string;
}

const GalleryUIComponent = ({ merchantId }: GalleryUIProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch albums
  const { data: albums = [], isLoading: albumsLoading } = useGalleryAlbums(merchantId);
  const vendorBranding = useMerchantTheme(merchantId);

  // Filter albums based on search
  const filteredAlbums = albums.filter(album =>
    album.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (album.description && album.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderAlbumsView = () => {
    if (vendorBranding.isLoading || !vendorBranding.data) return <></>;

    if (albumsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    if (filteredAlbums.length === 0) {
      return (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-merchant-primary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-merchant-headings-foreground">
            {searchTerm ? 'No albums match your search' : 'No albums yet'}
          </h3>
          <p className="text-merchant-default-foreground/70 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'No albums available for this merchant.'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAlbums.map((album) => (
          <AlbumTile
            key={album.id}
            album={album}
            merchantId={merchantId}
            merchantBranding={vendorBranding.data.vendor}
          />
        ))}
      </div>
    );
  };

  // Don't render until we have branding data
  if (!vendorBranding.data) return null;

  // Prepare font configuration for MerchantFontLoader
  const fontConfig = vendorBranding.data.vendor.font ? {
    brand: vendorBranding.data.vendor.font.brand?.family || 'clean',
    default: vendorBranding.data.vendor.font.default?.family || 'clean',
    headings: vendorBranding.data.vendor.font.headings?.family || 'clean',
    accent: vendorBranding.data.vendor.font.accent?.family || 'clean'
  } : undefined;

  return (
    <div className="space-y-6 m-4">
      <MerchantFontLoader fonts={fontConfig} />

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search albums..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-merchant-primary/20 focus:border-merchant-primary w-full"
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {renderAlbumsView()}
      </div>
    </div>
  );
};

const GalleryUI = withProtection<GalleryUIProps>(GalleryUIComponent, HasMerchantAccess);

export default GalleryUI;