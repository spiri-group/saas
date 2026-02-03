"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Image as ImageIcon, Video, Upload, Link as LinkIcon, Loader2, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import FileUploader, { FileUploaderTarget } from "@/components/ux/FileUploader";
import { media_type } from "@/utils/spiriverse";
import { gql } from "@/lib/services/gql";
import { toast } from "sonner";
import UseDeleteEmailAsset from "../hooks/UseDeleteEmailAsset";

interface EmailAsset {
  name: string;
  url: string;
  size: number;
  lastModified: string;
  contentType?: string;
}

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  type?: "image" | "video" | "all";
  title?: string;
  description?: string;
}

const UPLOAD_TARGET: FileUploaderTarget = {
  container: "public",
  relative_path: "email-templates"
};

const IMAGE_VARIANTS = [
  { name: "thumbnail", width: 200, height: 200 },
  { name: "medium", width: 800, height: 600 },
  { name: "large", width: 1200, height: 900 }
];

export default function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  type = "all",
  title = "Select Media",
  description = "Choose an existing file or upload a new one"
}: MediaPickerDialogProps) {
  const [urlInput, setUrlInput] = useState("");
  const [emailAssets, setEmailAssets] = useState<EmailAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [deletePopoverOpen, setDeletePopoverOpen] = useState<string | null>(null);

  const deleteMutation = UseDeleteEmailAsset();

  const handleDeleteConfirm = (asset: EmailAsset) => {
    deleteMutation.mutate(asset.name, {
      onSuccess: () => {
        toast.success(`"${asset.name}" deleted successfully`);
        setDeletePopoverOpen(null);
        fetchEmailAssets();
      },
      onError: (error: any) => {
        const errorMessage = error?.message || 'Failed to delete asset';
        toast.error(errorMessage);
        setDeletePopoverOpen(null);
      }
    });
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onSelect(urlInput.trim());
      setUrlInput("");
      onClose();
    }
  };

  const fetchEmailAssets = async () => {
    setIsLoadingAssets(true);
    setAssetsError(null);

    try {
      const response = await gql<{
        emailAssets: EmailAsset[];
      }>(`
        query GetEmailAssets($prefix: String, $maxResults: Int) {
          emailAssets(prefix: $prefix, maxResults: $maxResults) {
            name
            url
            size
            lastModified
            contentType
          }
        }
      `, {
        prefix: UPLOAD_TARGET.relative_path,
        maxResults: 50
      });

      setEmailAssets(response.emailAssets || []);
    } catch (error) {
      console.error("Error fetching email assets:", error);
      setAssetsError(error instanceof Error ? error.message : "Failed to load files");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleUploadComplete = (files: media_type[]) => {
    if (files.length > 0) {
      // Auto-select first uploaded file
      onSelect(files[0].url);
      // Refresh the asset list to show the new upload
      fetchEmailAssets();
      onClose();
    }
  };

  const handleFileSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  // Filter assets by type
  const filteredAssets = emailAssets.filter((asset) => {
    if (type === "all") return true;

    const isImage = asset.contentType?.startsWith("image/") ||
                    asset.name.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);
    const isVideo = asset.contentType?.startsWith("video/") ||
                    asset.name.match(/\.(mp4|webm|mov)$/i);

    if (type === "image") return isImage;
    if (type === "video") return isVideo;

    return true;
  });

  // Fetch assets when dialog opens
  useEffect(() => {
    if (open) {
      fetchEmailAssets();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[800px] h-[600px] max-w-[90vw] max-h-[90vh] bg-slate-900 border-slate-700 flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800 flex-shrink-0">
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="recent" className="flex-1 flex flex-col overflow-hidden px-6">
          <TabsList className="grid w-full grid-cols-3 mt-4 flex-shrink-0 bg-slate-800 border border-slate-700">
            <TabsTrigger
              value="url"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              URL
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Recent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 flex-1 overflow-y-auto py-4 mt-0">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Enter {type === "image" ? "Image" : type === "video" ? "Video" : "Media"} URL
              </label>
              <div className="flex space-x-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUrlSubmit();
                    }
                  }}
                  className="flex-1 bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Select
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Paste a URL from your CDN, public folder, or external source
              </p>
            </div>

            {/* URL Preview */}
            {urlInput.trim() && (
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-800">
                <p className="text-xs text-slate-400 mb-2">Preview:</p>
                {type === "video" || urlInput.match(/\.(mp4|webm|mov)$/i) ? (
                  <video
                    src={urlInput}
                    className="w-full h-auto max-h-64 rounded"
                    controls
                    onError={(e) => {
                      (e.target as HTMLVideoElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="w-full h-auto max-h-64 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 flex-1 overflow-y-auto py-4 mt-0">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Upload New {type === "image" ? "Image" : type === "video" ? "Video" : "File"}
              </label>
              <FileUploader
                id="media-picker-upload"
                connection={UPLOAD_TARGET}
                targetImage={{ width: 1200, height: 900 }}
                targetImageVariants={IMAGE_VARIANTS}
                acceptOnly={
                  type === "image" ? { type: "IMAGE" } :
                  type === "video" ? { type: "VIDEO" } :
                  undefined
                }
                allowMultiple={false}
                onDropAsync={async (files) => {
                  console.log("Files dropped:", files);
                }}
                onUploadCompleteAsync={handleUploadComplete}
                includePreview={true}
                className="min-h-[200px]"
                imageClassName="h-[200px]"
              />
              <p className="text-xs text-slate-500">
                Files will be uploaded to Azure and available immediately
              </p>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4 flex-1 overflow-y-auto py-4 mt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Email Template Assets
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchEmailAssets}
                  disabled={isLoadingAssets}
                  className="h-7 px-2 text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingAssets ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {isLoadingAssets ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                    <p className="text-sm text-slate-400">Loading files...</p>
                  </div>
                </div>
              ) : assetsError ? (
                <div className="border-2 border-red-500/20 bg-red-500/10 rounded-lg p-8 text-center">
                  <p className="text-red-400 text-sm mb-2">Failed to load files</p>
                  <p className="text-red-300/70 text-xs">{assetsError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchEmailAssets}
                    className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {filteredAssets.map((asset, index) => {
                    const isVideo = asset.contentType?.startsWith("video/") ||
                                   asset.name.match(/\.(mp4|webm|mov)$/i);

                    return (
                      <div
                        key={index}
                        className="relative group border-2 border-slate-700 rounded-lg overflow-hidden hover:border-purple-500 transition-all cursor-pointer"
                        title={asset.name}
                        onClick={() => handleFileSelect(asset.url)}
                      >
                        {isVideo ? (
                          <div className="aspect-video bg-slate-800 flex items-center justify-center">
                            <Video className="h-8 w-8 text-slate-500" />
                          </div>
                        ) : (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full aspect-video object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="text-white text-sm">Select</span>
                        </div>
                        {/* Delete button with confirmation popover */}
                        <Popover
                          open={deletePopoverOpen === asset.name}
                          onOpenChange={(open) => setDeletePopoverOpen(open ? asset.name : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              disabled={deleteMutation.isPending}
                              className="absolute top-1 right-1 h-7 w-7 p-0 bg-red-600/90 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="Delete asset"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-80 bg-slate-900 border-slate-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-2">
                                  <h4 className="text-sm font-medium text-white">Delete this asset?</h4>
                                  <p className="text-xs text-slate-400">
                                    <strong className="text-slate-300">{asset.name}</strong>
                                  </p>
                                  <p className="text-xs text-amber-400/90">
                                    If this asset is being used in templates, deleting it may break those templates.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletePopoverOpen(null);
                                  }}
                                  className="flex-1 border-slate-600 text-slate-300"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteConfirm(asset);
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {deleteMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <p className="absolute bottom-0 left-0 right-0 bg-slate-900/90 text-xs text-slate-300 p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {asset.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    {type === "all" ? "No files uploaded yet" :
                     type === "image" ? "No images found" :
                     "No videos found"}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Upload files in the &quot;Upload&quot; tab
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
