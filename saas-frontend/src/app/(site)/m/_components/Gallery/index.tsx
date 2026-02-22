'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Folder, Video, MoreHorizontal, Trash2, Edit3, ImageIcon, ChevronRight, ChevronLeft, Grid3X3, List, FolderOpen } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import GalleryDropZone, { UploadingFile } from './components/GalleryDropZone';
import StorageIndicator from './components/StorageIndicator';
import GalleryItemEditor from './components/GalleryItemEditor';
import { useGalleryCategories } from './hooks/UseGalleryCategories';
import { useGalleryAlbums } from './hooks/UseGalleryAlbums';
import { useGalleryItems } from './hooks/UseGalleryItems';
import { useUnalbumedItems } from './hooks/UseUnalbumedItems';
import { useCreateGalleryCategory } from './hooks/UseCreateGalleryCategory';
import { useCreateGalleryAlbum } from './hooks/UseCreateGalleryAlbum';
import { useDeleteGalleryItem } from './hooks/UseDeleteGalleryItem';
import { MERCHANT_PLANS, calculateStorageUsage } from './utils/storageUtils';
import { gallery_item_type } from '@/utils/spiriverse';
import useVendorStorage from '../../_hooks/UseVendorStorage';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Props = {
    merchantId: string;
    merchantPlan?: 'base' | 'premium';
}

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
    const ITEMS_PER_PAGE = 15; // 3 rows × 5 columns

    // Reset pagination when selection changes
    React.useEffect(() => {
        setCurrentPage(0);
    }, [selectedCategory, selectedAlbum, showUnalbumed]);

    // Hooks
    const categoriesQuery = useGalleryCategories(merchantId);
    const albumsQuery = useGalleryAlbums(merchantId);
    const itemsQuery = useGalleryItems(merchantId, selectedCategory, selectedAlbum);
    const allItemsQuery = useGalleryItems(merchantId); // Query for all items count
    const unalbumedItemsQuery = useUnalbumedItems(merchantId);
    const createCategoryMutation = useCreateGalleryCategory();
    const createAlbumMutation = useCreateGalleryAlbum();
    const deleteItemMutation = useDeleteGalleryItem();
    const vendorStorageQuery = useVendorStorage(merchantId);

    const categories = categoriesQuery.data || [];
    const albums = albumsQuery.data || [];
    const items = showUnalbumed ? (unalbumedItemsQuery.data || []) : (itemsQuery.data || []);
    const allItems = allItemsQuery.data || [];
    const unalbumedItems = unalbumedItemsQuery.data || [];
    
    // Get current storage bytes from vendor data
    const currentStorageBytes = vendorStorageQuery.data?.storage?.usedBytes || 0;
    
    // Calculate storage usage
    const storageUsage = calculateStorageUsage(
        currentStorageBytes, 
        MERCHANT_PLANS[merchantPlan].limits.totalStorageGB
    );

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
                    console.log('Bulk delete action clicked!');
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

    const toggleItemSelection = (itemId: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    // Show loading state if vendor storage data is still loading
    if (vendorStorageQuery.isLoading) {
        return (
            <div className="flex items-center justify-center h-[800px] w-full max-w-[960px]">
                <div className="text-center">
                    <Spinner className="mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading gallery...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 h-[800px] w-full max-w-[960px]">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold">Gallery Management</h2>
                    <p className="text-muted-foreground">Organize your photos and videos into categories and groups</p>
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
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-medium mb-3">Create New Category</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <Label htmlFor="new-category-name">Category Name *</Label>
                                            <Input
                                                id="new-category-name"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="e.g., Product Photos, Events, Behind the Scenes"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="new-category-description">Description</Label>
                                            <Input
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
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-medium mb-3">Existing Categories</h3>
                                    {categories.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No categories created yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {categories.map((category) => (
                                                <div key={category.id} className="flex items-center justify-between p-2 border rounded">
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
                        // Dispatch a custom event to close the dialog
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
                                    onFileUploaded={() => {
                                        // Files are uploaded and gallery items created immediately
                                    }}
                                    onItemCreated={() => {
                                        // Cache is automatically updated via UseCreateGalleryItem hook
                                    }}
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
                        <Card className="flex-1 flex flex-col h-full">
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
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                                            <p className="text-sm text-muted-foreground">
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
                                                className="w-full justify-start text-muted-foreground hover:text-foreground"
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
                                                                setSelectedCategory(null); // Clear category when selecting album
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
                    <Card className="flex-1 flex flex-col">
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
                                <div className="flex space-x-2">
                                    {selectedItems.size > 0 && (
                                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Selected ({selectedItems.size})
                                        </Button>
                                    )}
                                    {/* View Mode Toggle */}
                                    <div className="flex border rounded-md">
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
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto">
                            {viewMode === 'categories' ? (
                                // Categories View
                                <div className="space-y-6">
                                    {categories.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                            <p>No categories created yet</p>
                                            <p className="text-sm">Create a category to organize your media</p>
                                        </div>
                                    ) : (
                                        categories.map((category) => {
                                            const categoryItems = items.filter(item => 
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
                                                                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                                                    {item.type === 'photo' ? (
                                                                        <img
                                                                            src={item.url}
                                                                            alt={item.title}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="relative w-full h-full">
                                                                            <img
                                                                                src={item.thumbnailUrl || item.url}
                                                                                alt={item.title}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                                                                <Video className="w-8 h-8 text-white" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1">
                                                                    <p className="text-xs font-medium truncate">{item.title}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {categoryItems.length > 12 && (
                                                            <div className="aspect-square rounded-lg border border-dashed border-muted-foreground/50 bg-muted/30 flex items-center justify-center">
                                                                <div className="text-center">
                                                                    <p className="text-sm font-medium">+{categoryItems.length - 12}</p>
                                                                    <p className="text-xs text-muted-foreground">more items</p>
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
                                // Grid View (existing)
                                (uploadingFiles.length === 0 && items.length === 0) ? (
                                    <div className="text-center py-12 text-muted-foreground">
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
                                                    <span className="text-sm text-muted-foreground">
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
                                                <div className="text-xs text-muted-foreground">
                                                    Items {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, items.length + uploadingFiles.length)} of {items.length + uploadingFiles.length}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Masonry Grid */}
                                        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 flex-1" style={{ minHeight: '500px' }}>
                                            {/* Combine all items and apply pagination */}
                                            {(() => {
                                                // Combine all items in order: uploading, existing
                                                const allItems = [
                                                    ...uploadingFiles.map(uf => ({ type: 'uploading', data: uf })),
                                                    ...items.map(item => ({ type: 'existing', data: item }))
                                                ];
                                                
                                                // Apply pagination
                                                const startIndex = currentPage * ITEMS_PER_PAGE;
                                                const endIndex = startIndex + ITEMS_PER_PAGE;
                                                const pageItems = allItems.slice(startIndex, endIndex);
                                                
                                                return pageItems.map((combinedItem) => {
                                                    if (combinedItem.type === 'uploading') {
                                                        const uploadingFile = combinedItem.data as UploadingFile;
                                                        return (
                                                            <div key={`uploading-${uploadingFile.id}`} className="relative mb-4 break-inside-avoid">
                                                                <div className="aspect-square rounded-lg overflow-hidden border bg-muted flex flex-col items-center justify-center">
                                                                    <div className="text-center p-4">
                                                                        {uploadingFile.file.type.startsWith('video/') ? 
                                                                            <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" /> :
                                                                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                                                        }
                                                                        <Spinner className="mx-auto mt-2 text-primary" />
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2">
                                                                    <p className="text-xs font-medium truncate">{uploadingFile.file.name}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    
                                                    // existing item
                                                    const item = combinedItem.data as gallery_item_type;
                                                    // Use item ID to consistently assign height (magazine style)
                                                    const heightVariants = ['h-48', 'h-56', 'h-64', 'h-72', 'h-80'];
                                                    const heightIndex = parseInt(item.id.slice(-1), 16) % heightVariants.length;
                                                    const itemHeight = heightVariants[heightIndex];

                                                    return (
                                                        <div key={`existing-${item.id}`} className="relative group mb-4 break-inside-avoid">
                                                            <div className={`rounded-xl overflow-hidden drop-shadow-lg bg-muted ${itemHeight}`}>
                                                                {item.type === 'photo' ? (
                                                                    <img
                                                        src={item.url}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="relative w-full h-full">
                                                        <img
                                                            src={item.thumbnailUrl || item.url}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                                            <Video className="w-8 h-8 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="grid gap-2 grid-cols-auto grid-rows-auto">
                                                    <GalleryItemEditor
                                                        merchantId={merchantId}
                                                        existingItem={item}
                                                        onItemSaved={() => {
                                                            // Refresh the items
                                                            // The upsert hook will handle cache updates
                                                        }}
                                                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90 !p-2"
                                                    />
                                                    <Popover open={deleteConfirmOpen === item.id} onOpenChange={(open) => !open && setDeleteConfirmOpen(null)}>
                                                        <PopoverTrigger asChild>
                                                            <Button 
                                                                size="sm" 
                                                                variant="destructive"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80">
                                                            <div className="space-y-3">
                                                                <h3 className="font-medium">Delete Item</h3>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Are you sure you want to delete this item? This action cannot be undone.
                                                                </p>
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm"
                                                                        onClick={() => setDeleteConfirmOpen(null)}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button 
                                                                        variant="destructive" 
                                                                        size="sm"
                                                                        onClick={() => confirmDeleteItem(item.id)}
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

                                            {/* Selection checkbox */}
                                            <div className="absolute top-2 left-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleItemSelection(item.id)}
                                                    className="w-4 h-4"
                                                />
                                            </div>


                                            {/* Title and Linked Products */}
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm font-medium truncate">{item.title}</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                                                    {item.linkedProducts && item.linkedProducts.length > 0 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.linkedProducts.length} product{item.linkedProducts.length === 1 ? '' : 's'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.linkedProducts && item.linkedProducts.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.linkedProducts.slice(0, 2).map(product => (
                                                            <Badge key={product.id} variant="secondary" className="text-xs">
                                                                {product.title}
                                                            </Badge>
                                                        ))}
                                                        {item.linkedProducts.length > 2 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{item.linkedProducts.length - 2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            
                            {/* Fill empty slots to maintain consistent 3x5 grid */}
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
                            <Label htmlFor="album-name">Album Name *</Label>
                            <Input
                                id="album-name"
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                                placeholder="e.g., Summer Collection, Product Launch"
                            />
                        </div>
                        <div>
                            <Label htmlFor="album-description">Description</Label>
                            <Input
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
        </div>
    );
};

export default MerchantGallery;