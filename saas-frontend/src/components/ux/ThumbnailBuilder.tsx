import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageIcon, VideoIcon, ImagesIcon, Upload, X, Sun, Moon, ZoomIn, Tag } from 'lucide-react';
import { Control, useWatch } from 'react-hook-form';
import ColorPickerDropDown from './ColorPickerDropDown';
import RichTextInput from './RichTextInput';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type MediaFile = {
  name: string;
  url: string;
  urlRelative: string;
  size: "SQUARE" | "RECTANGLE_HORIZONTAL" | "RECTANGLE_VERTICAL";
  type: "AUDIO" | "VIDEO" | "IMAGE";
  code: string;
  sizeBytes?: number;
  durationSeconds?: number;
};

const STAMP_COLOR_COMBINATIONS = [
  { name: "Red Alert", bgColor: "#dc2626", textColor: "#ffffff" },
  { name: "Orange Fire", bgColor: "#f97316", textColor: "#ffffff" },
  { name: "Yellow Burst", bgColor: "#eab308", textColor: "#000000" },
  { name: "Green Success", bgColor: "#22c55e", textColor: "#ffffff" },
  { name: "Blue Ocean", bgColor: "#3b82f6", textColor: "#ffffff" },
  { name: "Purple Magic", bgColor: "#a855f7", textColor: "#ffffff" },
  { name: "Pink Power", bgColor: "#ec4899", textColor: "#ffffff" },
  { name: "Teal Fresh", bgColor: "#14b8a6", textColor: "#ffffff" },
  { name: "Black Bold", bgColor: "#000000", textColor: "#ffffff" },
  { name: "White Clean", bgColor: "#ffffff", textColor: "#000000" },
];

// Zoom Rail Component
function ZoomRail({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-stretch gap-2 select-none">
      <div className="flex items-center gap-2">
        <ZoomIn className="w-4 h-4" />
        <span className="text-xs text-slate-400">Zoom</span>
      </div>

      {/* Discrete steps */}
      <div className="grid grid-rows-auto grid-cols-1 gap-1">
        {[1, 0.9, 0.75, 0.5, 0.25].map((v) => (
          <Button
            key={v}
            size="sm"
            type="button"
            variant={v === value ? "default" : "outline"}
            onClick={() => onChange(v)}
          >
            {v}x
          </Button>
        ))}
      </div>

      {/* Fine control */}
      <input
        type="range"
        min={0.25}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-28"
      />
    </div>
  );
}

type ThumbnailBuilderProps = {
  control: Control<any>;
  name: string;
  dark?: boolean;
  onUploadCoverPhoto: (file: File) => Promise<MediaFile>;
  onUploadVideo: (file: File) => Promise<MediaFile>;
  onUploadCollageImage: (file: File) => Promise<MediaFile>;
};

export const ThumbnailBuilder: React.FC<ThumbnailBuilderProps> = ({
  control,
  name,
  dark = false,
  onUploadCoverPhoto,
  onUploadVideo,
  onUploadCollageImage
}) => {
  const [dynamicMode, setDynamicMode] = useState<"none" | "video" | "collage">("none");
  const [panelTone, setPanelTone] = useState<"light" | "dark">("light");
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [collagePreview, setCollagePreview] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCollage, setUploadingCollage] = useState(false);
  const [coverSectionCollapsed, setCoverSectionCollapsed] = useState(false);
  const [dynamicSectionCollapsed, setDynamicSectionCollapsed] = useState(false);
  const [panelSectionCollapsed, setPanelSectionCollapsed] = useState(true); // Collapsed by default

  // New state for advanced features
  const [zoom, setZoom] = useState(1);
  const [objectFit, setObjectFit] = useState<"cover" | "contain">("cover");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [stampEnabled, setStampEnabled] = useState(false);
  const [stampText, setStampText] = useState("NEW");
  const [stampBgColor, setStampBgColor] = useState("#dc2626");
  const [stampTextColor, setStampTextColor] = useState("#ffffff");
  const [titleText, setTitleText] = useState("");
  const [hoverDescription, setHoverDescription] = useState("");

  // Watch the field value to initialize state from existing data
  const fieldValue = useWatch({ control, name });
  const hasInitialized = useRef(false);

  // Initialize state from existing field value (runs when fieldValue becomes available)
  useEffect(() => {
    if (fieldValue && !hasInitialized.current) {
      hasInitialized.current = true;

      // Cover photo
      if (fieldValue.image?.media?.url) {
        setCoverPhotoPreview(fieldValue.image.media.url);
        setCoverSectionCollapsed(true); // Collapse when editing
      }

      // Image settings
      if (fieldValue.image?.zoom) {
        setZoom(fieldValue.image.zoom);
      }
      if (fieldValue.image?.objectFit) {
        setObjectFit(fieldValue.image.objectFit);
      }

      // Background color
      if (fieldValue.bgColor) {
        setBgColor(fieldValue.bgColor);
      }

      // Panel tone
      if (fieldValue.panelTone) {
        setPanelTone(fieldValue.panelTone);
      }

      // Stamp
      if (fieldValue.stamp) {
        setStampEnabled(fieldValue.stamp.enabled || false);
        setStampText(fieldValue.stamp.text || "NEW");
        setStampBgColor(fieldValue.stamp.bgColor || "#dc2626");
        setStampTextColor(fieldValue.stamp.textColor || "#ffffff");
      }

      // Title and description
      if (fieldValue.title?.content) {
        setTitleText(fieldValue.title.content);
      }
      if (fieldValue.moreInfo?.content) {
        setHoverDescription(fieldValue.moreInfo.content);
      }

      // Dynamic mode
      if (fieldValue.dynamicMode) {
        if (fieldValue.dynamicMode.type === 'VIDEO' && fieldValue.dynamicMode.video?.media?.url) {
          setDynamicMode('video');
          setVideoPreview(fieldValue.dynamicMode.video.media.url);
          setDynamicSectionCollapsed(true); // Collapse when editing
        } else if (fieldValue.dynamicMode.type === 'COLLAGE' && fieldValue.dynamicMode.collage?.images) {
          setDynamicMode('collage');
          setCollagePreview(fieldValue.dynamicMode.collage.images.map(img => img.url));
          setDynamicSectionCollapsed(true); // Collapse when editing
        }
      }
    }
  }, [fieldValue]); // Re-run when fieldValue becomes available

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className="w-full">
          <>
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Service Thumbnail</h2>
            <p className="text-sm text-slate-400">Upload images and customise how your listing appears</p>
          </div>

          {/* Main layout: Steps on left, Preview on right */}
          <div className="flex gap-6 w-full min-w-0">
            {/* Steps container - scrollable on the left */}
            <div className="flex-1 space-y-6 max-h-[600px] overflow-y-auto pr-4 min-w-0">
            {/* Cover Photo Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <FormLabel dark={dark} className="text-base font-semibold">
                    {!coverPhotoPreview ? "Step 1: Add Your Universal Cover Photo" : "✓ Step 1 Complete"}
                  </FormLabel>
                </div>
                {coverPhotoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverSectionCollapsed(!coverSectionCollapsed)}
                  >
                    {coverSectionCollapsed ? 'Edit' : 'Collapse'}
                  </Button>
                )}
              </div>
              
              {!coverSectionCollapsed && (
                <>
                  <p className="text-sm text-slate-400">
                    Choose an image that represents your reading energy and style.
                  </p>
                  
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 hover:border-purple-400 transition-colors">
                    {coverPhotoPreview ? (
                      <>
                      <div className="flex gap-3">
                        {/* Zoom Rail on the left */}
                        <ZoomRail
                          value={zoom}
                          onChange={(v) => {
                            setZoom(v);
                            field.onChange({
                              ...field.value,
                              image: {
                                ...field.value.image,
                                zoom: v
                              }
                            });
                          }}
                        />

                        {/* Preview in the middle */}
                        <div className="relative w-48">
                          <div
                            className="w-full aspect-square rounded-lg overflow-hidden"
                            style={{
                              background: objectFit === "contain" ? bgColor : "transparent"
                            }}
                          >
                            <img
                              src={coverPhotoPreview}
                              alt="Cover preview"
                              className="w-full h-full rounded-lg"
                              style={{
                                objectFit: objectFit,
                                transform: `scale(${zoom})`
                              }}
                            />
                            {stampEnabled && stampText && (
                              <div
                                className="absolute top-2 left-2 z-10 px-2 py-1 text-2xl font-bold rounded shadow-lg"
                                style={{ backgroundColor: stampBgColor, color: stampTextColor }}
                              >
                                {stampText}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setCoverPhotoPreview(null);
                              setCoverSectionCollapsed(false);
                              setZoom(1);
                              setObjectFit("cover");
                              setBgColor("#ffffff");
                              setStampEnabled(false);
                              field.onChange({
                                ...field.value,
                                image: undefined
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Controls on the right */}
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                          {/* Object Fit */}
                          <div className="flex flex-col gap-1.5">
                            <label className={cn("text-xs font-medium", dark && "text-slate-300")}>Image Fit</label>
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant={objectFit === "contain" ? "default" : "outline"}
                                onClick={() => {
                                  setObjectFit("contain");
                                  field.onChange({
                                    ...field.value,
                                    image: {
                                      ...field.value.image,
                                      objectFit: "contain"
                                    }
                                  });
                                }}
                                className="flex-1 text-xs h-7"
                              >
                                Contain
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={objectFit === "cover" ? "default" : "outline"}
                                onClick={() => {
                                  setObjectFit("cover");
                                  field.onChange({
                                    ...field.value,
                                    image: {
                                      ...field.value.image,
                                      objectFit: "cover"
                                    }
                                  });
                                }}
                                className="flex-1 text-xs h-7"
                              >
                                Cover
                              </Button>
                            </div>
                          </div>

                          {/* Background Color (only for contain mode) */}
                          {objectFit === "contain" && (
                            <div className="flex flex-col gap-1.5">
                              <label className={cn("text-xs font-medium", dark && "text-slate-300")}>Background Color</label>
                              <ColorPickerDropDown
                                value={bgColor}
                                placeholder="Choose background color"
                                onChange={(color) => {
                                  setBgColor(color || "#ffffff");
                                  field.onChange({
                                    ...field.value,
                                    bgColor: color || "#ffffff"
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Confirm Button */}
                      <div className="mt-4">
                        <Button
                          type="button"
                          onClick={() => setCoverSectionCollapsed(true)}
                          className="w-full"
                        >
                          ✓ Looks Good - Continue to Step 2
                        </Button>
                      </div>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload className="h-10 w-10 text-slate-400 mb-2" />
                        <span className="text-sm font-medium">Upload Cover Photo</span>
                        <span className="text-xs text-slate-400 mt-1">
                          PNG, JPG up to 10MB
                        </span>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingCover}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploadingCover(true);
                            try {
                              const media = await onUploadCoverPhoto(file);
                              setCoverPhotoPreview(media.url);
                              field.onChange({
                                ...field.value,
                                image: {
                                  media,
                                  zoom: 1,
                                  objectFit: "cover"
                                }
                              });
                            } catch (error) {
                              console.error('Upload failed:', error);
                            } finally {
                              setUploadingCover(false);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Dynamic Mode Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ImagesIcon className="h-5 w-5" />
                  <FormLabel dark={dark} className="text-base font-semibold">
                    {!videoPreview && collagePreview.length === 0 
                      ? "Step 2: Add Dynamic Movement (Optional)" 
                      : "✓ Step 2 Complete"}
                  </FormLabel>
                </div>
                {(videoPreview || collagePreview.length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDynamicSectionCollapsed(!dynamicSectionCollapsed)}
                  >
                    {dynamicSectionCollapsed ? 'Edit' : 'Collapse'}
                  </Button>
                )}
              </div>
              
              {!dynamicSectionCollapsed && (
                <>
                  <p className="text-sm text-slate-400">
                    Add movement to draw clients in — video of yourself, or a slideshow of meaningful images.
                  </p>

                  <RadioGroup
                    value={dynamicMode}
                    onValueChange={(value: "none" | "video" | "collage") => {
                      setDynamicMode(value);
                      if (value === "none") {
                        field.onChange({
                          ...field.value,
                          dynamicMode: undefined
                        });
                      }
                    }}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="none" />
                      <Label dark={dark} htmlFor="none" className="cursor-pointer">
                        None
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="video" id="video" />
                      <Label dark={dark} htmlFor="video" className="cursor-pointer flex items-center">
                        <VideoIcon className="h-4 w-4 mr-1" />
                        Video
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="collage" id="collage" />
                      <Label dark={dark} htmlFor="collage" className="cursor-pointer flex items-center">
                        <ImagesIcon className="h-4 w-4 mr-1" />
                        Slideshow
                      </Label>
                    </div>
                  </RadioGroup>

              {/* Video Mode Upload */}
              {dynamicMode === "video" && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium">
                    Upload a short video clip
                  </p>
                  <p className="text-xs text-slate-400">
                    Show your presence — clients will see this when they hover over your reading.
                  </p>
                  
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-blue-400 transition-colors">
                    {videoPreview ? (
                      <div className="relative w-64 mx-auto">
                        <video
                          src={videoPreview}
                          className="w-full aspect-square object-cover rounded-lg"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setVideoPreview(null);
                            field.onChange({
                              ...field.value,
                              dynamicMode: undefined
                            });
                            setDynamicMode("none");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer">
                        <VideoIcon className="h-10 w-10 text-slate-400 mb-2" />
                        <span className="text-sm font-medium">Upload Video (max 5s)</span>
                        <span className="text-xs text-slate-400 mt-1">
                          MP4, WebM up to 50MB
                        </span>
                        <Input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          disabled={uploadingVideo}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setUploadingVideo(true);
                            try {
                              const media = await onUploadVideo(file);
                              setVideoPreview(media.url);
                              setDynamicSectionCollapsed(true);
                              field.onChange({
                                ...field.value,
                                dynamicMode: {
                                  type: "VIDEO",
                                  video: {
                                    media,
                                    autoplay: true,
                                    muted: true
                                  }
                                }
                              });
                            } catch (error) {
                              console.error('Upload failed:', error);
                            } finally {
                              setUploadingVideo(false);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Collage Mode Upload */}
              {dynamicMode === "collage" && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium">
                    Upload 3-5 images for a gentle slideshow
                  </p>
                  <p className="text-xs text-slate-400">
                    Perfect for tarot spreads, oracle cards, crystals, or sacred symbols.
                  </p>

                  <div className="space-y-3">
                    {collagePreview.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 max-w-xl mx-auto">
                        {collagePreview.map((preview, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={preview}
                              alt={`Collage ${idx + 1}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => {
                                const newPreviews = collagePreview.filter((_, i) => i !== idx);
                                setCollagePreview(newPreviews);

                                const currentValue = field.value;
                                const currentImages = currentValue?.dynamicMode?.collage?.images || [];
                                const newImages = currentImages.filter((_: any, i: number) => i !== idx);

                                if (newImages.length === 0) {
                                  setDynamicMode("none");
                                  field.onChange({
                                    ...currentValue,
                                    dynamicMode: undefined
                                  });
                                } else {
                                  field.onChange({
                                    ...currentValue,
                                    dynamicMode: {
                                      type: "COLLAGE",
                                      collage: {
                                        images: newImages,
                                        transitionDuration: 3,
                                        crossFade: true
                                      }
                                    }
                                  });
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {collagePreview.length < 5 && (
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-blue-400 transition-colors">
                        <label className="flex flex-col items-center justify-center cursor-pointer">
                          <ImagesIcon className="h-10 w-10 text-slate-400 mb-2" />
                          <span className="text-sm font-medium">
                            Add Image ({collagePreview.length}/5)
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            PNG, JPG up to 10MB each
                          </span>
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingCollage}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              setUploadingCollage(true);
                              try {
                                const media = await onUploadCollageImage(file);
                                const newPreviews = [...collagePreview, media.url];
                                setCollagePreview(newPreviews);

                                const currentValue = field.value;
                                const currentImages = currentValue?.dynamicMode?.collage?.images || [];

                                field.onChange({
                                  ...currentValue,
                                  dynamicMode: {
                                    type: "COLLAGE",
                                    collage: {
                                      images: [...currentImages, media],
                                      transitionDuration: 3,
                                      crossFade: true
                                    }
                                  }
                                });

                                // Collapse section when user has uploaded 3+ images
                                if (newPreviews.length >= 3) {
                                  setDynamicSectionCollapsed(true);
                                }
                              } catch (error) {
                                console.error('Upload failed:', error);
                              } finally {
                                setUploadingCollage(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {/* Panel Style & Content - Step 3 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sun className="h-5 w-5" />
                  <FormLabel dark={dark} className="text-base font-semibold">
                    Step 3: Customize Panel Style (Optional)
                  </FormLabel>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanelSectionCollapsed(!panelSectionCollapsed)}
                >
                  {panelSectionCollapsed ? 'Expand' : 'Collapse'}
                </Button>
              </div>

              {!panelSectionCollapsed && (
                <>
                  <p className="text-sm text-slate-400">
                    Customize the panel that appears below your image.
                  </p>

                {/* Title Input */}
                <div className="flex flex-col gap-2">
                  <label className={cn("text-sm font-medium", dark && "text-slate-300")}>Title (Optional)</label>
                  <Input
                    type="text"
                    placeholder="Your service title"
                    value={titleText}
                    maxLength={50}
                    onChange={(e) => {
                      setTitleText(e.target.value);
                      field.onChange({
                        ...field.value,
                        title: {
                          ...field.value.title,
                          content: e.target.value
                        }
                      });
                    }}
                  />
                  <p className="text-xs text-slate-400">
                    Leave blank to use the service name automatically
                  </p>
                </div>

                {/* Hover Description */}
                {titleText && (
                  <div className="flex flex-col gap-2">
                    <label className={cn("text-sm font-medium", dark && "text-slate-300")}>Hover Description (Optional)</label>
                    <RichTextInput
                      value={hoverDescription}
                      onChange={(content) => {
                        setHoverDescription(content || "");
                        field.onChange({
                          ...field.value,
                          moreInfo: {
                            content: content || undefined
                          }
                        });
                      }}
                      placeholder="Add details that appear when users hover over the title..."
                    />
                  </div>
                )}

                {/* Panel Tone */}
                <div className="flex flex-col gap-2">
                  <label className={cn("text-sm font-medium", dark && "text-slate-300")}>Panel Tone</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={panelTone === "light" ? "default" : "outline"}
                      onClick={() => {
                        setPanelTone("light");
                        field.onChange({ ...field.value, panelTone: "light" });
                      }}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Sun className="w-4 h-4" /> Light
                    </Button>
                    <Button
                      type="button"
                      variant={panelTone === "dark" ? "default" : "outline"}
                      onClick={() => {
                        setPanelTone("dark");
                        field.onChange({ ...field.value, panelTone: "dark" });
                      }}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Moon className="w-4 h-4" /> Dark
                    </Button>
                  </div>
                </div>
                </>
              )}
            </div>
            </div>

            {/* Preview Box on the right */}
            <div className="w-[320px] flex-shrink-0">
              {(coverPhotoPreview || videoPreview || collagePreview.length > 0) ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="text-sm font-bold mb-1">
                      {!videoPreview && collagePreview.length === 0
                        ? "This is just the beginning..."
                        : "✨ Live Preview"
                      }
                    </h4>
                    <p className="text-xs text-slate-400">
                      {videoPreview
                        ? "Hover to see it come alive ✨"
                        : collagePreview.length > 0
                          ? "Watch the slideshow flow 🌙"
                          : "Add video/slideshow above!"
                      }
                    </p>
                  </div>

                  {/* Preview tile */}
                  <div className="flex flex-col rounded-xl overflow-hidden shadow-lg w-full">
                        {/* Image area - h-60 to match CatalogueItem */}
                        <div
                          className="relative w-full h-60 overflow-hidden rounded-t-xl group"
                          style={{
                            background: objectFit === "contain" ? bgColor : "transparent"
                          }}
                        >
                          {/* Stamp overlay (fades on hover if video present) */}
                          {stampEnabled && stampText && (
                            <div
                              className={`absolute top-2 left-2 z-10 px-2 py-1 text-2xl font-bold rounded shadow-lg ${
                                dynamicMode === "video" ? "transition-opacity duration-200 group-hover:opacity-0" : ""
                              }`}
                              style={{ backgroundColor: stampBgColor, color: stampTextColor }}
                            >
                              {stampText}
                            </div>
                          )}

                          {/* Cover photo layer (always visible) */}
                          {coverPhotoPreview && (
                            <img
                              src={coverPhotoPreview}
                              alt="Cover"
                              className="absolute inset-0 w-full h-full"
                              style={{
                                objectFit: objectFit,
                                transform: `scale(${zoom})`
                              }}
                            />
                          )}

                          {/* Video layer (only visible on hover) */}
                          {dynamicMode === "video" && videoPreview && (
                            <video
                              src={videoPreview}
                              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              muted
                              loop
                              playsInline
                              onMouseEnter={(e) => {
                                e.currentTarget.currentTime = 0;
                                e.currentTarget.play();
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                          )}

                          {/* Collage layer (always animating) */}
                          {dynamicMode === "collage" && collagePreview.length > 0 && (
                            <div className="absolute inset-0 w-full h-full">
                              {collagePreview.map((preview, idx) => (
                                <img
                                  key={idx}
                                  src={preview}
                                  alt={`Collage ${idx}`}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  style={{
                                    animation: `fadeInOut ${collagePreview.length * 3}s infinite`,
                                    animationDelay: `${idx * 3}s`,
                                    opacity: idx === 0 ? 1 : 0,
                                    willChange: 'opacity'
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Panel area - h-20 to match CatalogueItem */}
                        <div
                          className="p-2 px-4 h-20 w-full flex flex-col gap-1 rounded-b-xl"
                          style={{
                            background: panelTone === "dark"
                              ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
                              : "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)",
                            color: panelTone === "dark" ? "#ffffff" : "#000000",
                            border: panelTone === "dark"
                              ? "1px solid rgba(255,255,255,0.06)"
                              : "1px solid rgba(0,0,0,0.05)"
                          }}
                        >
                          {titleText && hoverDescription ? (
                            <HoverCard>
                              <HoverCardTrigger className="text-sm font-bold truncate text-left">
                                {titleText}
                              </HoverCardTrigger>
                              <HoverCardContent className="flex flex-col gap-2">
                                <div
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{ __html: hoverDescription }}
                                />
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <span className="text-sm font-bold truncate">
                              {titleText || "Your Listing Title"}
                            </span>
                          )}
                          <span
                            className="text-md"
                            style={{
                              color: panelTone === "dark"
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(0,0,0,0.6)"
                            }}
                          >
                            Price shown here
                          </span>
                        </div>
                      </div>

                  {/* Stamp Controls - Popover - Fixed position anchor */}
                  <div className="relative">
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant={stampEnabled ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            // Enable stamp when opening for the first time
                            if (!stampEnabled) {
                              setStampEnabled(true);
                              field.onChange({
                                ...field.value,
                                stamp: {
                                  text: stampText,
                                  enabled: true,
                                  bgColor: stampBgColor,
                                  textColor: stampTextColor
                                }
                              });
                            }
                          }}
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          {stampEnabled ? `Stamp: ${stampText}` : "Add Stamp Badge"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="center" side="bottom" sideOffset={5}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Stamp Badge</h4>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                          </div>

                          <div>
                            <label className="text-xs font-medium mb-1.5 block">Text</label>
                            <Input
                              type="text"
                              placeholder="e.g. NEW, SALE"
                              value={stampText}
                              className="text-sm h-8"
                              maxLength={18}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                setStampText(e.target.value);
                                field.onChange({
                                  ...field.value,
                                  stamp: {
                                    ...field.value.stamp,
                                    text: e.target.value
                                  }
                                });
                              }}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium mb-1.5 block">Color Theme</label>
                            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                              {STAMP_COLOR_COMBINATIONS.map((combo) => (
                                <Button
                                  key={combo.name}
                                  type="button"
                                  variant={stampBgColor === combo.bgColor ? "default" : "outline"}
                                  size="sm"
                                  className="flex items-center justify-start gap-1.5 h-8 text-xs"
                                  onClick={() => {
                                    setStampBgColor(combo.bgColor);
                                    setStampTextColor(combo.textColor);
                                    field.onChange({
                                      ...field.value,
                                      stamp: {
                                        ...field.value.stamp,
                                        bgColor: combo.bgColor,
                                        textColor: combo.textColor
                                      }
                                    });
                                  }}
                                >
                                  <div
                                    className="w-3 h-3 rounded border flex-shrink-0"
                                    style={{
                                      backgroundColor: combo.bgColor,
                                      borderColor: combo.textColor === "#ffffff" ? "#e5e7eb" : combo.textColor
                                    }}
                                  />
                                  <span className="truncate">{combo.name}</span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStampEnabled(false);
                                field.onChange({
                                  ...field.value,
                                  stamp: {
                                    text: stampText,
                                    enabled: false,
                                    bgColor: stampBgColor,
                                    textColor: stampTextColor
                                  }
                                });
                              }}
                              className="flex-1"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ) : (
                <div className={cn("text-center p-8 rounded-lg border-2 border-dashed border-slate-600", dark ? "bg-white/5" : "bg-slate-50")}>
                  <p className="text-sm text-slate-400">
                    Upload a cover photo to see your preview
                  </p>
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            @keyframes fadeInOut {
              0%, 100% { opacity: 0; }
              10%, 30% { opacity: 1; }
              40% { opacity: 0; }
            }
          `}</style>
          </>
        </FormItem>
      )}
    />
  );
};

export default ThumbnailBuilder;
