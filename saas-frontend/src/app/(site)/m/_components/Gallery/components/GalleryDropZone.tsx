'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { media_type } from '@/utils/spiriverse';
import { useCreateGalleryItem } from '../hooks/UseCreateGalleryItem';
import { v4 as uuid } from 'uuid';
import { 
  MERCHANT_PLANS, 
  validateFileSize, 
  validateStorageCapacity} from '../utils/storageUtils';

export interface UploadingFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  mediaData?: media_type;
  error?: string;
}

interface Props {
  merchantId: string;
  categoryId?: string | null;
  albumId?: string | null;
  onFileUploaded: (mediaData: media_type) => void;
  onItemCreated?: () => void;
  merchantPlan?: 'base' | 'premium';
  currentStorageBytes?: number;
  className?: string;
  onUploadingFilesChange?: (files: UploadingFile[]) => void;
}

const GalleryDropZone: React.FC<Props> = ({ 
  merchantId,
  categoryId,
  albumId,
  onFileUploaded,
  onItemCreated,
  merchantPlan = 'base',
  currentStorageBytes = 0,
  className,
  onUploadingFilesChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const createGalleryItemMutation = useCreateGalleryItem();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageLimits = MERCHANT_PLANS[merchantPlan].limits;
  
  const acceptedTypes = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.mov', '.avi', '.mkv']
  };

  // Notify parent component of state changes
  useEffect(() => {
    if (onUploadingFilesChange) {
      onUploadingFilesChange(uploadingFiles);
    }
  }, [uploadingFiles, onUploadingFilesChange]);


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
      // Reset input
      e.target.value = '';
    }
  };

  const processFiles = (files: File[]) => {
    const errors: string[] = [];
    const validFiles: File[] = [];

    // First, validate file types and basic requirements
    files.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      // Validate individual file size against plan limits
      const sizeValidation = validateFileSize(file, storageLimits);
      if (!sizeValidation.valid) {
        errors.push(`${file.name}: ${sizeValidation.error}`);
        return;
      }

      validFiles.push(file);
    });

    // Validate total storage capacity
    if (validFiles.length > 0) {
      const storageValidation = validateStorageCapacity(validFiles, currentStorageBytes, storageLimits);
      if (!storageValidation.valid) {
        errors.push(storageValidation.error!);
        setValidationErrors(errors);
        return;
      }
    }

    // If we have any validation errors, show them
    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 8000); // Clear errors after 8 seconds
      return;
    }

    // Clear any previous errors
    setValidationErrors([]);

    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: uuid(),
      file,
      status: 'pending',
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Start uploading files in background
    newUploadingFiles.forEach(uploadingFile => {
      uploadFile(uploadingFile);
    });
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      setUploadingFiles(prev => prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'uploading' } : f));

      const formData = new FormData();
      formData.append('files', uploadingFile.file);

      const res = await fetch('/api/azure_upload', {
        method: 'POST',
        body: formData,
        headers: {
          container: 'public',
          relative_path: `merchants/${merchantId}/gallery`,
          output: 'image/webp',
          variants: JSON.stringify([
            { suffix: 'tile', width: 380, height: 380, fit: 'cover' },
            { suffix: 'dialog', width: 1280, height: 720, fit: 'contain' },
            { suffix: 'fullscreen', width: 1920, height: 1080, fit: 'contain' },
          ]),
        } as any,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);

      // pick the canonical image URL if present, else the canonical (original) URL
      const list: Array<{ name: string; url: string; sizeBytes: number }> = json.uploaded || [];
      const base = uploadingFile.file.name.replace(/\.[^.]+$/, '').replace(/%20/g,'-').replace(/\s+/g,'-');

      // Calculate total size from all variants
      const totalSizeBytes = list.reduce((total, item) => total + (item.sizeBytes || 0), 0);

      let main = list.find(x => x.name.endsWith(`/${base}.webp`) || x.name.endsWith(`/${base}.png`) || x.name.endsWith(`/${base}.jpeg`) || x.name.endsWith(`/${base}.jpg`));
      if (!main) {
        const ext = uploadingFile.file.name.split('.').pop()?.toLowerCase();
        main = list.find(x => x.name.endsWith(`/${base}.${ext}`)) || list[0];
      }

      const isVideo = uploadingFile.file.type.startsWith('video/');

      let mediaData: media_type;
      if (isVideo) {
        mediaData = {
          code: uuid(),
          name: main?.name.split('/').pop() || uploadingFile.file.name,
          url: main?.url || '',
          urlRelative: main?.name || '',
          type: 'VIDEO' as any,
          size: 'RECTANGLE_HORIZONTAL',
          sizeBytes: totalSizeBytes || uploadingFile.file.size
        };
      } else {
        // load to detect aspect (optional)
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = main?.url || '';
        });

        mediaData = {
          code: uuid(),
          name: main?.name.split('/').pop() || `${base}.webp`,
          url: main?.url || '',
          urlRelative: main?.name || '',
          type: 'IMAGE' as any,
          size: img.width === img.height ? 'SQUARE' : (img.width > img.height ? 'RECTANGLE_HORIZONTAL' : 'RECTANGLE_VERTICAL'),
          sizeBytes: totalSizeBytes || uploadingFile.file.size
        };
      }

      // Extract filename without extension for the title
      const fileName = uploadingFile.file.name;
      const title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
      
      // Create gallery item immediately
      await createGalleryItemMutation.mutateAsync({
        merchantId,
        categoryId: categoryId || undefined,
        albumId: albumId || undefined,
        type: isVideo ? 'video' : 'photo',
        title: title || fileName, // Fallback to full filename if title is empty
        mediaUrl: mediaData.url,
        thumbnailUrl: mediaData.url,
        layout: 'single',
        usedBytes: mediaData.sizeBytes
      });
      
      setUploadingFiles(prev => prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'completed', progress: 100, mediaData } : f));
      onFileUploaded(mediaData);
      if (onItemCreated) {
        onItemCreated();
      }

      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
      }, 1500);

    } catch (e: any) {
      console.error(e);
      setUploadingFiles(prev => prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'error', error: e?.message || 'Upload failed' } : f));
    }
  };

  return (
    <>
      {/* Compact Square Drop Zone */}
      <Card 
        className={cn(
          'border-2 border-dashed transition-all duration-200 cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center aspect-square text-center p-6">
          <Upload className={cn('h-8 w-8 mb-3', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="text-base font-medium mb-2">
            {isDragging ? 'Drop files here' : 'Drop or click to upload'}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Images & Videos
          </p>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">Max {storageLimits.maxPhotoSizeMB}MB photos</Badge>
            <Badge variant="outline" className="text-xs">Max {storageLimits.maxVideoSizeGB}GB videos</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors - Show as overlay */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50 mt-4">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-red-800">Upload validation failed</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.keys(acceptedTypes).join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
};

export default GalleryDropZone;