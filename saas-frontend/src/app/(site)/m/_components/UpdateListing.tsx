'use client'

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, ShoppingCart, Sparkles, Heart, MessageCircle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchMerchantListings, type MerchantListingSearchResult, type ListingType } from './_hooks/UseSearchMerchantListings';

type UpdateListingProps = {
    merchantId: string;
    onClose?: () => void;
};

const listingTypeConfig: Record<ListingType, { icon: any, label: string, color: string }> = {
    TOUR: { icon: MapPin, label: 'Tour', color: 'text-blue-400' },
    PRODUCT: { icon: ShoppingCart, label: 'Product', color: 'text-green-400' },
    SERVICE: { icon: Sparkles, label: 'Service', color: 'text-purple-400' },
    LIVESTREAM: { icon: MessageCircle, label: 'Livestream', color: 'text-pink-400' },
    VIDEO: { icon: MessageCircle, label: 'Video', color: 'text-amber-400' },
    PODCAST: { icon: MessageCircle, label: 'Podcast', color: 'text-teal-400' },
};

// Map service categories to specific icons
const serviceCategoryConfig: Record<string, { icon: any, label: string, color: string }> = {
    READING: { icon: Sparkles, label: 'Reading', color: 'text-purple-400' },
    HEALING: { icon: Heart, label: 'Healing', color: 'text-pink-400' },
    COACHING: { icon: MessageCircle, label: 'Coaching', color: 'text-amber-400' },
};

export default function UpdateListing({ merchantId, onClose }: UpdateListingProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const searchResults = useSearchMerchantListings({
        merchantId,
        searchQuery: debouncedSearch,
        enabled: debouncedSearch.trim().length > 0
    });

    const handleSearch = () => {
        setDebouncedSearch(searchQuery);
    };

    const handleSelectListing = (listing: MerchantListingSearchResult) => {
        // Dispatch event to open the appropriate upsert dialog based on type
        let dialogId = '';

        if (listing.type === 'TOUR') {
            dialogId = 'Create Tour'; // Will be updated to upsert
        } else if (listing.type === 'PRODUCT') {
            dialogId = 'Create Product'; // Will be updated to upsert
        } else if (listing.type === 'SERVICE') {
            // Determine service type from category
            if (listing.category === 'READING') {
                dialogId = 'Create Reading'; // Will be updated to upsert
            } else if (listing.category === 'HEALING') {
                dialogId = 'Create Healing'; // Will be updated to upsert
            } else if (listing.category === 'COACHING') {
                dialogId = 'Create Coaching'; // Will be updated to upsert
            }
        }

        if (!dialogId) {
            console.error('Unknown listing type/category:', listing.type, listing.category);
            return;
        }

        const event = new CustomEvent('open-nav', {
            detail: {
                path: ['Catalogue', 'Update Listing', listing.title],
                action: {
                    type: 'dialog',
                    dialog: dialogId,
                    listingId: listing.id
                }
            }
        });
        window.dispatchEvent(event);
    };

    const results = searchResults.data || [];
    const isSearching = searchResults.isLoading;

    return (
        <div className="p-6 space-y-6 bg-slate-950 min-h-[400px]">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Update Listing</h2>
                    <p className="text-slate-300">Search for a catalogue listing to update</p>
                </div>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Search by title, type, or keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                    />
                </div>
                <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {isSearching ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Searching...
                        </>
                    ) : (
                        'Search'
                    )}
                </Button>
            </div>

            {results.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-slate-300 font-medium">{results.length} listing{results.length !== 1 ? 's' : ''} found</p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {results.map((listing) => {
                            // Determine which config to use
                            let config = listingTypeConfig[listing.type];

                            // For services, use category-specific config if available
                            if (listing.type === 'SERVICE' && listing.category && serviceCategoryConfig[listing.category]) {
                                config = serviceCategoryConfig[listing.category];
                            }

                            const Icon = config.icon;

                            return (
                                <button
                                    key={listing.id}
                                    onClick={() => handleSelectListing(listing)}
                                    className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 rounded-lg transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-2 rounded-lg bg-slate-700 group-hover:bg-slate-600 transition-colors", config.color)}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-base group-hover:text-purple-300 transition-colors">
                                                {listing.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn("text-sm font-medium", config.color)}>
                                                    {config.label}
                                                </span>
                                                {listing.status && (
                                                    <>
                                                        <span className="text-slate-500">•</span>
                                                        <span className={cn(
                                                            "text-sm font-medium",
                                                            listing.status === 'ACTIVE' ? 'text-green-400' :
                                                            listing.status === 'DRAFT' ? 'text-amber-400' :
                                                            'text-slate-400'
                                                        )}>
                                                            {listing.status}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {results.length === 0 && debouncedSearch && !isSearching && (
                <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                    <Search className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-200 font-medium">No listings found matching &quot;{debouncedSearch}&quot;</p>
                    <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
                </div>
            )}

            {!debouncedSearch && results.length === 0 && (
                <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                    <Search className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-200 font-medium">Enter a search term to find listings</p>
                    <p className="text-sm text-slate-400 mt-1">Search by title, type, or keyword</p>
                </div>
            )}
        </div>
    );
}
