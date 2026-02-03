'use client'

import { Play, Eye, ChevronLeft, ChevronRight, MessageSquare, Send, X, Search, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import VideoPlayer from '@/app/(site)/m/_components/Gallery/components/VideoPlayer';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommunicationModeType, gallery_item_type } from '@/utils/spiriverse';
import ChatControl from '@/components/ux/ChatControl';
import { Textarea } from '@/components/ui/textarea';
import UseCreateMessage from '@/components/ux/ChatControl/hooks/UseCreateMessage';
import Image from "next/image";
import { useInfiniteGalleryItems } from '../../../_components/Gallery/hooks/UseGalleryItems';
import { getDialogImageUrl, getFullscreenImageUrl, getTileImageUrl } from '../../../_components/Gallery/utils/imageVariants';
import DetectiveZoom from '../../../_components/Gallery/components/DetectiveZoom';

type GalleryTileProps = {
    item: gallery_item_type;
    merchantBranding?: any;
    className?: string;
    merchantId?: string;
}

const GalleryTile: React.FC<GalleryTileProps> = ({ item, merchantBranding, className, merchantId }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [showFullscreenDetective, setShowFullscreenDetective] = useState(false);
    const [currentItem, setCurrentItem] = useState(item);
    const [showDirectMessage, setShowDirectMessage] = useState(false);
    const [messageText, setMessageText] = useState('');
    
    // Carousel state
    const carouselRef = useRef<HTMLDivElement>(null);
    const [, setCarouselPosition] = useState(0);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Query for related items when dialog opens - use infinite queries for proper pagination
    const groupItemsQuery = useInfiniteGalleryItems(merchantId || '', undefined, currentItem.groupId, 8);
    const categoryItemsQuery = useInfiniteGalleryItems(merchantId || '', currentItem.categoryId, undefined, 8);
    const allItemsQuery = useInfiniteGalleryItems(merchantId || '', undefined, undefined, 8);

    // Direct message creation
    const createMessage = UseCreateMessage(
        {
            id: merchantId || '',
            partition: [merchantId || ''],
            container: "Main-Vendor"
        },
        undefined,
        merchantId,
        currentItem.ref // Use gallery item ref as replyTo for context
    );

    // Calculate related items with priority: group > category > all
    const { relatedItems, activeQuery } = useMemo((): { relatedItems: gallery_item_type[]; activeQuery: any } => {
        if (!showPreview) return { relatedItems: [], activeQuery: null };
        
        let items: gallery_item_type[] = [];
        let activeQuery: any = null;
        
        // Priority 1: Items from same group (if exists)
        if (currentItem.groupId) {
            if (groupItemsQuery.isLoading) return { relatedItems: [], activeQuery: groupItemsQuery }; // Still loading
            if (groupItemsQuery.data) {
                items = groupItemsQuery.data.pages.flatMap(page => (page as { items: gallery_item_type[] }).items).filter(i => i.id !== currentItem.id);
                activeQuery = groupItemsQuery;
            }
        }
        // Priority 2: Items from same category (if no group items or group doesn't exist)
        else if (currentItem.categoryId) {
            if (categoryItemsQuery.isLoading) return { relatedItems: [], activeQuery: categoryItemsQuery }; // Still loading
            if (categoryItemsQuery.data) {
                items = categoryItemsQuery.data.pages.flatMap(page => (page as { items: gallery_item_type[] }).items).filter(i => i.id !== currentItem.id);
                activeQuery = categoryItemsQuery;
            }
        }
        // Priority 3: All items (if no category or group)
        else {
            if (allItemsQuery.isLoading) return { relatedItems: [], activeQuery: allItemsQuery }; // Still loading
            if (allItemsQuery.data) {
                items = allItemsQuery.data.pages.flatMap(page => (page as { items: gallery_item_type[] }).items).filter(i => i.id !== currentItem.id);
                activeQuery = allItemsQuery;
            }
        }
        
        // Sort by creation date (newest first)
        const sortedItems = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { relatedItems: sortedItems, activeQuery };
    }, [currentItem, groupItemsQuery.data, groupItemsQuery.isLoading, categoryItemsQuery.data, categoryItemsQuery.isLoading, allItemsQuery.data, allItemsQuery.isLoading, showPreview, groupItemsQuery, categoryItemsQuery, allItemsQuery]);

    // Check if we can load more from the server
    const canLoadMore = activeQuery?.hasNextPage;
    const isLoadingMore = activeQuery?.isFetchingNextPage;

    const loadMoreItems = () => {
        if (canLoadMore && !isLoadingMore) {
            activeQuery?.fetchNextPage();
        }
    };

    // Carousel navigation functions
    const updateCarouselButtons = useCallback(() => {
        if (!carouselRef.current) return;
        
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        setCarouselPosition(scrollLeft);
    }, []);

    const scrollCarouselLeft = () => {
        if (!carouselRef.current) return;
        const scrollAmount = 300; // Scroll by ~3-4 items
        carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    };

    const scrollCarouselRight = () => {
        if (!carouselRef.current) return;
        const scrollAmount = 300; // Scroll by ~3-4 items
        carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    // Infinite scroll detection
    const handleCarouselScroll = useCallback(() => {
        if (!carouselRef.current) return;
        
        updateCarouselButtons();
        
        // Check if we're near the end and need to load more
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        const scrollPercent = (scrollLeft + clientWidth) / scrollWidth;
        
        if (scrollPercent > 0.8 && canLoadMore && !isLoadingMore) {
            loadMoreItems();
        }
    }, [canLoadMore, isLoadingMore, loadMoreItems, updateCarouselButtons]);

    // Update carousel buttons when content changes
    useEffect(() => {
        updateCarouselButtons();
    }, [relatedItems, updateCarouselButtons]);

    // Check if we're loading related items
    const isLoadingRelatedItems = useMemo(() => {
        if (!showPreview) return false;
        return activeQuery?.isLoading || false;
    }, [activeQuery, showPreview]);

    // Update current item when dialog opens/closes
    useEffect(() => {
        if (showPreview) {
            setCurrentItem(item);
        }
    }, [showPreview, item]);

    const isVideo = currentItem.type === 'video';
    const imageUrl = currentItem.thumbnailUrl || currentItem.url;
    const tileImageUrl = getTileImageUrl(imageUrl);
    const dialogImageUrl = getDialogImageUrl(imageUrl);
    const fullscreenImageUrl = getFullscreenImageUrl(imageUrl);
    
    const tileStyle = {
        backgroundColor: merchantBranding ? `rgba(var(--merchant-brand), 0.05)` : 'transparent',
        borderColor: merchantBranding ? `rgba(var(--merchant-brand), 0.2)` : 'var(--border)'
    };

    return (
        <>
            <div
                className={cn(
                    "relative group cursor-pointer rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg w-full aspect-square",
                    className
                )}
                style={tileStyle}
                onClick={() => setShowPreview(true)}
                >

                <Image
                    src={tileImageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Hover overlay with subtle zoom effect */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                
                {/* Gallery icon appears on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Eye className="w-5 h-5 text-gray-700" />
                    </div>
                </div>

                {/* Title overlay that slides up on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    {item.description && (
                        <p className="text-white/80 text-xs truncate">{item.description}</p>
                    )}
                </div>

                {/* Video indicator */}
                {isVideo && (
                    <div className="absolute top-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                        <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
                            <Play className="w-3 h-3 mr-1" />
                            Video
                        </Badge>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-6xl max-h-[90vh] p-0">
                    <div className="flex h-full">
                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col">
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span>{currentItem.title}</span>
                                        {(relatedItems.length > 0 || isLoadingRelatedItems) && (
                                            <div className="flex items-center space-x-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => {
                                                        const allItems = [currentItem, ...relatedItems];
                                                        const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
                                                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : allItems.length - 1;
                                                        setCurrentItem(allItems[prevIndex]);
                                                    }}
                                                    disabled={relatedItems.length === 0 || isLoadingRelatedItems}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => {
                                                        const allItems = [currentItem, ...relatedItems];
                                                        const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
                                                        const nextIndex = currentIndex < allItems.length - 1 ? currentIndex + 1 : 0;
                                                        setCurrentItem(allItems[nextIndex]);
                                                    }}
                                                    disabled={relatedItems.length === 0 || isLoadingRelatedItems}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {currentItem.linkedProducts && currentItem.linkedProducts.length > 0 && (
                                            <Badge variant="outline">
                                                {currentItem.linkedProducts.length} linked product{currentItem.linkedProducts.length === 1 ? '' : 's'}
                                            </Badge>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                                            <X className="w-4 h-4 mr-2" />
                                            Close
                                        </Button>
                                    </div>
                                </DialogTitle>
                                {currentItem.description && (
                                    <p className="text-muted-foreground mt-2">{currentItem.description}</p>
                                )}
                            </DialogHeader>
                            <div className="p-6 pt-4 space-y-4 flex-1 overflow-y-auto">
                                {isVideo ? (
                                    <div className="aspect-video rounded-lg overflow-hidden">
                                        <VideoPlayer
                                            src={currentItem.url}
                                            poster={currentItem.thumbnailUrl}
                                            className="w-full h-full"
                                            controls={true}
                                            autoplay={false}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex justify-start w-fit relative group">
                                        <img
                                            src={dialogImageUrl}
                                            alt={currentItem.title}
                                            className="max-h-[70vh] object-contain rounded-lg shadow-2xl"
                                            style={{ width: 'auto' }}
                                        />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white border-white/20"
                                            onClick={() => {
                                                setShowFullscreenDetective(true);
                                                setShowFullscreen(true);
                                            }}
                                        >
                                            <Search className="w-4 h-4 mr-2" />
                                            Spectral Analysis
                                        </Button>
                                    </div>
                                )}

                                {/* Linked Products Section */}
                                {currentItem.linkedProducts && currentItem.linkedProducts.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2">Related Products</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {currentItem.linkedProducts.map(product => (
                                                <div 
                                                    key={product.id} 
                                                    className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted cursor-pointer"
                                                    onClick={() => {
                                                        // Navigate to product
                                                        window.location.href = `/m/${window.location.pathname.split('/')[2]}/product/${product.slug || product.id}`;
                                                    }}
                                                >
                                                    {product.thumbnailUrl && (
                                                        <img 
                                                            src={product.thumbnailUrl} 
                                                            alt={product.title}
                                                            className="w-12 h-12 object-cover rounded"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{product.title}</p>
                                                        {product.price && (
                                                            <p className="text-sm text-muted-foreground">
                                                                ${product.price.amount} {product.price.currency}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tags Section */}
                                {currentItem.tags && currentItem.tags.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2">Tags</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {currentItem.tags.map(tag => (
                                                <Badge key={tag} variant="secondary">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Related Items Carousel */}
                            {(relatedItems.length > 0 || isLoadingRelatedItems) && (
                                <div className="border-t bg-muted/30 py-2">
                                    <div className="relative">
                                        {/* Carousel Navigation Arrows */}
                                        {canScrollLeft && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background shadow-md"
                                                onClick={scrollCarouselLeft}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {canScrollRight && (
                                            <Button
                                                variant="ghost" 
                                                size="sm"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background shadow-md"
                                                onClick={scrollCarouselRight}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        )}
                                        
                                        {/* Scrollable Carousel */}
                                        <div 
                                            ref={carouselRef}
                                            className="flex items-center overflow-x-auto space-x-3 px-4 pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent scroll-smooth"
                                            onScroll={handleCarouselScroll}
                                        >
                                            {isLoadingRelatedItems ? (
                                                // Show loading gallery items with proper styling
                                                Array.from({ length: 6 }).map((_, index) => (
                                                    <div key={`loading-${index}`} className="flex flex-col items-center w-24 cursor-pointer hover:bg-background rounded-lg p-2 transition-colors flex-shrink-0">
                                                        <div className="relative w-16 h-16 rounded overflow-hidden bg-muted/50 flex-shrink-0 mb-1 flex items-center justify-center">
                                                            <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                                        </div>
                                                        <div className="w-14 h-3 bg-muted/50 rounded mb-1">
                                                            <div className="h-full bg-gradient-to-r from-transparent via-muted/30 to-transparent animate-pulse rounded"></div>
                                                        </div>
                                                        <div className="w-10 h-2 bg-muted/50 rounded">
                                                            <div className="h-full bg-gradient-to-r from-transparent via-muted/30 to-transparent animate-pulse rounded"></div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <>
                                                    {relatedItems.map((relatedItem) => (
                                                        <div 
                                                            key={relatedItem.id}
                                                            className={cn(
                                                                "flex flex-col items-center w-24 cursor-pointer hover:bg-background rounded-lg p-2 transition-colors flex-shrink-0",
                                                                currentItem.id === relatedItem.id && "bg-background ring-2 ring-primary/20"
                                                            )}
                                                            onClick={() => setCurrentItem(relatedItem)}
                                                        >
                                                            <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0 mb-1">
                                                                <img
                                                                    src={getTileImageUrl(relatedItem.thumbnailUrl || relatedItem.url)}
                                                                    alt={relatedItem.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {relatedItem.type === 'video' && (
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                        <Play className="w-3 h-3 text-white fill-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="font-medium text-xs truncate w-full text-center">{relatedItem.title}</p>
                                                            <p className="text-xs text-muted-foreground capitalize">{relatedItem.type}</p>
                                                        </div>
                                                    ))}
                                                    {/* Loading indicator for infinite scroll */}
                                                    {isLoadingMore && (
                                                        <div className="flex flex-col items-center w-24 cursor-pointer hover:bg-background rounded-lg p-2 transition-colors flex-shrink-0">
                                                            <div className="relative w-16 h-16 rounded overflow-hidden bg-muted/30 flex-shrink-0 mb-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                                                                <div className="animate-spin w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full" />
                                                            </div>
                                                            <p className="font-medium text-xs text-center text-muted-foreground">Loading...</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Chat Sidebar */}
                        <div className="w-96 border-l bg-muted/30 flex flex-col p-4">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowDirectMessage(true)}
                                className="flex items-center space-x-2 mb-6"
                            >
                                <Send className="w-4 h-4" />
                                <span>Send Direct Message to Merchant</span>
                            </Button>
                            <div className="border-b mb-4" />
                            <h4 className="font-semibold mb-4 flex items-center">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Public Discussion
                            </h4>
                            <div className="bg-muted/20 rounded-lg p-4 flex-1">
                                <ChatControl
                                    forObject={{
                                        id: currentItem.id,
                                        partition: [currentItem.id],
                                        container: "Main-GalleryItem"
                                    }}
                                    title=""
                                    defaultMode={CommunicationModeType.PLATFORM}
                                    allowResponseCodes={false}
                                    readonly={false}
                                    merchantId={merchantId}
                                    vendorSettings={{
                                        withCompanyLogo: false,
                                        withCompanyName: false,
                                        withUserName: true
                                    }}
                                    withDiscussion={false}
                                    withTitle={false}
                                    withAttachments={false}
                                    className="h-72"
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Fullscreen Modal */}
            <Dialog open={showFullscreen} onOpenChange={(open) => {
                setShowFullscreen(open);
                if (!open) {
                    setShowFullscreenDetective(false);
                }
            }}>
                <DialogContent className="max-w-screen max-h-screen w-full h-full p-0 bg-black/95">
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Top controls */}
                        <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
                            {!isVideo && (
                                <Button
                                    variant={showFullscreenDetective ? "default" : "ghost"}
                                    size="sm"
                                    className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                                    onClick={() => setShowFullscreenDetective(!showFullscreenDetective)}
                                >
                                    <Search className="w-4 h-4 mr-2" />
                                    Spectral Analysis
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                                onClick={() => {
                                    setShowFullscreen(false);
                                    setShowFullscreenDetective(false);
                                }}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                        
                        {/* Navigation buttons */}
                        {(relatedItems.length > 0) && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20"
                                    onClick={() => {
                                        const allItems = [currentItem, ...relatedItems];
                                        const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
                                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : allItems.length - 1;
                                        setCurrentItem(allItems[prevIndex]);
                                    }}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20"
                                    onClick={() => {
                                        const allItems = [currentItem, ...relatedItems];
                                        const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
                                        const nextIndex = currentIndex < allItems.length - 1 ? currentIndex + 1 : 0;
                                        setCurrentItem(allItems[nextIndex]);
                                    }}
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </Button>
                            </>
                        )}
                        
                        {/* Image title - only show when not in detective mode */}
                        {!showFullscreenDetective && (
                            <div className="absolute bottom-4 left-4 z-50">
                                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <h3 className="text-white font-semibold text-lg">{currentItem.title}</h3>
                                    {currentItem.description && (
                                        <p className="text-white/80 text-sm mt-1">{currentItem.description}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fullscreen content */}
                        {isVideo ? (
                            <div className="w-full h-full max-w-5xl">
                                <VideoPlayer
                                    src={currentItem.url}
                                    poster={currentItem.thumbnailUrl}
                                    className="w-full h-full"
                                    controls={true}
                                    autoplay={false}
                                />
                            </div>
                        ) : showFullscreenDetective ? (
                            <div className="w-full h-full p-4">
                                <DetectiveZoom
                                    src={fullscreenImageUrl}
                                    alt={currentItem.title}
                                    width={1920}
                                    height={1080}
                                    lensSize={280}
                                    defaultZoom={3}
                                    maxZoom={10}
                                    className="h-full border-0 shadow-none"
                                />
                            </div>
                        ) : (
                            <img
                                src={fullscreenImageUrl}
                                alt={currentItem.title}
                                className="max-w-full max-h-full object-contain"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Direct Message Dialog */}
            <Dialog open={showDirectMessage} onOpenChange={setShowDirectMessage}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Send className="w-5 h-5" />
                            <span>Send Direct Message</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Send a private message to the merchant about: <span className="font-medium">{currentItem.title}</span>
                        </div>
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Type your message here..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                rows={6}
                                className="resize-none"
                            />
                            <div className="flex justify-end space-x-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setShowDirectMessage(false);
                                        setMessageText('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={async () => {
                                        if (!messageText.trim()) return;
                                        
                                        try {
                                            await createMessage.mutation.mutateAsync({
                                                id: createMessage.values.id,
                                                text: messageText,
                                                media: []
                                            });
                                            setMessageText('');
                                            setShowDirectMessage(false);
                                        } catch (error) {
                                            console.error('Failed to send message:', error);
                                        }
                                    }}
                                    disabled={!messageText.trim() || createMessage.mutation.isPending}
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {createMessage.mutation.isPending ? 'Sending...' : 'Send Message'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

type GalleryGridTileProps = {
    items: gallery_item_type[];
    merchantBranding?: any;
    onViewAll?: () => void;
}

const GalleryGridTile: React.FC<GalleryGridTileProps> = ({ items, merchantBranding, onViewAll }) => {
    const displayItems = items.slice(0, 4); // Show up to 4 items in the grid
    const hasMore = items.length > 4;

    const tileStyle = {
        backgroundColor: merchantBranding ? `rgba(var(--merchant-brand), 0.05)` : 'transparent',
        borderColor: merchantBranding ? `rgba(var(--merchant-brand), 0.2)` : 'var(--border)'
    };

    return (
        <div 
            className="relative group cursor-pointer rounded-xl overflow-hidden border bg-card transition-all duration-300 hover:shadow-lg aspect-square"
            style={tileStyle}
            onClick={onViewAll}
        >
            {/* Grid of gallery items */}
            <div className="grid grid-cols-2 gap-1 h-full">
                {displayItems.map((item, index) => (
                    <div key={item.id} className="relative overflow-hidden">
                        <img
                            src={getTileImageUrl(item.thumbnailUrl || item.url)}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                        {item.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                        )}
                        {/* Overlay for last item if there are more */}
                        {index === 3 && hasMore && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <div className="text-white text-center">
                                    <div className="text-2xl font-bold">+{items.length - 4}</div>
                                    <div className="text-sm">more</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {/* Fill empty slots if less than 4 items */}
                {displayItems.length < 4 && Array.from({ length: 4 - displayItems.length }).map((_, index) => (
                    <div key={`empty-${index}`} className="bg-muted/50 relative overflow-hidden" />
                ))}
            </div>

            {/* Title overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-white">
                    <h3 className="font-semibold text-lg mb-1">Gallery</h3>
                    <p className="text-sm opacity-90">{items.length} items</p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2">
                        <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                            <Eye className="w-4 h-4 mr-2" />
                            View All
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { GalleryTile, GalleryGridTile };