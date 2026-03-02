'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Folder, Video, MoreHorizontal, Trash2, Edit3, ImageIcon, ChevronRight, ChevronLeft, Grid3X3, List, FolderOpen, Search, Expand, X, Camera } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import GalleryDropZone, { UploadingFile } from './components/GalleryDropZone';
import StorageIndicator from './components/StorageIndicator';
import GalleryItemEditor from './components/GalleryItemEditor';
import VideoPlayer from './components/VideoPlayer';
import DetectiveZoom from './components/DetectiveZoom';
import { useGalleryCategories } from './hooks/UseGalleryCategories';
import { useGalleryAlbums } from './hooks/UseGalleryAlbums';
import { useGalleryItems } from './hooks/UseGalleryItems';
import { useUnalbumedItems } from './hooks/UseUnalbumedItems';
import { useCreateGalleryCategory } from './hooks/UseCreateGalleryCategory';
import { useCreateGalleryAlbum } from './hooks/UseCreateGalleryAlbum';
import { useDeleteGalleryItem } from './hooks/UseDeleteGalleryItem';
import { MERCHANT_PLANS, calculateStorageUsage } from './utils/storageUtils';
import { getTileImageUrl, getFullscreenImageUrl } from './utils/imageVariants';
import { gallery_item_type } from '@/utils/spiriverse';
import useVendorStorage from '../../_hooks/UseVendorStorage';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
    merchantId: string;
    merchantPlan?: 'base' | 'premium';
}

const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const MerchantGallery: React.FC<Props> = ({
    merchantId,
    merchantPlan = 'base'
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
    const [showUnalbumed, setShowUnalbumed] = useState<boolean>(false);
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [showCreateAlbum, setShowCreateAlbum] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [newAlbumName, setNewAlbumName] = useState('');
    const [newAlbumDescription, setNewAlbumDescription] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [isOrganizationExpanded, setIsOrganizationExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'categories'>('grid');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 15;

    // Phase 1: Aspect ratio & video duration tracking
    const [aspectRatios, setAspectRatios] = useState<Map<string, number>>(new Map());
    const [videoDurations, setVideoDurations] = useState<Map<string, number>>(new Map());

    // Phase 2: Search & filter
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'video'>('all');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

    // Phase 2: Multi-select
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

    // Phase 2: Lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxDetectiveMode, setLightboxDetectiveMode] = useState(false);

    // Reset pagination when selection/filter changes
    useEffect(() => {
        setCurrentPage(0);
    }, [selectedCategory, selectedAlbum, showUnalbumed, searchQuery, typeFilter, selectedTagFilter]);

    // Hooks
    const categoriesQuery = useGalleryCategories(merchantId);
    const albumsQuery = useGalleryAlbums(merchantId);
    const itemsQuery = useGalleryItems(merchantId, selectedCategory, selectedAlbum);
    const allItemsQuery = useGalleryItems(merchantId);
    const unalbumedItemsQuery = useUnalbumedItems(merchantId);
    const createCategoryMutation = useCreateGalleryCategory();
    const createAlbumMutation = useCreateGalleryAlbum();
    const deleteItemMutation = useDeleteGalleryItem();
    const vendorStorageQuery = useVendorStorage(merchantId);

    const categories = categoriesQuery.data || [];
    const albums = albumsQuery.data || [];
    const rawItems = showUnalbumed ? (unalbumedItemsQuery.data || []) : (itemsQuery.data || []);
    const allItems = allItemsQuery.data || [];
    const unalbumedItems = unalbumedItemsQuery.data || [];

    // Phase 2: Search & filter with useMemo
    const filteredItems = useMemo(() => {
        let result = rawItems;

        // Type filter
        if (typeFilter !== 'all') {
            result = result.filter(item => item.type === typeFilter);
        }

        // Tag filter
        if (selectedTagFilter) {
            result = result.filter(item => item.tags?.includes(selectedTagFilter));
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.title?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return result;
    }, [rawItems, typeFilter, selectedTagFilter, searchQuery]);

    // Use filteredItems throughout instead of raw items
    const items = filteredItems;

    // Extract all unique tags from current items
    const allTags = useMemo(() => {
        return Array.from(
            new Set(
                rawItems.flatMap(item => item.tags || [])
            )
        ).sort();
    }, [rawItems]);

    // Get current storage bytes from vendor data
    const currentStorageBytes = vendorStorageQuery.data?.storage?.usedBytes || 0;

    // Calculate storage usage
    const storageUsage = calculateStorageUsage(
        currentStorageBytes,
        MERCHANT_PLANS[merchantPlan].limits.totalStorageGB
    );

    // Phase 1: Aspect ratio callback
    const handleImageLoad = useCallback((itemId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth && img.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            setAspectRatios(prev => {
                if (prev.get(itemId) === ratio) return prev;
                const next = new Map(prev);
                next.set(itemId, ratio);
                return next;
            });
        }
    }, []);

    // Phase 1: Video duration callback
    const handleVideoMetadata = useCallback((itemId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.duration && isFinite(video.duration)) {
            setVideoDurations(prev => {
                if (prev.get(itemId) === video.duration) return prev;
                const next = new Map(prev);
                next.set(itemId, video.duration);
                return next;
            });
        }
    }, []);

    // Phase 2: Multi-select keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (isInput) return;

            // Ctrl/Cmd+A to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                setSelectedItems(new Set(items.map(item => item.id)));
            }

            // Escape to clear selection or close lightbox
            if (e.key === 'Escape') {
                if (lightboxOpen) {
                    setLightboxOpen(false);
                    setLightboxDetectiveMode(false);
                } else if (selectedItems.size > 0) {
                    setSelectedItems(new Set());
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, lightboxOpen, selectedItems.size]);

    // Phase 2: Lightbox keyboard navigation
    useEffect(() => {
        if (!lightboxOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setLightboxIndex(prev => prev > 0 ? prev - 1 : items.length - 1);
                setLightboxDetectiveMode(false);
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setLightboxIndex(prev => prev < items.length - 1 ? prev + 1 : 0);
                setLightboxDetectiveMode(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, items.length]);

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await createCategoryMutation.mutateAsync({
                merchantId,
                name: newCategoryName.trim(),
                description: newCategoryDescription.trim() || undefined
            });
            setShowCreateCategory(false);
            setNewCategoryName('');
            setNewCategoryDescription('');
        } catch (error) {
            console.error('Failed to create category:', error);
        }
    };

    const handleCreateAlbum = async () => {
        if (!newAlbumName.trim()) return;

        try {
            await createAlbumMutation.mutateAsync({
                merchantId,
                name: newAlbumName.trim(),
                description: newAlbumDescription.trim() || undefined
            });
            setShowCreateAlbum(false);
            setNewAlbumName('');
            setNewAlbumDescription('');
        } catch (error) {
            console.error('Failed to create album:', error);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        setDeleteConfirmOpen(itemId);
    };

    const confirmDeleteItem = async (itemId: string) => {
        try {
            await deleteItemMutation.mutateAsync({ id: itemId, merchantId });
            toast.success('Item deleted successfully');
            setDeleteConfirmOpen(null);
        } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('Failed to delete item');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;

        toast.error(`Are you sure you want to delete ${selectedItems.size} items?`, {
            description: 'This action cannot be undone.',
            action: {
                label: 'Delete All',
                onClick: async () => {
                    try {
                        const itemCount = selectedItems.size;
                        for (const itemId of selectedItems) {
                            await deleteItemMutation.mutateAsync({ id: itemId, merchantId });
                        }
                        setSelectedItems(new Set());
                        toast.success(`Successfully deleted ${itemCount} items`);
                    } catch (error) {
                        console.error('Failed to delete items:', error);
                        toast.error('Failed to delete items');
                    }
                }
            }
        });
    };

    // Phase 2: Enhanced toggle with shift-click range selection
    const toggleItemSelection = useCallback((itemId: string, index: number, shiftKey: boolean) => {
        const newSelection = new Set(selectedItems);

        if (shiftKey && lastSelectedIndex !== null) {
            // Range selection
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            for (let i = start; i <= end; i++) {
                if (items[i]) {
                    newSelection.add(items[i].id);
                }
            }
        } else {
            if (newSelection.has(itemId)) {
                newSelection.delete(itemId);
            } else {
                newSelection.add(itemId);
            }
        }

        setLastSelectedIndex(index);
        setSelectedItems(newSelection);
    }, [selectedItems, lastSelectedIndex, items]);

    const handleSelectAll = useCallback(() => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(item => item.id)));
        }
    }, [selectedItems.size, items]);

    // Phase 2: Open lightbox
    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
        setLightboxDetectiveMode(false);
        setLightboxOpen(true);
    }, []);

    const lightboxItem = lightboxOpen && items[lightboxIndex] ? items[lightboxIndex] : null;

    // Show loading state if vendor storage data is still loading
    if (vendorStorageQuery.isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="text-center">
                    <Spinner className="mx-auto mb-4" />
                    <p className="text-slate-400">Loading gallery...</p>
                </div>
            </div>
        );
    }

    // Helper: get aspect ratio style for a gallery item
    const getAspectStyle = (item: gallery_item_type): React.CSSProperties => {
        const ratio = aspectRatios.get(item.id);
        if (ratio) {
            return { aspectRatio: `${ratio}` };
        }
        // Default: 4:5 for photos, 16:9 for videos
        return { aspectRatio: item.type === 'video' ? '16/9' : '4/5' };
    };

    // Render a single gallery card (used in both grid + categories views)
    const renderGalleryCard = (item: gallery_item_type, index: number) => {
        const isSelected = selectedItems.has(item.id);
        const duration = videoDurations.get(item.id);
        const imgSrc = item.type === 'photo' ? getTileImageUrl(item.url) : undefined;

        return (
            <div key={`existing-${item.id}`} className="relative group mb-4 break-inside-avoid">
                <div
                    className={cn(
                        'rounded-xl overflow-hidden drop-shadow-lg bg-slate-800/50 cursor-pointer relative',
                        isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900'
                    )}
                    style={getAspectStyle(item)}
                    onClick={(e) => {
                        // If shift/ctrl held, toggle selection. Otherwise open lightbox.
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            toggleItemSelection(item.id, index, e.shiftKey);
                        } else {
                            openLightbox(index);
                        }
                    }}
                >
                    {item.type === 'photo' ? (
                        <img
                            src={imgSrc}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onLoad={(e) => handleImageLoad(item.id, e)}
                        />
                    ) : (
                        <div className="relative w-full h-full">
                            <video
                                src={item.url}
                                preload="metadata"
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                                onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
                                onLoadedMetadata={(e) => handleVideoMetadata(item.id, e)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                <Video className="w-8 h-8 text-white drop-shadow-lg" />
                            </div>
                            {/* Video duration badge */}
                            {duration !== undefined && (
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-sm font-medium px-2 py-1 rounded pointer-events-none">
                                    {formatDuration(duration)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hover overlay with gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex flex-col justify-between p-4 pointer-events-none group-hover:pointer-events-auto">
                        {/* Top: type badge */}
                        <div className="flex justify-between items-start">
                            <Badge variant="secondary" className="bg-white/10 text-white text-sm border-0 pointer-events-none">
                                {item.type === 'photo' ? <><Camera className="w-4 h-4 mr-1.5" /> Photo</> : <><Video className="w-4 h-4 mr-1.5" /> Video</>}
                            </Badge>
                        </div>

                        {/* Bottom: title, description, actions */}
                        <div>
                            <p className="text-white text-sm font-medium truncate">{item.title}</p>
                            {item.description && (
                                <p className="text-white/80 text-sm line-clamp-2 mt-0.5">{item.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2.5">
                                <button
                                    className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); openLightbox(index); }}
                                    title="View fullscreen"
                                >
                                    <Expand className="w-4 h-4" />
                                </button>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <GalleryItemEditor
                                        merchantId={merchantId}
                                        existingItem={item}
                                        onItemSaved={() => {}}
                                        className="bg-white/10 hover:bg-white/20 text-white rounded-lg !p-2"
                                    />
                                </div>
                                <Popover open={deleteConfirmOpen === item.id} onOpenChange={(open) => !open && setDeleteConfirmOpen(null)}>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="bg-white/10 hover:bg-red-500/40 text-white rounded-lg p-2 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="space-y-3">
                                            <h3 className="font-medium text-base">Delete Item</h3>
                                            <p className="text-sm text-slate-400">
                                                Are you sure you want to delete this item? This action cannot be undone.
                                            </p>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmOpen(null); }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); confirmDeleteItem(item.id); }}
                                                    disabled={deleteItemMutation.isPending && deleteConfirmOpen === item.id}
                                                >
                                                    {deleteItemMutation.isPending && deleteConfirmOpen === item.id ? 'Deleting...' : 'Delete'}
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Selection checkbox - always visible with subtle bg, prominent when selected */}
                    <div
                        className="absolute top-2.5 left-2.5 z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            dark
                            checked={isSelected}
                            onCheckedChange={() => toggleItemSelection(item.id, index, false)}
                            className="h-5 w-5 bg-black/50 border-white/70 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 shadow-md"
                        />
                    </div>
                </div>

                {/* Title and Linked Products below card */}
                <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-300 capitalize">{item.type}</p>
                        {item.linkedProducts && item.linkedProducts.length > 0 && (
                            <Badge variant="outline" className="text-sm">
                                {item.linkedProducts.length} product{item.linkedProducts.length === 1 ? '' : 's'}
                            </Badge>
                        )}
                    </div>
                    {item.linkedProducts && item.linkedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {item.linkedProducts.slice(0, 2).map(product => (
                                <Badge key={product.id} variant="secondary" className="text-sm">
                                    {product.title}
                                </Badge>
                            ))}
                            {item.linkedProducts.length > 2 && (
                                <Badge variant="secondary" className="text-sm">
                                    +{item.linkedProducts.length - 2}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col space-y-6 h-full w-full">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white">Gallery Management</h2>
                    <p className="text-slate-400">Organize your photos and videos into categories and groups</p>
                </div>
                <div className="flex space-x-2">
                    {/* Category Management Button */}
                    <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Manage Categories
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Category Management</DialogTitle>
                                <DialogDescription>
                                    Create and manage categories to classify your media (e.g., Product Photos, Events, etc.)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {/* Create New Category */}
                                <div className="border border-white/10 rounded-lg p-4">
                                    <h3 className="font-medium mb-3">Create New Category</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <Label dark htmlFor="new-category-name">Category Name *</Label>
                                            <Input
                                                dark
                                                id="new-category-name"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="e.g., Product Photos, Events, Behind the Scenes"
                                            />
                                        </div>
                                        <div>
                                            <Label dark htmlFor="new-category-description">Description</Label>
                                            <Input
                                                dark
                                                id="new-category-description"
                                                value={newCategoryDescription}
                                                onChange={(e) => setNewCategoryDescription(e.target.value)}
                                                placeholder="Optional description"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                                                Create Category
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Existing Categories */}
                                <div className="border border-white/10 rounded-lg p-4">
                                    <h3 className="font-medium mb-3">Existing Categories</h3>
                                    {categories.length === 0 ? (
                                        <p className="text-sm text-slate-400">No categories created yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {categories.map((category) => (
                                                <div key={category.id} className="flex items-center justify-between p-2 border border-white/10 rounded">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: category.color || '#6b7280' }}
                                                        />
                                                        <span className="font-medium">Category: {category.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {category.itemCount} items
                                                        </Badge>
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        <Button variant="ghost" size="sm">
                                                            <Edit3 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button variant="outline" onClick={() => setShowCreateCategory(false)}>
                                        Done
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => {
                        const event = new CustomEvent('close-dialog');
                        window.dispatchEvent(event);
                    }}>
                        ✕ Close
                    </Button>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Sidebar - Fixed dimensions */}
                <div className="w-64 flex-shrink-0 flex flex-col">
                    <AnimatePresence mode="wait">
                        {!isOrganizationExpanded && (
                            <motion.div
                                key="collapsed-items"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="space-y-4 overflow-hidden"
                            >
                                {/* Drop Zone */}
                                <GalleryDropZone
                                    merchantId={merchantId}
                                    categoryId={selectedCategory}
                                    albumId={selectedAlbum}
                                    merchantPlan={merchantPlan}
                                    currentStorageBytes={currentStorageBytes}
                                    onFileUploaded={() => {}}
                                    onItemCreated={() => {}}
                                    onUploadingFilesChange={setUploadingFiles}
                                />

                                {/* Storage Indicator */}
                                <StorageIndicator
                                    storageUsage={storageUsage}
                                    planName={MERCHANT_PLANS[merchantPlan].name}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Organization Card - Always present, grows/shrinks */}
                    <motion.div
                        animate={{
                            flex: isOrganizationExpanded ? 1 : 1,
                            marginTop: isOrganizationExpanded ? 0 : 16
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut", delay: isOrganizationExpanded ? 0.25 : 0 }}
                        className="flex flex-col flex-1"
                    >
                        <Card dark className="flex-1 flex flex-col h-full">
                            <CardHeader className="flex-shrink-0 cursor-pointer" onClick={() => setIsOrganizationExpanded(!isOrganizationExpanded)}>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center">
                                        <Folder className="w-5 h-5 mr-2" />
                                        Albums
                                    </CardTitle>
                                    <motion.div
                                        animate={{ rotate: isOrganizationExpanded ? 90 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </motion.div>
                                </div>
                            </CardHeader>

                            <AnimatePresence>
                                {!isOrganizationExpanded ? (
                                    <motion.div
                                        key="collapsed-content"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 60 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <CardContent className="pt-0 h-15">
                                            <p className="text-sm text-slate-300">
                                                {albums.length} albums • Click to organize
                                            </p>
                                        </CardContent>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="expanded-content"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "100%" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-1 overflow-hidden"
                                    >
                                        <CardContent className="h-full overflow-auto space-y-2 pt-0" style={{ minHeight: '300px' }}>
                                            {/* Add Album Button */}
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-slate-400 hover:text-white border-white/10 hover:bg-white/5"
                                                onClick={() => setShowCreateAlbum(true)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Album
                                            </Button>

                                            {/* All Items Button */}
                                            <Button
                                                variant={selectedCategory === null && selectedAlbum === null && !showUnalbumed ? "default" : "ghost"}
                                                className="w-full justify-start"
                                                onClick={() => {
                                                    setSelectedCategory(null);
                                                    setSelectedAlbum(null);
                                                    setShowUnalbumed(false);
                                                }}
                                            >
                                                All Items ({allItems.length})
                                            </Button>

                                            {/* Unalbumed Items Button */}
                                            <Button
                                                variant={showUnalbumed ? "default" : "ghost"}
                                                className="w-full justify-start"
                                                onClick={() => {
                                                    setSelectedCategory(null);
                                                    setSelectedAlbum(null);
                                                    setShowUnalbumed(true);
                                                }}
                                            >
                                                <FolderOpen className="w-4 h-4 mr-2" />
                                                Unalbumed Items ({unalbumedItems.length})
                                            </Button>

                                            {/* Categories and Groups */}
                                            {albums.map((album) => (
                                                <div key={album.id} className="space-y-1">
                                                    {/* Category Header */}
                                                    <div className="flex items-center group">
                                                        <Button
                                                            variant={selectedAlbum === album.id ? "default" : "ghost"}
                                                            className="flex-1 justify-start text-sm font-medium"
                                                            onClick={() => {
                                                                setSelectedCategory(null);
                                                                setSelectedAlbum(album.id);
                                                                setShowUnalbumed(false);
                                                            }}
                                                        >
                                                            <div
                                                                className="w-3 h-3 rounded-full mr-2"
                                                            />
                                                            {album.name} ({album.itemCount})
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem>
                                                                    <Edit3 className="w-4 h-4 mr-2" />
                                                                    Edit Album
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem>
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete Album
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                </div>
                                            ))}
                                        </CardContent>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.div>
                </div>

                {/* Main Content - All Items */}
                <div className="flex-1 flex flex-col min-h-0">
                    <Card dark className="flex-1 flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center space-x-2">
                                    {showUnalbumed ? (
                                        <>
                                            <FolderOpen className="w-4 h-4" />
                                            <span>Unalbumed Items</span>
                                        </>
                                    ) : selectedAlbum ? (
                                        <>
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: categories.find(c => c.id === selectedCategory)?.color || '#6b7280' }}
                                            />
                                            <span>
                                                {categories.find(c => c.id === selectedCategory)?.name } {' '}
                                                {albums.find(a => a.id === selectedAlbum)?.name || 'Unknown Album'}
                                            </span>
                                        </>
                                    ) : selectedCategory ? (
                                        <>
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: categories.find(c => c.id === selectedCategory)?.color || '#6b7280' }}
                                            />
                                            <span>{categories.find(c => c.id === selectedCategory)?.name || 'Unknown Category'}</span>
                                        </>
                                    ) : (
                                        <span>All Items</span>
                                    )}
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    {selectedItems.size > 0 && (
                                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Selected ({selectedItems.size})
                                        </Button>
                                    )}
                                    {/* View Mode Toggle */}
                                    <div className="flex border border-white/10 rounded-md">
                                        <Button
                                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                            size="sm"
                                            className="rounded-r-none"
                                            onClick={() => setViewMode('grid')}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'categories' ? 'default' : 'ghost'}
                                            size="sm"
                                            className="rounded-l-none"
                                            onClick={() => setViewMode('categories')}
                                        >
                                            <List className="w-4 h-4 mr-3" />
                                            <span>Categories</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Search and Filter Bar */}
                            {viewMode === 'grid' && (
                                <div className="space-y-3 mt-3">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input
                                            dark
                                            type="text"
                                            placeholder="Search by title, description, or tags..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 text-base"
                                        />
                                        {searchQuery && (
                                            <button
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Type Filter + Tag Chips */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Type filter buttons */}
                                        <div className="flex items-center gap-1.5">
                                            {(['all', 'photo', 'video'] as const).map((type) => (
                                                <Button
                                                    key={type}
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        'h-8 text-sm capitalize',
                                                        typeFilter === type
                                                            ? 'bg-purple-600/20 text-purple-300 border-purple-500'
                                                            : 'border-white/10 text-slate-300'
                                                    )}
                                                    onClick={() => setTypeFilter(type)}
                                                >
                                                    {type === 'all' ? 'All' : type === 'photo' ? 'Photos' : 'Videos'}
                                                </Button>
                                            ))}
                                        </div>

                                        {/* Divider */}
                                        {allTags.length > 0 && (
                                            <div className="w-px h-6 bg-white/10" />
                                        )}

                                        {/* Tag chips */}
                                        {allTags.map((tag) => (
                                            <Button
                                                key={tag}
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    'h-8 text-sm',
                                                    selectedTagFilter === tag
                                                        ? 'bg-purple-600/20 text-purple-300 border-purple-500'
                                                        : 'border-white/10 text-slate-300'
                                                )}
                                                onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
                                            >
                                                #{tag}
                                            </Button>
                                        ))}

                                        {/* Result count + select all */}
                                        <div className="ml-auto flex items-center gap-3">
                                            <p className="text-sm text-slate-300">
                                                {items.length}{searchQuery || typeFilter !== 'all' || selectedTagFilter ? ' matching' : ''} item{items.length !== 1 ? 's' : ''}
                                            </p>
                                            {items.length > 0 && (
                                                <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}>
                                                    <Checkbox
                                                        dark
                                                        checked={selectedItems.size === items.length && items.length > 0}
                                                        onCheckedChange={handleSelectAll}
                                                        className="h-5 w-5 bg-black/40 border-white/70 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                    />
                                                    <span className="text-sm text-slate-300">Select all</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto">
                            {viewMode === 'categories' ? (
                                // Categories View
                                <div className="space-y-6">
                                    {categories.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                            <p>No categories created yet</p>
                                            <p className="text-sm">Create a category to organize your media</p>
                                        </div>
                                    ) : (
                                        categories.map((category) => {
                                            const categoryItems = rawItems.filter(item =>
                                                item.categoryId === category.id
                                            );

                                            if (categoryItems.length === 0) return null;

                                            return (
                                                <div key={category.id} className="space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: category.color || '#6b7280' }}
                                                        />
                                                        <h3 className="text-lg font-semibold">Category: {category.name}</h3>
                                                        <Badge variant="outline">{categoryItems.length} items</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                                        {categoryItems.slice(0, 12).map((item) => (
                                                            <div key={item.id} className="relative group">
                                                                <div className="aspect-square rounded-lg overflow-hidden border border-white/10 bg-slate-800/50">
                                                                    {item.type === 'photo' ? (
                                                                        <img
                                                                            src={getTileImageUrl(item.url)}
                                                                            alt={item.title}
                                                                            loading="lazy"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="relative w-full h-full">
                                                                            <video
                                                                                src={item.url}
                                                                                preload="metadata"
                                                                                muted
                                                                                playsInline
                                                                                className="w-full h-full object-cover"
                                                                                onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
                                                                            />
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                                <Video className="w-8 h-8 text-white drop-shadow-lg" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1.5">
                                                                    <p className="text-sm font-medium truncate">{item.title}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {categoryItems.length > 12 && (
                                                            <div className="aspect-square rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                                                                <div className="text-center">
                                                                    <p className="text-sm font-medium">+{categoryItems.length - 12}</p>
                                                                    <p className="text-xs text-slate-400">more items</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                // Grid View
                                (uploadingFiles.length === 0 && items.length === 0) ? (
                                    <div className="text-center py-12 text-slate-400">
                                        {searchQuery || typeFilter !== 'all' || selectedTagFilter ? (
                                            <>
                                                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="text-base">No items match your search</p>
                                                <p className="text-sm mt-1">
                                                    {searchQuery && <>No results for &quot;{searchQuery}&quot;</>}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-3"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setTypeFilter('all');
                                                        setSelectedTagFilter(null);
                                                    }}
                                                >
                                                    Clear Filters
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                <p>
                                                    {showUnalbumed
                                                        ? "No unalbumed items"
                                                        : selectedAlbum
                                                        ? "No items in this album"
                                                        : selectedCategory
                                                        ? "No items in this category"
                                                        : "No items in this gallery"
                                                    }
                                                </p>
                                                <p className="text-sm">
                                                    {showUnalbumed
                                                        ? "All your gallery items are organized in albums"
                                                        : "Upload photos and videos to get started"
                                                    }
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full">
                                        {/* Pagination Controls */}
                                        {(items.length + uploadingFiles.length) > ITEMS_PER_PAGE && (
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                                        disabled={currentPage === 0}
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </Button>
                                                    <span className="text-sm text-slate-400">
                                                        Page {currentPage + 1} of {Math.ceil((items.length + uploadingFiles.length) / ITEMS_PER_PAGE)}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(Math.min(Math.ceil((items.length + uploadingFiles.length) / ITEMS_PER_PAGE) - 1, currentPage + 1))}
                                                        disabled={currentPage >= Math.ceil((items.length + uploadingFiles.length) / ITEMS_PER_PAGE) - 1}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="text-sm text-slate-300">
                                                    Items {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, items.length + uploadingFiles.length)} of {items.length + uploadingFiles.length}
                                                </div>
                                            </div>
                                        )}

                                        {/* Masonry Grid */}
                                        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 flex-1" style={{ minHeight: '500px' }}>
                                            {(() => {
                                                const allCombined = [
                                                    ...uploadingFiles.map(uf => ({ type: 'uploading' as const, data: uf })),
                                                    ...items.map((item, idx) => ({ type: 'existing' as const, data: item, index: idx }))
                                                ];

                                                const startIndex = currentPage * ITEMS_PER_PAGE;
                                                const endIndex = startIndex + ITEMS_PER_PAGE;
                                                const pageItems = allCombined.slice(startIndex, endIndex);

                                                return pageItems.map((combinedItem) => {
                                                    if (combinedItem.type === 'uploading') {
                                                        const uploadingFile = combinedItem.data as UploadingFile;
                                                        return (
                                                            <div key={`uploading-${uploadingFile.id}`} className="relative mb-4 break-inside-avoid">
                                                                <div className="aspect-square rounded-lg overflow-hidden border border-white/10 bg-slate-800/50 flex flex-col items-center justify-center">
                                                                    <div className="text-center p-4">
                                                                        {uploadingFile.file.type.startsWith('video/') ?
                                                                            <Video className="w-8 h-8 mx-auto mb-2 text-slate-400" /> :
                                                                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                                                        }
                                                                        <Spinner className="mx-auto mt-2 text-primary" />
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2">
                                                                    <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    const item = combinedItem.data as gallery_item_type;
                                                    const idx = (combinedItem as { index: number }).index;
                                                    return renderGalleryCard(item, idx);
                                                });
                                            })()}

                                            {/* Fill empty slots to maintain consistent grid */}
                                            {(() => {
                                                const allItemsCount = uploadingFiles.length + items.length;
                                                const currentPageItemsCount = Math.min(ITEMS_PER_PAGE, allItemsCount - (currentPage * ITEMS_PER_PAGE));
                                                const emptySlots = ITEMS_PER_PAGE - currentPageItemsCount;

                                                return Array.from({ length: Math.max(0, emptySlots) }).map((_, index) => (
                                                    <div key={`empty-${index}`} className="aspect-square opacity-0"></div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Album Creation Dialog */}
            <Dialog open={showCreateAlbum} onOpenChange={setShowCreateAlbum}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Album</DialogTitle>
                        <DialogDescription>
                            Albums are collections of photos, like a photo album.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label dark htmlFor="album-name">Album Name *</Label>
                            <Input
                                dark
                                id="album-name"
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                                placeholder="e.g., Summer Collection, Product Launch"
                            />
                        </div>
                        <div>
                            <Label dark htmlFor="album-description">Description</Label>
                            <Input
                                dark
                                id="album-description"
                                value={newAlbumDescription}
                                onChange={(e) => setNewAlbumDescription(e.target.value)}
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowCreateAlbum(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateAlbum}
                                disabled={!newAlbumName.trim() || createAlbumMutation.isPending}
                            >
                                {createAlbumMutation.isPending ? 'Creating...' : 'Create Album'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox Dialog */}
            <Dialog open={lightboxOpen} onOpenChange={(open) => { setLightboxOpen(open); if (!open) setLightboxDetectiveMode(false); }}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black/95 border-white/10 p-0 gap-0 flex flex-col [&>button]:text-white [&>button]:hover:bg-white/10">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{lightboxItem?.title || 'Gallery Item'}</DialogTitle>
                        <DialogDescription>Viewing gallery item in fullscreen</DialogDescription>
                    </DialogHeader>

                    {lightboxItem && (
                        <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden">
                            {/* Previous button */}
                            {items.length > 1 && (
                                <button
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/15 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
                                    onClick={() => {
                                        setLightboxIndex(prev => prev > 0 ? prev - 1 : items.length - 1);
                                        setLightboxDetectiveMode(false);
                                    }}
                                >
                                    <ChevronLeft className="w-7 h-7" />
                                </button>
                            )}

                            {/* Main content */}
                            <div className="w-full h-full flex items-center justify-center p-12">
                                {lightboxDetectiveMode && lightboxItem.type === 'photo' ? (
                                    <DetectiveZoom
                                        src={getFullscreenImageUrl(lightboxItem.url)}
                                        alt={lightboxItem.title}
                                        width={1920}
                                        height={1080}
                                        className="max-h-full"
                                    />
                                ) : lightboxItem.type === 'video' ? (
                                    <VideoPlayer
                                        src={lightboxItem.url}
                                        className="max-w-full max-h-full w-auto h-auto"
                                        autoplay
                                    />
                                ) : (
                                    <img
                                        src={getFullscreenImageUrl(lightboxItem.url)}
                                        alt={lightboxItem.title}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                )}
                            </div>

                            {/* Next button */}
                            {items.length > 1 && (
                                <button
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/15 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
                                    onClick={() => {
                                        setLightboxIndex(prev => prev < items.length - 1 ? prev + 1 : 0);
                                        setLightboxDetectiveMode(false);
                                    }}
                                >
                                    <ChevronRight className="w-7 h-7" />
                                </button>
                            )}

                            {/* Bottom info overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex items-end justify-between">
                                <div>
                                    <p className="text-white font-medium text-xl">{lightboxItem.title}</p>
                                    {lightboxItem.description && (
                                        <p className="text-white/80 text-base mt-1">{lightboxItem.description}</p>
                                    )}
                                    <p className="text-white/60 text-sm mt-1">
                                        {lightboxIndex + 1} of {items.length} • {lightboxItem.type === 'photo' ? 'Photo' : 'Video'}
                                    </p>
                                    {lightboxItem.tags && lightboxItem.tags.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            {lightboxItem.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="bg-white/10 text-white/90 text-sm border-0">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {lightboxItem.type === 'photo' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                'text-white border-white/20 hover:bg-white/10',
                                                lightboxDetectiveMode && 'bg-purple-600/30 border-purple-500 text-purple-300'
                                            )}
                                            onClick={() => setLightboxDetectiveMode(!lightboxDetectiveMode)}
                                        >
                                            <Search className="w-4 h-4 mr-2" />
                                            Spectral Analysis
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MerchantGallery;
