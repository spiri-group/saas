'use client'

import React, { useState, useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, MessageSquare, Send, X, Search, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselScrollToBottom, CarouselScrollToTop } from '@/components/ux/Carousel';
import VideoPlayer from './VideoPlayer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommunicationModeType } from '@/utils/spiriverse';
import { useGalleryItems } from '../hooks/UseGalleryItems';
import ChatControl from '@/components/ux/ChatControl';
import { Textarea } from '@/components/ui/textarea';
import UseCreateMessage from '@/components/ux/ChatControl/hooks/UseCreateMessage';
import { getTileImageUrl, getDialogImageUrl, getFullscreenImageUrl } from '../utils/imageVariants';
import DetectiveZoom from './DetectiveZoom';
import { gallery_album } from '../hooks/UseGalleryAlbums';

type AlbumDialogProps = {
    album: gallery_album;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    merchantBranding?: any;
    merchantId?: string;
}

const AlbumDialog: React.FC<AlbumDialogProps> = ({ 
    album, 
    open, 
    onOpenChange, 
    merchantId 
}) => {
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [showFullscreenDetective, setShowFullscreenDetective] = useState(false);
    const [showDirectMessage, setShowDirectMessage] = useState(false);
    const [messageText, setMessageText] = useState('');

    // Query for album items
    const albumItemsQuery = useGalleryItems(merchantId || '', null, album.id);
    const albumItems = albumItemsQuery.data || [];

    // Get current item
    const currentItem = albumItems[currentItemIndex];

    // Direct message creation
    const createMessage = UseCreateMessage(
        {
            id: merchantId || '',
            partition: [merchantId || ''],
            container: "Main-Vendor"
        },
        undefined,
        merchantId,
        album.ref
    );

    // Navigation functions
    const goToPrevious = () => {
        if (albumItems.length > 0) {
            setCurrentItemIndex((prev) => prev > 0 ? prev - 1 : albumItems.length - 1);
        }
    };

    const goToNext = () => {
        if (albumItems.length > 0) {
            setCurrentItemIndex((prev) => prev < albumItems.length - 1 ? prev + 1 : 0);
        }
    };

    const goToItem = (index: number) => {
        setCurrentItemIndex(index);
    };

    // Reset current item when dialog opens or album changes
    useEffect(() => {
        if (open) {
            setCurrentItemIndex(0);
        }
    }, [open, album.id]);

    // Add keyboard navigation for images
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle arrow keys when not focused on the carousel itself
            if (event.target && (event.target as Element).closest('[role="region"][aria-roledescription="carousel"]')) {
                return;
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToPrevious();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToNext();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, goToPrevious, goToNext]);

    if (!currentItem && albumItems.length > 0) {
        return null; // Loading state
    }

    const isVideo = currentItem?.type === 'video';
    const imageUrl = currentItem?.thumbnailUrl || currentItem?.url;
    const dialogImageUrl = imageUrl ? getDialogImageUrl(imageUrl) : '';
    const fullscreenImageUrl = imageUrl ? getFullscreenImageUrl(imageUrl) : '';

    return (
        <>
            {/* Main Album Dialog */}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[900px] h-[540px] flex flex-row p-0">
                    {/* Main Content Area */}
                    <div className="flex-grow min-w-0 flex flex-col">
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span>{album.name}</span>
                                    {albumItems.length > 1 && (
                                        <div className="flex items-center space-x-1">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={goToPrevious}
                                                disabled={albumItems.length === 0}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                {currentItemIndex + 1} of {albumItems.length}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={goToNext}
                                                disabled={albumItems.length === 0}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline">
                                        {albumItems.length} item{albumItems.length === 1 ? '' : 's'}
                                    </Badge>
                                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                                        <X className="w-4 h-4 mr-2" />
                                        Close
                                    </Button>
                                </div>
                            </DialogTitle>
                            {album.description && (
                                <p className="text-muted-foreground mt-2">{album.description}</p>
                            )}
                        </DialogHeader>
                        
                        <div className="p-6 pt-4 space-y-4 flex-grow min-h-0 overflow-y-auto">
                            {albumItems.length === 0 ? (
                                <div className="flex items-center justify-center h-64 text-center">
                                    <div>
                                        <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No items in this album</h3>
                                        <p className="text-muted-foreground">
                                            This album doesn&apos;t have any content yet
                                        </p>
                                    </div>
                                </div>
                            ) : currentItem && (
                                <>
                                    {/* Current Item Display */}
                                    <div className="space-y-4 h-full">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-lg">{currentItem.title}</h3>
                                            {currentItem.linkedProducts && currentItem.linkedProducts.length > 0 && (
                                                <Badge variant="outline">
                                                    {currentItem.linkedProducts.length} linked product{currentItem.linkedProducts.length === 1 ? '' : 's'}
                                                </Badge>
                                            )}
                                        </div>
                                        
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
                                                    className=" object-contain rounded-lg shadow-2xl"
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
                                        
                                        {currentItem.description && (
                                            <p className="text-muted-foreground">{currentItem.description}</p>
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
                                </>
                            )}
                        </div>

                        {/* Carousel Thumbnail Strip */}
                        {albumItems.length > 1 && (
                            <Carousel
                                opts={{ align: "start", slidesToScroll: 3 }}
                                className="py-4 px-2"
                                >
                                <div className="flex flex-col space-y-2 h-full">
                                    <CarouselPrevious style="RECTANGLE" />
                                    <CarouselScrollToTop style="RECTANGLE" />
                                </div>
                                <CarouselContent>
                                    {albumItems.map((item, index) => (
                                        <CarouselItem key={item.id} className="basis-20 shrink-0 pl-2">
                                            <div
                                                className={cn(
                                                    "flex flex-col items-center w-20 cursor-pointer hover:bg-background rounded-lg p-1 transition-colors",
                                                    currentItemIndex === index && "bg-background ring-2 ring-primary/20"
                                                )}
                                                onClick={() => goToItem(index)}
                                                >
                                                <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0 mb-1">
                                                    <img
                                                    src={getTileImageUrl(item.thumbnailUrl || item.url)}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                    />
                                                    {item.type === "video" && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Play className="w-3 h-3 text-white fill-white" />
                                                    </div>
                                                    )}
                                                </div>
                                                <p className="font-medium text-xs truncate w-full text-center leading-tight">
                                                    {item.title}
                                                </p>
                                                </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <div className="flex flex-col space-y-2 h-full">
                                    <CarouselNext style="RECTANGLE" />
                                    <CarouselScrollToBottom style="RECTANGLE" />
                                </div>
                            </Carousel>
                        )}
                    </div>

                    {/* Chat Sidebar */}
                    <div className="flex-none w-96 border-l rounded-r-2xl bg-muted/30 flex flex-col p-4">
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
                            Album Discussion
                        </h4>
                        <div className="bg-muted/20 rounded-lg p-4 flex-grow min-h-0">
                            <ChatControl
                                forObject={album.ref}
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
                                className="h-full min-h-0"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Fullscreen Modal */}
            {currentItem && (
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
                            {albumItems.length > 1 && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20"
                                        onClick={goToPrevious}
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20"
                                        onClick={goToNext}
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
                                        <p className="text-white/60 text-xs mt-1">
                                            {currentItemIndex + 1} of {albumItems.length} in {album.name}
                                        </p>
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
            )}

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
                            Send a private message to the merchant about the album: <span className="font-medium">{album.name}</span>
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

export default AlbumDialog;