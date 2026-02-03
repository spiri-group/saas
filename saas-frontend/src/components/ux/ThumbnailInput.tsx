import { ControllerRenderProps } from "react-hook-form";
import FileUploader from "./FileUploader";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { media_type } from "@/utils/spiriverse";
import { v4 as uuid } from "uuid";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { PaintBucket, ZoomIn, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import ColorPickerDropDown from "./ColorPickerDropDown";
import { Button } from "../ui/button";
import { convert_color, escape_key, isNullOrWhitespace } from "@/lib/functions";
import CurrencySpan from "./CurrencySpan";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import RichTextInput from "./RichTextInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Moon, Sun, Settings, Tag, Palette } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

export type ThumbnailType = "rectangle" | "square";
export type ThumbnailMode = "easy" | "advanced";
export type ThemeMode = "light" | "dark";
export type ThumbnailLayout = "portrait" | "landscape";

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

export const default_thumbnail = {
  image: {
    media: undefined,
    zoom: 1,
    objectFit: "cover" as const,
  },
  dynamicMode: undefined,
  title: {
    content: undefined,
    panel: {
      bgColor: "#ffffff",
      textColor: "#000000",
      bgOpacity: 0.8,
    },
    bgColor: "#ffffff",
  },
  moreInfo: {
    content: undefined,
  },
  stamp: {
    text: undefined,
    enabled: false,
    bgColor: "#dc2626",
    textColor: "#ffffff",
  },
  bgColor: "#ffffff",
  themeBase: "light",
  panelTone: "light",
} as ThumbnailSchema;

/**
 * NEW: shared fixed preview sizes so the image position never moves
 * while the rest of the UI reflows around it.
 */
const PREVIEW_SIZES = {
  rectangle: { width: 500, height: 300 },
  square: { width: 300, height: 300 },
} as const;

/** Utility */
const themeBg = (tone: ThemeMode) =>
  tone === "dark"
    ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
    : "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)";

/**
 * A slim vertical rail that always sits to the LEFT of the image.
 * Stays in the same spot in both portrait & landscape layouts.
 */
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
        <span className="text-xs text-slate-500">Zoom</span>
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

function Preview({
  mode,
  tone,
  vendorPrimaryColor,
  stamp,
  title,
  bgColor,
  image,
  dynamicMode,
  type,
  objectFit,
  withPrice,
  onChange,
  relativePath,
  layout,
}: {
  mode: ThumbnailMode;
  tone: ThemeMode;
  vendorPrimaryColor?: string;
  stamp: ThumbnailSchema["stamp"];
  title: ThumbnailSchema["title"];
  bgColor: string;
  image: ThumbnailSchema["image"];
  dynamicMode?: ThumbnailSchema["dynamicMode"];
  type: ThumbnailType;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  withPrice?: boolean;
  onChange: (next: ThumbnailSchema) => void;
  relativePath: string;
  layout?: ThumbnailLayout;
}) {
  const { width, height } = PREVIEW_SIZES[type];
  const containerBg =
    mode === "easy"
      ? themeBg(tone || "light")
      : bgColor;

  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-xl shadow-xl overflow-hidden flex flex-col group",
        layout === "landscape" ? "h-full" : ""
      )}
      style={{ width }}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          layout === "landscape" ? "flex-1" : ""
        )}
        style={{
          width,
          height: layout === "landscape" ? undefined : height,
          background: containerBg
        }}
      >
        {stamp?.enabled && stamp?.text && (
          <div
            className="absolute top-2 left-2 z-10 px-2 py-1 text-2xl font-bold rounded shadow-lg transition-opacity duration-200 group-hover:opacity-0"
            style={{ backgroundColor: stamp.bgColor, color: stamp.textColor }}
          >
            {stamp.text}
          </div>
        )}

        <FileUploader
          id={uuid()}
          objectFit={image.objectFit || objectFit || "cover"}
          className={cn(
            "h-full w-full transition-opacity duration-300",
            dynamicMode?.type === 'VIDEO' && dynamicMode?.video?.media ? "group-hover:opacity-0" : ""
          )}
          imageClassName={mode === "easy" ? "rounded-t-xl" : ""}
          connection={{ container: "public", relative_path: relativePath }}
          targetImage={{ height, width }}
          value={image?.media ? [image.media.url] : []}
          targetImageVariants={[]}
          onDropAsync={() => {
            onChange({
              ...default_thumbnail,
              image: { ...image, media: undefined },
              bgColor,
              title,
              stamp,
            });
          }}
          onUploadCompleteAsync={(files: media_type[]) => {
            onChange({
              ...default_thumbnail,
              image: { ...image, media: files[0] },
              bgColor,
              title,
              stamp,
            });
          }}
          // Keep the image anchored & centered as zoom changes
          style={{
            transform: `scale(${image.zoom})`,
            transformOrigin: "center",
            willChange: "transform",
          }}
        />

        {/* Video highlight preview */}
        {dynamicMode?.type === 'VIDEO' && dynamicMode?.video?.media && (
          <video
            src={dynamicMode.video.media.url}
            className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ objectFit: image.objectFit || objectFit || "cover" }}
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
      </div>

      {/* Title panel */}
      <div
        className={cn("p-2 px-4 h-20 w-full flex flex-col gap-1", "rounded-b-xl")}
        style={{
          border:
            mode === "easy"
              ? tone === "dark"
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(0,0,0,0.05)"
              : undefined,
          backgroundColor:
            mode === "easy"
              ? vendorPrimaryColor
                ? `rgba(${convert_color(vendorPrimaryColor, "hex", "rgb")
                    .split(" ")
                    .join(",")}, 0.15)`
                : tone === "dark"
                ? "rgba(15, 23, 42, 0.55)"
                : "rgba(255, 255, 255, 0.7)"
              : title && title.panel
                ? `rgba(${convert_color(title.panel.bgColor ?? "#ffffff", "hex", "rgb")
                    .split(" ")
                    .join(",")}, ${title.panel.bgOpacity})`
                : "rgba(255,255,255,0.8)",
          color: mode === "easy" ? (tone === "dark" ? "#ffffff" : "#000000") : title?.panel?.textColor ?? "#000000",
        }}
      >
        { title &&
        <HoverCard>
          <HoverCardTrigger className="text-sm font-bold truncate">
            {title?.content}
          </HoverCardTrigger>
          <HoverCardContent className="flex flex-col gap-2">
            <h2 className="text-md font-bold">{title?.content}</h2>
          </HoverCardContent>
        </HoverCard>
        }
        {withPrice && (
          <CurrencySpan
            className="text-md"
            value={{ amount: 0, currency: "AUD" }}
            withAnimation={false}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Layout notes
 * - We use a two-column grid in both orientations so the ZoomRail
 *   is ALWAYS rendered as the left-most column. The Preview sits to the right.
 * - Below (portrait) or to the right (landscape) of the preview we place the rest of the controls.
 */

type Props = ControllerRenderProps<ThumbnailSchema, any> & {
  relativePath: string;
  thumbnailType?: ThumbnailType;
  withPrice?: boolean;
  mode?: ThumbnailMode;
  onModeChange?: (mode: ThumbnailMode) => void;
  vendorPrimaryColor?: string;
  easyModeOnly?: boolean;
  layout?: ThumbnailLayout;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
};

const ThumbnailInput: React.FC<Props> = ({
  thumbnailType = "rectangle",
  mode = "easy",
  easyModeOnly = false,
  layout = "portrait",
  objectFit = "cover",
  ...props
}) => {
  const type = (thumbnailType || "rectangle").toLowerCase() as ThumbnailType;
  const { width } = PREVIEW_SIZES[type];

  const onZoomChange = (value: number) =>
    props.onChange({
      ...props.value,
      image: { ...props.value.image, zoom: value },
    });

  const RootTabs = (
    <Tabs value={mode} onValueChange={(v) => props.onModeChange?.(v as ThumbnailMode)} className="mb-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="easy" className="flex items-center gap-2">
          <Sun className="w-4 h-4" /> Easy
        </TabsTrigger>
        <TabsTrigger value="advanced" className="flex items-center gap-2">
          <Settings className="w-4 h-4" /> Advanced
        </TabsTrigger>
      </TabsList>

      {/* --- EASY --- */}
      <TabsContent value="easy" className="mt-4">
{layout === "landscape" ? (
          // Landscape: Zoom rail + Image on left, controls on right in column
          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `auto ${width}px 1fr` }}>
            <ZoomRail value={props.value.image.zoom} onChange={onZoomChange} />
            <Preview
              mode={mode}
              tone={props.value.panelTone || "light"}
              vendorPrimaryColor={props.vendorPrimaryColor}
              stamp={props.value.stamp}
              title={props.value.title}
              bgColor={props.value.bgColor}
              image={props.value.image}
              dynamicMode={props.value.dynamicMode}
              type={type}
              objectFit={objectFit}
              withPrice={props.withPrice}
              onChange={(next) => props.onChange({ ...props.value, ...next })}
              relativePath={props.relativePath}
              layout={layout}
            />
            {/* Panel tone controls in right column */}
            <div className="flex flex-col gap-4 min-w-[220px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Panel Tone</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={props.value.panelTone === "light" ? "default" : "outline"}
                    onClick={() => props.onChange({ ...props.value, panelTone: "light" })}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Sun className="w-4 h-4" /> Light
                  </Button>
                  <Button
                    type="button"
                    variant={props.value.panelTone === "dark" ? "default" : "outline"}
                    onClick={() => props.onChange({ ...props.value, panelTone: "dark" })}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </Button>
                </div>
              </div>

              {/* Video Highlight - Easy Mode */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="video-highlight-enabled-easy"
                    checked={props.value.dynamicMode?.type === 'VIDEO' || false}
                    onCheckedChange={(checked) =>
                      props.onChange({
                        ...props.value,
                        dynamicMode: checked ? {
                          type: 'VIDEO',
                          video: {
                            media: props.value.dynamicMode?.video?.media,
                            autoplay: true,
                            muted: true
                          }
                        } : undefined,
                      })
                    }
                  />
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-medium">Video on Hover (max 5s)</span>
                </div>
                {props.value.dynamicMode?.type === 'VIDEO' && (
                  <div className="flex flex-col gap-2">
                    <FileUploader
                      id={uuid()}
                      connection={{ container: "public", relative_path: props.relativePath }}
                      acceptOnly={{ type: "VIDEO" }}
                      value={props.value.dynamicMode?.video?.media ? [props.value.dynamicMode.video.media.url] : []}
                      onDropAsync={() => {
                        props.onChange({
                          ...props.value,
                          dynamicMode: {
                            type: 'VIDEO',
                            video: {
                              media: undefined,
                              autoplay: true,
                              muted: true
                            }
                          },
                        });
                      }}
                      onUploadCompleteAsync={(files: media_type[]) => {
                        const video = files[0];
                        if (video.durationSeconds && video.durationSeconds > 5) {
                          alert('Video must be 5 seconds or less');
                          return;
                        }
                        props.onChange({
                          ...props.value,
                          dynamicMode: {
                            type: 'VIDEO',
                            video: {
                              media: video,
                              autoplay: true,
                              muted: true
                            }
                          },
                        });
                      }}
                    />
                    {props.value.dynamicMode?.video?.media && (
                      <div className="relative rounded overflow-hidden border border-slate-300">
                        <video
                          src={props.value.dynamicMode.video.media.url}
                          className="w-full h-24 object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <Video className="w-6 h-6 text-white opacity-50" />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Hover over product to preview video. Max 5 seconds.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Portrait: Panel tone above, then zoom rail + image below
          <>
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-sm font-medium">Panel Tone</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={props.value.panelTone === "light" ? "default" : "outline"}
                  onClick={() => props.onChange({ ...props.value, panelTone: "light" })}
                  className="flex items-center gap-2 flex-1"
                >
                  <Sun className="w-4 h-4" /> Light Panel
                </Button>
                <Button
                  type="button"
                  variant={props.value.panelTone === "dark" ? "default" : "outline"}
                  onClick={() => props.onChange({ ...props.value, panelTone: "dark" })}
                  className="flex items-center gap-2 flex-1"
                >
                  <Moon className="w-4 h-4" /> Dark Panel
                </Button>
              </div>
            </div>

            {/* Two-column grid: Zoom rail (fixed left) + Preview */}
            <div
              className={cn(
                "grid gap-4 items-start",
                // keep the rail narrow, preview fixed width
                "grid-cols-[auto_1fr]",
              )}
              style={{ gridTemplateColumns: `auto ${width}px` }}
            >
              <ZoomRail value={props.value.image.zoom} onChange={onZoomChange} />
              <Preview
                mode={mode}
                tone={props.value.panelTone || "light"}
                vendorPrimaryColor={props.vendorPrimaryColor}
                stamp={props.value.stamp}
                title={props.value.title}
                bgColor={props.value.bgColor}
                image={props.value.image}
                type={type}
                objectFit={objectFit}
                withPrice={props.withPrice}
                onChange={(next) => props.onChange({ ...props.value, ...next })}
                relativePath={props.relativePath}
                layout={layout}
              />
            </div>
          </>
        )}
      </TabsContent>

      {/* --- ADVANCED --- */}
      <TabsContent value="advanced" className="mt-4">
        <div
          className="grid gap-4 items-stretch"
          style={{ gridTemplateColumns: `auto ${width}px 1fr` }}
        >
          <ZoomRail value={props.value.image.zoom} onChange={onZoomChange} />
          <Preview
            mode={mode}
            tone={props.value.panelTone || "light"}
            vendorPrimaryColor={props.vendorPrimaryColor}
            stamp={props.value.stamp}
            title={props.value.title}
            bgColor={props.value.bgColor}
            image={props.value.image}
            type={type}
            withPrice={props.withPrice}
            onChange={(next) => props.onChange({ ...props.value, ...next })}
            relativePath={props.relativePath}
            layout={layout}
          />

          {/* Right-side control stack */}
          <div className="flex flex-col gap-4 min-w-[220px]">
            {/* Panel Tone */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Panel Tone</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={props.value.panelTone === "light" ? "default" : "outline"}
                  onClick={() => props.onChange({ ...props.value, panelTone: "light" })}
                  className="flex items-center gap-2 flex-1"
                >
                  <Sun className="w-4 h-4" /> Light
                </Button>
                <Button
                  type="button"
                  variant={props.value.panelTone === "dark" ? "default" : "outline"}
                  onClick={() => props.onChange({ ...props.value, panelTone: "dark" })}
                  className="flex items-center gap-2 flex-1"
                >
                  <Moon className="w-4 h-4" /> Dark
                </Button>
              </div>
            </div>

            {/* Image Fit */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Image Fit</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={props.value.image.objectFit === "contain" ? "default" : "outline"}
                  onClick={() => props.onChange({
                    ...props.value,
                    image: { ...props.value.image, objectFit: "contain" }
                  })}
                  className="flex-1 text-xs"
                >
                  Contain
                </Button>
                <Button
                  type="button"
                  variant={props.value.image.objectFit === "cover" ? "default" : "outline"}
                  onClick={() => props.onChange({
                    ...props.value,
                    image: { ...props.value.image, objectFit: "cover" }
                  })}
                  className="flex-1 text-xs"
                >
                  Cover
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Contain: Show full image. Cover: Fill container.
              </p>
            </div>

            {/* Video Highlight */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="video-highlight-enabled"
                  checked={props.value.dynamicMode?.type === 'VIDEO' || false}
                  onCheckedChange={(checked) =>
                    props.onChange({
                      ...props.value,
                      dynamicMode: checked ? {
                        type: 'VIDEO',
                        video: {
                          media: props.value.dynamicMode?.video?.media,
                          autoplay: true,
                          muted: true
                        }
                      } : undefined,
                    })
                  }
                />
                <Video className="w-4 h-4" />
                <span className="text-sm font-medium">Video Highlight (max 5s)</span>
              </div>
              {props.value.dynamicMode?.type === 'VIDEO' && (
                <div className="flex flex-col gap-2">
                  <FileUploader
                    id={uuid()}
                    connection={{ container: "public", relative_path: props.relativePath }}
                    acceptOnly={{ type: "VIDEO" }}
                    value={props.value.dynamicMode?.video?.media ? [props.value.dynamicMode.video.media.url] : []}
                    onDropAsync={() => {
                      props.onChange({
                        ...props.value,
                        dynamicMode: {
                          type: 'VIDEO',
                          video: {
                            media: undefined,
                            autoplay: true,
                            muted: true
                          }
                        },
                      });
                    }}
                    onUploadCompleteAsync={(files: media_type[]) => {
                      const video = files[0];
                      if (video.durationSeconds && video.durationSeconds > 5) {
                        alert('Video must be 5 seconds or less');
                        return;
                      }
                      props.onChange({
                        ...props.value,
                        dynamicMode: {
                          type: 'VIDEO',
                          video: {
                            media: video,
                            autoplay: true,
                            muted: true
                          }
                        },
                      });
                    }}
                  />
                  {props.value.dynamicMode?.video?.media && (
                    <div className="relative rounded overflow-hidden border border-slate-700">
                      <video
                        src={props.value.dynamicMode.video.media.url}
                        className="w-full h-32 object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <Video className="w-8 h-8 text-white opacity-50" />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Hover over catalogue items to play video. Max 5 seconds.
                  </p>
                </div>
              )}
            </div>

            {/* Background */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <PaintBucket className="w-4 h-4" />
                <span className="text-sm font-medium">Background</span>
              </div>
              <ColorPickerDropDown
                placeholder="BG"
                className="h-10 w-full"
                value={props.value.bgColor}
                onChange={(color) => props.onChange({ ...props.value, bgColor: color })}
              />
            </div>

            {/* Title Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Title</label>
              <div className="flex flex-row space-x-2 items-center">
                <Input
                  type="text"
                  value={props.value.title.content}
                  onChange={(e) => {
                    props.onChange({
                      ...props.value,
                      title: { ...props.value.title, content: e.target.value },
                    });
                  }}
                  placeholder="Title"
                />
                <ColorPickerDropDown
                  placeholder="BG Colour"
                  className="h-10 aspect-square"
                  value={props.value.title.panel.bgColor}
                  onChange={(color) =>
                    props.onChange({
                      ...props.value,
                      title: {
                        ...props.value.title,
                        panel: { ...props.value.title.panel, bgColor: color },
                      },
                    })
                  }
                />
                <ColorPickerDropDown
                  placeholder="Text Colour"
                  className="h-10 aspect-square"
                  value={props.value.title.panel.textColor}
                  onChange={(color) =>
                    props.onChange({
                      ...props.value,
                      title: {
                        ...props.value.title,
                        panel: { ...props.value.title.panel, textColor: color },
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Stamp Controls */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Stamp</label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="stamp-enabled-advanced"
                  checked={props.value.stamp?.enabled || false}
                  onCheckedChange={(checked) =>
                    props.onChange({
                      ...props.value,
                      stamp: {
                        text: props.value.stamp?.text || "NEW",
                        enabled: !!checked,
                        bgColor: props.value.stamp?.bgColor || "#dc2626",
                        textColor: props.value.stamp?.textColor || "#ffffff",
                      },
                    })
                  }
                />
                <Tag className="w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Stamp text (e.g. NEW, SALE, LIMITED)"
                  value={props.value.stamp?.text || ""}
                  disabled={!props.value.stamp?.enabled}
                  className="flex-1"
                  maxLength={18}
                  onChange={(e) =>
                    props.onChange({
                      ...props.value,
                      stamp: { ...props.value.stamp, text: e.target.value },
                    })
                  }
                />
                {props.value.stamp?.enabled && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{
                            backgroundColor: props.value.stamp?.bgColor || "#dc2626",
                            borderColor: props.value.stamp?.textColor || "#ffffff",
                          }}
                        />
                        <Palette className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="grid grid-cols-2 gap-2">
                        <p className="col-span-2 text-sm font-medium mb-2">Choose stamp colors:</p>
                        {STAMP_COLOR_COMBINATIONS.map((combo) => (
                          <Button
                            key={combo.name}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center justify-start gap-2 h-8"
                            onClick={() =>
                              props.onChange({
                                ...props.value,
                                stamp: { ...props.value.stamp, bgColor: combo.bgColor, textColor: combo.textColor },
                              })
                            }
                          >
                            <div
                              className="w-3 h-3 rounded border flex-shrink-0"
                              style={{
                                backgroundColor: combo.bgColor,
                                borderColor: combo.textColor === "#ffffff" ? "#e5e7eb" : combo.textColor,
                              }}
                            />
                            <span className="text-xs truncate">{combo.name}</span>
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Hover Description */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Hover Description</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full", isNullOrWhitespace(props.value.moreInfo?.content) ? "text-slate-500" : "text-xs")}
                  >
                    {!isNullOrWhitespace(props.value.moreInfo?.content) ? "Edit" : "Add"} Description
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="flex flex-col gap-4 w-[400px]">
                  <p className="text-slate-400">This is used as a preview in the search results.</p>
                  <RichTextInput
                    maxChars={160}
                    className="w-full h-[185px]"
                    value={props.value.moreInfo?.content}
                    onChange={(value) =>
                      props.onChange({
                        ...props.value,
                        moreInfo: { ...props.value.moreInfo, content: value },
                      })
                    }
                    placeholder="More information"
                  />
                  <div className="flex flex-row w-full">
                    <Button type="button" className="w-full" variant="default" onClick={escape_key}>
                      Close
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="flex flex-col">

      {/*
        Portrait vs Landscape now only affects where the FORM controls go,
        not the preview/zoom positions (which remain fixed).
      */}
      {!easyModeOnly ? (
        RootTabs
      ) : (
        <div className="mb-4">
          {layout === "landscape" ? (
            // Landscape: Zoom rail + Image on left, controls on right in column  
            <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: `auto ${width}px 1fr` }}>
              <ZoomRail value={props.value.image.zoom} onChange={onZoomChange} />
              <Preview
                mode={mode}
                tone={props.value.panelTone || "light"}
                vendorPrimaryColor={props.vendorPrimaryColor}
                stamp={props.value.stamp}
                title={props.value.title}
                bgColor={props.value.bgColor}
                image={props.value.image}
                dynamicMode={props.value.dynamicMode}
                type={type}
                objectFit={objectFit}
                withPrice={props.withPrice}
                onChange={(next) => props.onChange({ ...props.value, ...next })}
                relativePath={props.relativePath}
                layout={layout}
              />
              {/* Panel tone controls in right column */}
              <div className="flex flex-col gap-4 min-w-[220px]">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Panel Tone</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={props.value.panelTone === "light" ? "default" : "outline"}
                      onClick={() => props.onChange({ ...props.value, panelTone: "light" })}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Sun className="w-4 h-4" /> Light
                    </Button>
                    <Button
                      type="button"
                      variant={props.value.panelTone === "dark" ? "default" : "outline"}
                      onClick={() => props.onChange({ ...props.value, panelTone: "dark" })}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Moon className="w-4 h-4" /> Dark
                    </Button>
                  </div>
                </div>

                {/* Video Highlight - Easy Mode Only */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="video-highlight-enabled-easy-only"
                      checked={props.value.dynamicMode?.type === 'VIDEO' || false}
                      onCheckedChange={(checked) =>
                        props.onChange({
                          ...props.value,
                          dynamicMode: checked ? {
                            type: 'VIDEO',
                            video: {
                              media: props.value.dynamicMode?.video?.media,
                              autoplay: true,
                              muted: true
                            }
                          } : undefined,
                        })
                      }
                    />
                    <Video className="w-4 h-4" />
                    <span className="text-sm font-medium">Video on Hover (max 5s)</span>
                  </div>
                  {props.value.dynamicMode?.type === 'VIDEO' && (
                    <div className="flex flex-col gap-2">
                      <FileUploader
                        id={uuid()}
                        connection={{ container: "public", relative_path: props.relativePath }}
                        acceptOnly={{ type: "VIDEO" }}
                        value={props.value.dynamicMode?.video?.media ? [props.value.dynamicMode.video.media.url] : []}
                        onDropAsync={() => {
                          props.onChange({
                            ...props.value,
                            dynamicMode: {
                              type: 'VIDEO',
                              video: {
                                media: undefined,
                                autoplay: true,
                                muted: true
                              }
                            },
                          });
                        }}
                        onUploadCompleteAsync={(files: media_type[]) => {
                          const video = files[0];
                          if (video.durationSeconds && video.durationSeconds > 5) {
                            alert('Video must be 5 seconds or less');
                            return;
                          }
                          props.onChange({
                            ...props.value,
                            dynamicMode: {
                              type: 'VIDEO',
                              video: {
                                media: video,
                                autoplay: true,
                                muted: true
                              }
                            },
                          });
                        }}
                      />
                      {props.value.dynamicMode?.video?.media && (
                        <div className="relative rounded overflow-hidden border border-slate-300">
                          <video
                            src={props.value.dynamicMode.video.media.url}
                            className="w-full h-24 object-cover"
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <Video className="w-6 h-6 text-white opacity-50" />
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Hover over product to preview video. Max 5 seconds.
                      </p>
                    </div>
                  )}
                </div>

                {/* Title Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <div className="flex flex-row space-x-2 items-center">
                    <Input
                      type="text"
                      value={props.value.title.content}
                      onChange={(e) => {
                        props.onChange({
                          ...props.value,
                          title: { ...props.value.title, content: e.target.value },
                        });
                      }}
                      placeholder="Title"
                    />
                    {mode === "advanced" && (
                      <>
                        <ColorPickerDropDown
                          placeholder="BG Colour"
                          className="h-10 aspect-square"
                          value={props.value.title.panel.bgColor}
                          onChange={(color) =>
                            props.onChange({
                              ...props.value,
                              title: {
                                ...props.value.title,
                                panel: { ...props.value.title.panel, bgColor: color },
                              },
                            })
                          }
                        />
                        <ColorPickerDropDown
                          placeholder="Text Colour"
                          className="h-10 aspect-square"
                          value={props.value.title.panel.textColor}
                          onChange={(color) =>
                            props.onChange({
                              ...props.value,
                              title: {
                                ...props.value.title,
                                panel: { ...props.value.title.panel, textColor: color },
                              },
                            })
                          }
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Stamp Controls */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Stamp</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="stamp-enabled"
                      checked={props.value.stamp?.enabled || false}
                      onCheckedChange={(checked) =>
                        props.onChange({
                          ...props.value,
                          stamp: {
                            text: props.value.stamp?.text || "NEW",
                            enabled: !!checked,
                            bgColor: props.value.stamp?.bgColor || "#dc2626",
                            textColor: props.value.stamp?.textColor || "#ffffff",
                          },
                        })
                      }
                    />
                    <Tag className="w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Stamp text (e.g. NEW, SALE, LIMITED)"
                      value={props.value.stamp?.text || ""}
                      disabled={!props.value.stamp?.enabled}
                      className="flex-1"
                      maxLength={18}
                      onChange={(e) =>
                        props.onChange({
                          ...props.value,
                          stamp: { ...props.value.stamp, text: e.target.value },
                        })
                      }
                    />
                    {props.value.stamp?.enabled && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="flex items-center gap-1">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{
                                backgroundColor: props.value.stamp?.bgColor || "#dc2626",
                                borderColor: props.value.stamp?.textColor || "#ffffff",
                              }}
                            />
                            <Palette className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="grid grid-cols-2 gap-2">
                            <p className="col-span-2 text-sm font-medium mb-2">Choose stamp colors:</p>
                            {STAMP_COLOR_COMBINATIONS.map((combo) => (
                              <Button
                                key={combo.name}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex items-center justify-start gap-2 h-8"
                                onClick={() =>
                                  props.onChange({
                                    ...props.value,
                                    stamp: { ...props.value.stamp, bgColor: combo.bgColor, textColor: combo.textColor },
                                  })
                                }
                              >
                                <div
                                  className="w-3 h-3 rounded border flex-shrink-0"
                                  style={{
                                    backgroundColor: combo.bgColor,
                                    borderColor: combo.textColor === "#ffffff" ? "#e5e7eb" : combo.textColor,
                                  }}
                                />
                                <span className="text-xs truncate">{combo.name}</span>
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Hover Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Hover Description</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full", isNullOrWhitespace(props.value.moreInfo?.content) ? "text-slate-500" : "text-xs")}
                      >
                        {!isNullOrWhitespace(props.value.moreInfo?.content) ? "Edit" : "Add"} Description
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="flex flex-col gap-4 w-[400px]">
                      <p className="text-slate-400">This is used as a preview in the search results.</p>
                      <RichTextInput
                        maxChars={160}
                        className="w-full h-[185px]"
                        value={props.value.moreInfo?.content}
                        onChange={(value) =>
                          props.onChange({
                            ...props.value,
                            moreInfo: { ...props.value.moreInfo, content: value },
                          })
                        }
                        placeholder="More information"
                      />
                      <div className="flex flex-row w-full">
                        <Button type="button" className="w-full" variant="default" onClick={escape_key}>
                          Close
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          ) : (
            // Portrait: Panel tone above, then zoom rail + image below
            <>
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-sm font-medium">Panel Tone</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={props.value.panelTone === "light" ? "default" : "outline"}
                    onClick={() => props.onChange({ ...props.value, panelTone: "light" })}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Sun className="w-4 h-4" /> Light Panel
                  </Button>
                  <Button
                    type="button"
                    variant={props.value.panelTone === "dark" ? "default" : "outline"}
                    onClick={() => props.onChange({ ...props.value, panelTone: "dark" })}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Moon className="w-4 h-4" /> Dark Panel
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `auto ${width}px` }}>
                <ZoomRail value={props.value.image.zoom} onChange={onZoomChange} />
                <Preview
                  mode={mode}
                  tone={props.value.panelTone || "light"}
                  vendorPrimaryColor={props.vendorPrimaryColor}
                  stamp={props.value.stamp}
                  title={props.value.title}
                  bgColor={props.value.bgColor}
                  image={props.value.image}
                  type={type}
                  withPrice={props.withPrice}
                  onChange={(next) => props.onChange({ ...props.value, ...next })}
                  relativePath={props.relativePath}
                  layout={layout}
                />
              </div>
            </>
          )}
        </div>
      )}

{layout === "portrait" && (
        <>
          {/* FORM: Title + Stamp */}
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex flex-row space-x-2 items-center">
              <Input
                type="text"
                value={props.value.title.content}
                onChange={(e) => {
                  props.onChange({
                    ...props.value,
                    title: { ...props.value.title, content: e.target.value },
                  });
                }}
                placeholder="Title"
              />

              {mode === "advanced" && (
                <>
                  <ColorPickerDropDown
                    placeholder="BG Colour"
                    className="h-10 aspect-square"
                    value={props.value.title.panel.bgColor}
                    onChange={(color) =>
                      props.onChange({
                        ...props.value,
                        title: {
                          ...props.value.title,
                          panel: { ...props.value.title.panel, bgColor: color },
                        },
                      })
                    }
                  />
                  <ColorPickerDropDown
                    placeholder="Text Colour"
                    className="h-10 aspect-square"
                    value={props.value.title.panel.textColor}
                    onChange={(color) =>
                      props.onChange({
                        ...props.value,
                        title: {
                          ...props.value.title,
                          panel: { ...props.value.title.panel, textColor: color },
                        },
                      })
                    }
                  />
                </>
              )}
            </div>

            {/* Stamp controls */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="stamp-enabled"
                checked={props.value.stamp?.enabled || false}
                onCheckedChange={(checked) =>
                  props.onChange({
                    ...props.value,
                    stamp: {
                      text: props.value.stamp?.text || "NEW",
                      enabled: !!checked,
                      bgColor: props.value.stamp?.bgColor || "#dc2626",
                      textColor: props.value.stamp?.textColor || "#ffffff",
                    },
                  })
                }
              />
              <Tag className="w-4 h-4" />
              <Input
                type="text"
                placeholder="Stamp text (e.g. NEW, SALE, LIMITED)"
                value={props.value.stamp?.text || ""}
                disabled={!props.value.stamp?.enabled}
                className="flex-1"
                maxLength={18}
                onChange={(e) =>
                  props.onChange({
                    ...props.value,
                    stamp: { ...props.value.stamp, text: e.target.value },
                  })
                }
              />

              {props.value.stamp?.enabled && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{
                          backgroundColor: props.value.stamp?.bgColor || "#dc2626",
                          borderColor: props.value.stamp?.textColor || "#ffffff",
                        }}
                      />
                      <Palette className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-2 gap-2">
                      <p className="col-span-2 text-sm font-medium mb-2">Choose stamp colors:</p>
                      {STAMP_COLOR_COMBINATIONS.map((combo) => (
                        <Button
                          key={combo.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center justify-start gap-2 h-8"
                          onClick={() =>
                            props.onChange({
                              ...props.value,
                              stamp: { ...props.value.stamp, bgColor: combo.bgColor, textColor: combo.textColor },
                            })
                          }
                        >
                          <div
                            className="w-3 h-3 rounded border flex-shrink-0"
                            style={{
                              backgroundColor: combo.bgColor,
                              borderColor: combo.textColor === "#ffffff" ? "#e5e7eb" : combo.textColor,
                            }}
                          />
                          <span className="text-xs truncate">{combo.name}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Hover Description */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("mt-2 w-full", isNullOrWhitespace(props.value.moreInfo?.content) ? "text-slate-500" : "text-xs")}
              >
                {!isNullOrWhitespace(props.value.moreInfo?.content) ? "Edit" : ""} Hover Description
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-4 w-[400px]">
              <p className="text-slate-400">This is used as a preview in the search results.</p>
              <RichTextInput
                maxChars={160}
                className="w-full h-[185px]"
                value={props.value.moreInfo?.content}
                onChange={(value) =>
                  props.onChange({
                    ...props.value,
                    moreInfo: { ...props.value.moreInfo, content: value },
                  })
                }
                placeholder="More information"
              />
              <div className="flex flex-row w-full">
                <Button type="button" className="w-full" variant="default" onClick={escape_key}>
                  Close
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
};

export default ThumbnailInput;
