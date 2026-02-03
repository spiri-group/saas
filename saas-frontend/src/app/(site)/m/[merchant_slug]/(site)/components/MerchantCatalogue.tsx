'use client'

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import UseCatalogue from "@/app/(site)/components/Catalogue/hooks/UseCatalogue";
import CatalogueItem from "@/app/(site)/components/Catalogue/components/CatalogueItem";
import { useCatalogueEvents } from "../hooks/UseCatalogueEvents";
import { useCatalogueGallery } from "../hooks/UseCatalogueGallery";
import { useFeaturedPractitioners } from "../hooks/UseFeaturedPractitioners";
import { UpcomingEventsTile, FeaturedEventTile } from "./EventTiles";
import { GalleryTile } from "./GalleryTiles";
import { FeaturedPractitionersTile, FeaturedPractitionersListTile, FeaturedPractitionersGrid } from "./FeaturedPractitionersTile";
import { Session } from "next-auth";
import useInterfaceSize from "@/components/ux/useInterfaceSize";
import { Dialog } from "@/components/ui/dialog";
import EditThumbnail from "../listing/components/EditThumbnail";
import { listing_type } from "@/utils/spiriverse";
import DeleteListingDialog from "@/app/(site)/components/Catalogue/components/DeleteListingDialog";
import { toast } from "sonner";
import { useUpdateProductLiveStatus } from "../product/_components/Create/hooks/UseUpdateProductLiveStatus";
import HasMerchantAccess from "@/app/(site)/m/_hooks/HasMerchantAccess";
import { useCustomerViewMode } from "@/app/(site)/m/_hooks/UseCustomerViewMode";

type Props = {
    session: Session | null,
    className?: string,
    merchantId?: string,
    merchantBranding?: any
}

const MerchantCatalogue: React.FC<Props> = (props) => {
    const { breakpoint } = useInterfaceSize();
    const isCustomerViewMode = useCustomerViewMode();

    // Check if user has merchant access to include draft products
    const merchantAccessGranted = props.session != null && props.merchantId != null &&
        HasMerchantAccess(props.session, { merchantId: props.merchantId });

    // Include drafts when merchant is viewing their own catalogue (not in customer view mode)
    const includeDrafts = merchantAccessGranted && !isCustomerViewMode;

    const catalogueQuery = UseCatalogue(props.merchantId, undefined, undefined, undefined, includeDrafts);
    const eventsQuery = useCatalogueEvents(props.merchantId);
    const galleryQuery = useCatalogueGallery(props.merchantId);
    const featuredPractitionersQuery = useFeaturedPractitioners(props.merchantId);
    
    const data = catalogueQuery.query.data;
    const {
        hasNextPage,
        fetchNextPage,
    } = catalogueQuery.query;

    const sentinelRef = useRef<HTMLAnchorElement | null>(null);
    
    useEffect(() => {
        if (!hasNextPage || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, data]);

    const dataToRender = data?.pages.flatMap(page => page.listings) || [];
    const { nextEvent, upcomingEvents } = eventsQuery.data || { nextEvent: null, upcomingEvents: [] };
    const galleryItems = galleryQuery.data || [];
    const featuredPractitioners = featuredPractitionersQuery.data || [];
    const isLoadingGallery = galleryQuery.isLoading;
    const isLoadingEvents = eventsQuery.isLoading;
    const isLoadingCatalogue = catalogueQuery.query.isLoading;
    const isLoadingFeatured = featuredPractitionersQuery.isLoading;

    // State for tracking the currently featured event
    const [currentFeaturedEventId, setCurrentFeaturedEventId] = useState<string | undefined>();

    // State for tracking the currently featured practitioner
    const [currentFeaturedPractitionerId, setCurrentFeaturedPractitionerId] = useState<string | undefined>();

    // State for featured practitioners view mode
    // Currently defaults to carousel; grid mode activates when there are 3+ practitioners
    const featuredPractitionersViewMode: "carousel" | "grid" = featuredPractitioners.length >= 3 ? "grid" : "carousel";

    // State for edit thumbnail dialog
    const [editingThumbnail, setEditingThumbnail] = useState<listing_type | null>(null);

    // State for delete listing dialog
    const [deletingListing, setDeletingListing] = useState<listing_type | null>(null);

    // State for tracking which product is being toggled live/draft
    const [togglingLiveProductId, setTogglingLiveProductId] = useState<string | null>(null);
    const updateLiveStatus = useUpdateProductLiveStatus();

    // Handle edit listing (for now, just show a toast - can be expanded later)
    const handleEditListing = (listing: listing_type) => {
        toast.info("Edit listing functionality coming soon!", {
            description: `Editing ${listing.name}`,
        });
    };

    // Handle toggle live status
    const handleToggleLiveStatus = async (listing: listing_type, isLive: boolean) => {
        if (!props.merchantId) return;

        setTogglingLiveProductId(listing.id);
        try {
            await updateLiveStatus.mutateAsync({
                merchantId: props.merchantId,
                productId: listing.id,
                isLive
            });
        } finally {
            setTogglingLiveProductId(null);
        }
    };

    // Calculate event tiles to show
    const eventTiles: React.ReactElement[] = [];

    // Calculate featured practitioner tiles to show
    const featuredTiles: React.ReactElement[] = [];

    // Calculate editorial-style gallery tiles to show (each col-span-1 aspect-square)
    const galleryTiles: React.ReactElement[] = [];

    // Create all events array (nextEvent + upcomingEvents)
    const allEvents = nextEvent ? [nextEvent, ...upcomingEvents] : upcomingEvents;

    if (allEvents.length > 0) {
        // Featured event tile (col-span-2) - cycles through all events
        eventTiles.push(
            <li key="featured-events" className="col-span-2">
                <FeaturedEventTile
                    events={allEvents}
                    merchantBranding={props.merchantBranding}
                    onCurrentEventChange={setCurrentFeaturedEventId}
                />
            </li>
        );

        // Upcoming events list tile (col-span-1) - shows all events in a list with highlighting
        eventTiles.push(
            <li key="upcoming-events-list" className="col-span-1">
                <UpcomingEventsTile
                    events={allEvents}
                    merchantBranding={props.merchantBranding}
                    highlightedEventId={currentFeaturedEventId}
                />
            </li>
        );
    }

    // Create featured practitioners tiles
    if (featuredPractitioners.length > 0) {
        if (featuredPractitionersViewMode === "grid") {
            // Full-width grid view of all practitioners
            featuredTiles.push(
                <li key="featured-practitioners-grid" className="col-span-full">
                    <FeaturedPractitionersGrid
                        practitioners={featuredPractitioners}
                        merchantBranding={props.merchantBranding}
                    />
                </li>
            );
        } else {
            // Carousel view (default) - col-span-2 + list col-span-1
            featuredTiles.push(
                <li key="featured-practitioners" className="col-span-2">
                    <FeaturedPractitionersTile
                        practitioners={featuredPractitioners}
                        merchantBranding={props.merchantBranding}
                        onCurrentPractitionerChange={setCurrentFeaturedPractitionerId}
                    />
                </li>
            );

            featuredTiles.push(
                <li key="featured-practitioners-list" className="col-span-1">
                    <FeaturedPractitionersListTile
                        practitioners={featuredPractitioners}
                        merchantBranding={props.merchantBranding}
                        highlightedPractitionerId={currentFeaturedPractitionerId}
                    />
                </li>
            );
        }
    }

    // Editorial-style gallery tiles logic - each item is col-span-1 aspect-square
    if (galleryItems.length > 0) {
        // Sort by creation date and get recent items
        const recentGalleryItems = [...galleryItems]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Editorial style: show all gallery items as uniform col-span-1 tiles
        recentGalleryItems.forEach((item) => {
            galleryTiles.push(
                <li key={`gallery-${item.id}`} className="col-span-1">
                    <GalleryTile
                        item={item}
                        merchantBranding={props.merchantBranding}
                        merchantId={props.merchantId}
                    />
                </li>
            );
        });
    }

    return (
        <div className={cn(props.className)}>
            {(dataToRender.length > 0 || eventTiles.length > 0 || featuredTiles.length > 0 || galleryTiles.length > 0 || isLoadingEvents || isLoadingCatalogue || isLoadingFeatured) ? (
                <div 
                    className="rounded-xl transition-all duration-300"
                    style={{
                        backgroundColor: props.merchantBranding ? `rgba(var(--merchant-brand), 0.03)` : 'transparent'
                    }}
                >
                    <div className="space-y-2">
                        {/* Render content with dedicated full-width gallery rows */}
                        {(() => {
                            const sections: React.ReactElement[] = [];
                            let productIndex = 0;
                            let galleryIndex = 0;
                            
                            // First section: Events + Featured Practitioners + initial products
                            const firstRowContent: React.ReactElement[] = [];

                            // Add event tiles to first row
                            firstRowContent.push(...eventTiles);

                            // Add featured practitioners tiles after events
                            firstRowContent.push(...featuredTiles);

                            // Calculate how many products can fit in the remaining space of the first row
                            let columnsPerRow = 2; // default mobile
                            if (breakpoint === '3xl') columnsPerRow = 8;
                            else if (["2xl", "xl"].includes(breakpoint ?? "")) columnsPerRow = 6;
                            else if (breakpoint === 'lg') columnsPerRow = 4;

                            const eventTilesColumnSpan = eventTiles.length > 0 ? 3 : 0; // Featured (2) + Upcoming (1) = 3
                            const featuredTilesColumnSpan = featuredTiles.length > 0 ? 3 : 0; // Featured (2) + List (1) = 3
                            const remainingColumnsInFirstRow = Math.max(0, columnsPerRow - eventTilesColumnSpan - featuredTilesColumnSpan);
                            const firstSectionProductCount = Math.min(remainingColumnsInFirstRow, dataToRender.length);
                            for (let i = 0; i < firstSectionProductCount; i++) {
                                if (productIndex < dataToRender.length) {
                                    const product = dataToRender[productIndex];
                                    const isNearEnd = productIndex === dataToRender.length - 10;
                                    
                                    firstRowContent.push(
                                        <CatalogueItem
                                            ref={isNearEnd && hasNextPage ? sentinelRef : undefined}
                                            session={props.session}
                                            key={product.id}
                                            listing={product}
                                            openEditThumbnail={() => setEditingThumbnail(product)}
                                            onEditListing={() => handleEditListing(product)}
                                            onDeleteListing={() => setDeletingListing(product)}
                                            onToggleLiveStatus={(isLive) => handleToggleLiveStatus(product, isLive)}
                                            isTogglingLive={togglingLiveProductId === product.id}
                                        />
                                    );
                                    productIndex++;
                                }
                            }
                            
                            // Add first section if it has content
                            if (firstRowContent.length > 0) {
                                sections.push(
                                    <ul key="first-section" className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 gap-2">
                                        {firstRowContent}
                                    </ul>
                                );
                            }
                            
                            // Now alternate between gallery rows and product rows
                            let galleryItemsPerRow = 2;
                            if (breakpoint === '3xl') galleryItemsPerRow = 8
                            else if (["2xl", "xl"].includes(breakpoint ?? "")) galleryItemsPerRow = 6;
                            else if (breakpoint === 'lg') galleryItemsPerRow = 4;
                            
                            while (productIndex < dataToRender.length || galleryIndex < galleryTiles.length) {
                                // Add a dedicated gallery row if available
                                if (galleryIndex < galleryTiles.length) {
                                    const galleryRowItems = galleryTiles.slice(
                                        galleryIndex, 
                                        galleryIndex + galleryItemsPerRow
                                    );
                                    
                                    sections.push(
                                        <div key={`gallery-row-${galleryIndex}`} className="w-full">
                                            <ul className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 gap-2">
                                                {galleryRowItems}
                                            </ul>
                                        </div>
                                    );
                                    galleryIndex += galleryItemsPerRow;
                                }
                                
                                // Add 2-3 rows of products after gallery
                                const productsToAdd = Math.min(20, dataToRender.length - productIndex); // ~2.5 rows
                                if (productsToAdd > 0) {
                                    const productRowContent: React.ReactElement[] = [];
                                    
                                    for (let i = 0; i < productsToAdd; i++) {
                                        const product = dataToRender[productIndex + i];
                                        const isNearEnd = (productIndex + i) === dataToRender.length - 10;
                                        
                                        productRowContent.push(
                                            <CatalogueItem
                                                ref={isNearEnd && hasNextPage ? sentinelRef : undefined}
                                                session={props.session}
                                                key={product.id}
                                                listing={product}
                                                openEditThumbnail={() => setEditingThumbnail(product)}
                                                onEditListing={() => handleEditListing(product)}
                                                onDeleteListing={() => setDeletingListing(product)}
                                                onToggleLiveStatus={(isLive) => handleToggleLiveStatus(product, isLive)}
                                                isTogglingLive={togglingLiveProductId === product.id}
                                            />
                                        );
                                    }
                                    
                                    sections.push(
                                        <ul key={`products-${productIndex}`} className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 gap-2">
                                            {productRowContent}
                                        </ul>
                                    );
                                    productIndex += productsToAdd;
                                }
                            }
                            
                            return sections;
                        })()}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    {(isLoadingGallery || isLoadingEvents || isLoadingCatalogue || isLoadingFeatured) ? (
                        <div className="space-y-2">
                            <div className="w-32 h-6 bg-muted rounded mx-auto animate-pulse"></div>
                            <div className="w-48 h-4 bg-muted rounded mx-auto animate-pulse"></div>
                        </div>
                    ) : (
                        <p>No items or events to display</p>
                    )}
                </div>
            )}
            
            {!hasNextPage && dataToRender.length > 1 ? (
                <div className="flex flex-col items-center mt-6 mb-8">
                    <div className="w-full mx-2 border-t border-border mb-2"></div>
                    <p className="text-muted-foreground text-sm">You&apos;ve reached the end.</p>
                </div>
            ) : <></>}

            {/* Edit Thumbnail Dialog */}
            <Dialog open={!!editingThumbnail} onOpenChange={(open) => !open && setEditingThumbnail(null)}>
                {editingThumbnail && (
                    <EditThumbnail
                        forObject={editingThumbnail.ref}
                        existingThumbnail={editingThumbnail.thumbnail}
                        onSuccess={() => {
                            // Update the listing with the new thumbnail
                            // The query invalidation in EditThumbnail will refresh the catalogue
                            setEditingThumbnail(null);
                        }}
                        thumbnailType="square"
                        onCancel={() => setEditingThumbnail(null)}
                        withPrice={true}
                        initialMode="easy"
                        objectFit={editingThumbnail.thumbnail?.image?.objectFit || (editingThumbnail.type === "PRODUCT" ? "contain" : "cover")}
                    />
                )}
            </Dialog>

            {/* Delete Listing Dialog */}
            {deletingListing && (
                <DeleteListingDialog
                    open={!!deletingListing}
                    onOpenChange={(open) => !open && setDeletingListing(null)}
                    listingId={deletingListing.id}
                    listingName={deletingListing.name}
                    vendorId={props.merchantId || ""}
                />
            )}
        </div>
    );
};

export default MerchantCatalogue;