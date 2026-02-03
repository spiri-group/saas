'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit3, Video, ImageIcon, Plus, X } from 'lucide-react';
import { useUpsertGalleryItem } from '../hooks/UseUpsertGalleryItem';
import { useGalleryCategories } from '../hooks/UseGalleryCategories';
import { useGalleryAlbums } from '../hooks/UseGalleryAlbums';
import { media_type, gallery_item_type_enum, gallery_item_type } from '@/utils/spiriverse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  merchantId: string;
  categoryId?: string | null;
  albumId?: string | null;
  mediaData?: media_type; // Optional for editing existing items
  existingItem?: gallery_item_type; // For editing existing items
  onItemSaved: () => void; // Renamed from onItemCreated to be more generic
  className?: string;
}

const GalleryItemEditor: React.FC<Props> = ({ 
  merchantId, 
  categoryId, 
  albumId, 
  mediaData, 
  existingItem,
  onItemSaved,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(existingItem?.categoryId || categoryId || '');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(existingItem?.albumId || albumId || '');
  const [tags, setTags] = useState<string[]>(existingItem?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Update form state when existingItem changes
  React.useEffect(() => {
    if (existingItem) {
      setTitle(existingItem.title || '');
      setDescription(existingItem.description || '');
      setSelectedCategoryId(existingItem.categoryId || '');
      setSelectedAlbumId(existingItem.albumId || '');
      setTags(existingItem.tags || []);
    }
  }, [existingItem]);

  const upsertItemMutation = useUpsertGalleryItem();
  const categoriesQuery = useGalleryCategories(merchantId);
  const albumsQuery = useGalleryAlbums(merchantId);

  const categories = categoriesQuery.data || [];
  const albums = albumsQuery.data || [];

  // For existing items, use their type; for new items, derive from mediaData
  const itemType: gallery_item_type_enum = existingItem?.type || (mediaData?.type === 'VIDEO' ? 'video' : 'photo');
  const isVideo = itemType === 'video';

  const handleSaveItem = async () => {
    if (!title.trim()) return;
    
    // For existing items, we must have the item; for new items, we must have mediaData
    if (!existingItem && !mediaData) return;

    setIsCreating(true);
    try {
      await upsertItemMutation.mutateAsync({
        id: existingItem?.id, // If provided, will update; if not, will create
        merchantId,
        categoryId: selectedCategoryId || undefined,
        albumId: selectedAlbumId || undefined,
        type: itemType,
        title: title.trim(),
        description: description.trim() || undefined,
        layout: existingItem?.layout || 'single',
        mediaUrl: existingItem?.url || mediaData!.url,
        thumbnailUrl: existingItem?.thumbnailUrl || mediaData!.url,
        linkedProducts: existingItem?.linkedProducts || [],
        tags: tags.length > 0 ? tags : undefined,
        usedBytes: existingItem?.usedBytes || mediaData?.sizeBytes || undefined,
      });

      // Only reset form for new items
      if (!existingItem) {
        setTitle('');
        setDescription('');
        setSelectedCategoryId('');
        setSelectedAlbumId('');
        setTags([]);
        setNewTag('');
      }
      
      setIsOpen(false);
      onItemSaved();
    } catch (error) {
      console.error('Failed to save gallery item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Edit3 className="w-4 h-4 mr-2" />
          Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isVideo ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            Add {isVideo ? 'Video' : 'Photo'} Details
          </DialogTitle>
          <DialogDescription>
            Add title, description, and tags to make your content discoverable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative max-h-48 rounded-lg overflow-hidden drop-shadow-lg bg-muted">
              {isVideo ? (
                <div className="relative w-full h-full">
                  <img
                    src={mediaData?.url}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={existingItem?.url || mediaData?.url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Enter ${itemType} title`}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Optional description of your ${itemType}`}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategoryId || undefined} onValueChange={(value) => setSelectedCategoryId(value || '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || '#6b7280' }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  What type of content this is
                </p>
              </div>

              <div>
                <Label htmlFor="album">Album</Label>
                <Select value={selectedAlbumId || undefined} onValueChange={(value) => setSelectedAlbumId(value || '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select album (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Which album to add this to
                </p>
              </div>
            </div>


            <div>
              <Label htmlFor="tags">Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag and press Enter"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:bg-secondary-foreground/10 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tags help organize and search your content
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Skip for Now
            </Button>
            <Button 
              onClick={handleSaveItem} 
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? (existingItem ? 'Updating...' : 'Creating...') : (existingItem ? 'Update Item' : 'Create Item')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryItemEditor;