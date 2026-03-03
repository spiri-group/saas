import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, MoveRight, Eye, Trash2, Contrast, Thermometer, Moon, ScanLine, Sparkles, Grid3x3, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * DetectiveZoom
 * — A production-ready image zoom experience for "detective" style inspection.
 *
 * Features
 *  • Hover lens (desktop): circular magnifier that follows the cursor
 *  • Tap-to-toggle lens (mobile): tap image to toggle lens, drag to move
 *  • Adjustable zoom via Slider and +/- buttons
 *  • Optional callout boxes that show in-place zoomed insets on hover/click
 *  • Works with Next/Image for optimized loading
 *  • Handles any image aspect ratio
 *
 * Usage
 * <DetectiveZoom
 *   src={imageUrl}
 *   alt="Paranormal photo"
 *   width={1200}
 *   height={800}
 *   lensSize={220}
 *   defaultZoom={2.5}
 *   callouts={[
 *     { id: "orb", label: "Orb?", x: 0.63, y: 0.18, w: 0.12, h: 0.12 },
 *     { id: "shadow", label: "Shadow", x: 0.21, y: 0.56, w: 0.18, h: 0.18 },
 *   ]}
 * />
 */

export type Callout = {
  id: string;
  label?: string;
  /** normalized [0..1] coords */
  x: number; // left
  y: number; // top
  w: number; // width
  h: number; // height
};

export type Evidence = {
  id: string;
  label: string;
  /** normalized [0..1] coords of center point */
  x: number;
  y: number;
  /** zoom level when captured */
  zoom: number;
  /** timestamp when captured */
  timestamp: number;
  /** vision mode active when captured */
  mode: string;
  /** investigator notes */
  notes: string;
};

type VisionMode = {
  id: string;
  name: string;
  shortName: string;
  filter: string;
  borderColor: string;
  glowColor: string;
  key: string;
  icon: string;
};

const VISION_MODES: VisionMode[] = [
  { id: "normal", name: "Normal", shortName: "NRM", filter: "none", borderColor: "rgba(255,255,255,0.9)", glowColor: "rgba(255,255,255,0.3)", key: "1", icon: "Eye" },
  { id: "negative", name: "Negative", shortName: "NEG", filter: "invert(1)", borderColor: "rgba(200,220,255,0.9)", glowColor: "rgba(200,220,255,0.5)", key: "2", icon: "Contrast" },
  { id: "thermal", name: "Thermal", shortName: "THR", filter: "saturate(3) hue-rotate(180deg) contrast(1.2)", borderColor: "rgba(255,160,50,0.9)", glowColor: "rgba(255,160,50,0.5)", key: "3", icon: "Thermometer" },
  { id: "nightvision", name: "Night Vision", shortName: "NVS", filter: "brightness(1.8) contrast(1.2) saturate(0.3) sepia(1) hue-rotate(70deg)", borderColor: "rgba(50,255,100,0.9)", glowColor: "rgba(50,255,100,0.5)", key: "4", icon: "Moon" },
  { id: "edgedetect", name: "Edge Detect", shortName: "EDG", filter: "contrast(6) brightness(0.6) grayscale(1)", borderColor: "rgba(255,255,255,0.9)", glowColor: "rgba(255,255,255,0.4)", key: "5", icon: "ScanLine" },
  { id: "spiritspectrum", name: "Spirit Spectrum", shortName: "SPC", filter: "saturate(4) contrast(1.5)", borderColor: "rgba(180,100,255,0.9)", glowColor: "rgba(180,100,255,0.5)", key: "6", icon: "Sparkles" },
];

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye, Contrast, Thermometer, Moon, ScanLine, Sparkles,
};

/** Get the grid coordinate label (e.g. "D7") from normalized 0-1 position */
function getGridCoord(nx: number, ny: number): string {
  const col = Math.min(9, Math.floor(nx * 10));
  const row = Math.min(9, Math.floor(ny * 10));
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

interface DetectiveZoomProps {
  src: string;
  alt?: string;
  width: number; // intrinsic/expected display width (px)
  height: number; // intrinsic/expected display height (px)
  className?: string;
  /** lens diameter in px */
  lensSize?: number;
  /** initial zoom multiplier (1 = 100%) */
  defaultZoom?: number;
  /** min & max zoom */
  minZoom?: number;
  maxZoom?: number;
  callouts?: Callout[];
  /** dark mode styling for use inside dark dialogs */
  dark?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Persist user preferences across component remounts (image navigation)
let _persistedGrid = false;
let _persistedMode = "normal";

export default function DetectiveZoom({
  src,
  alt,
  width,
  height,
  className,
  lensSize = 220,
  defaultZoom = 2.5,
  minZoom = 1.25,
  maxZoom = 8,
  callouts = [],
  dark = false,
}: DetectiveZoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(defaultZoom);
  const [showLens, setShowLens] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: width, h: height });
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: width / 2, y: height / 2 });
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);
  const [evidenceZoom, setEvidenceZoom] = useState<number>(defaultZoom);
  const [activeMode, setActiveMode] = useState<string>(_persistedMode);
  const [showGrid, setShowGrid] = useState(_persistedGrid);
  const [hudTime, setHudTime] = useState(() => new Date());

  const currentMode = useMemo(
    () => VISION_MODES.find(m => m.id === activeMode) ?? VISION_MODES[0],
    [activeMode]
  );

  // Persist grid and mode preferences across image navigation
  useEffect(() => { _persistedGrid = showGrid; }, [showGrid]);
  useEffect(() => { _persistedMode = activeMode; }, [activeMode]);

  // Running clock for the found-footage HUD
  useEffect(() => {
    const interval = setInterval(() => setHudTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onTouch = () => setIsTouch(true);
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  // Sync evidence zoom when active evidence changes
  useEffect(() => {
    if (activeEvidence) {
      const activeEvidenceItem = evidence.find(e => e.id === activeEvidence);
      if (activeEvidenceItem) {
        setEvidenceZoom(activeEvidenceItem.zoom);
      }
    }
  }, [activeEvidence, evidence]);

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    if (naturalWidth && naturalHeight) {
      setNaturalSize({ w: naturalWidth, h: naturalHeight });
    }
  }, []);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ("touches" in e && e.touches.length) {
      clientX = e.touches[0]!.clientX;
      clientY = e.touches[0]!.clientY;
    } else if ("clientX" in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    setCursor({ x, y });
  }, []);

  const bgSize = useMemo(() => {
    if (!containerRef.current) return `${naturalSize.w * zoom}px ${naturalSize.h * zoom}px`;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate the actual display scaling
    // The image is displayed with object-contain, so we need to find the scaling factor
    const containerAspect = rect.width / rect.height;
    const imageAspect = naturalSize.w / naturalSize.h;
    
    let displayWidth, displayHeight;
    if (containerAspect > imageAspect) {
      // Container is wider than image - image is constrained by height
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      // Container is taller than image - image is constrained by width
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
    }
    
    return `${displayWidth * zoom}px ${displayHeight * zoom}px`;
  }, [zoom, naturalSize]);

  const bgPos = useMemo(() => {
    if (!containerRef.current) return "center";
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate the actual displayed image dimensions (accounting for object-contain)
    const containerAspect = rect.width / rect.height;
    const imageAspect = naturalSize.w / naturalSize.h;
    
    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;
    if (containerAspect > imageAspect) {
      // Container is wider than image - image is constrained by height
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
      offsetX = (rect.width - displayWidth) / 2; // Center horizontally
    } else {
      // Container is taller than image - image is constrained by width
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
      offsetY = (rect.height - displayHeight) / 2; // Center vertically
    }
    
    // Calculate cursor position relative to the actual image (not container)
    const imageX = cursor.x - offsetX;
    const imageY = cursor.y - offsetY;
    
    // Normalize to image coordinates (0-1)
    const normalizedX = Math.max(0, Math.min(1, imageX / displayWidth));
    const normalizedY = Math.max(0, Math.min(1, imageY / displayHeight));
    
    // Calculate background position to center the cursor point in the lens
    const scaledWidth = displayWidth * zoom;
    const scaledHeight = displayHeight * zoom;
    const px = normalizedX * scaledWidth - lensSize / 2;
    const py = normalizedY * scaledHeight - lensSize / 2;
    
    return `${-px}px ${-py}px`;
  }, [cursor, zoom, naturalSize, lensSize]);

  // Normalized cursor position relative to image (0-1) for grid coordinate
  const normalizedCursor = useMemo(() => {
    if (!containerRef.current) return { nx: 0.5, ny: 0.5 };
    const rect = containerRef.current.getBoundingClientRect();
    const containerAspect = rect.width / rect.height;
    const imageAspect = naturalSize.w / naturalSize.h;
    let displayWidth: number, displayHeight: number, offsetX = 0, offsetY = 0;
    if (containerAspect > imageAspect) {
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
      offsetX = (rect.width - displayWidth) / 2;
    } else {
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
      offsetY = (rect.height - displayHeight) / 2;
    }
    const nx = Math.max(0, Math.min(1, (cursor.x - offsetX) / displayWidth));
    const ny = Math.max(0, Math.min(1, (cursor.y - offsetY) / displayHeight));
    return { nx, ny };
  }, [cursor, naturalSize]);

  const gridCoord = useMemo(
    () => getGridCoord(normalizedCursor.nx, normalizedCursor.ny),
    [normalizedCursor]
  );

  const isNonNormal = activeMode !== "normal";

  const lensStyle: React.CSSProperties = useMemo(() => ({
    width: lensSize,
    height: lensSize,
    borderRadius: "9999px",
    pointerEvents: "none" as const,
    backgroundImage: `url(${src})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: bgSize,
    backgroundPosition: bgPos,
    filter: currentMode.filter,
    border: `2px solid ${currentMode.borderColor}`,
    // Static shadow when normal, let animation handle it when non-normal
    boxShadow: isNonNormal ? undefined : "0 6px 20px rgba(0,0,0,0.35)",
    backdropFilter: "none",
    // CSS variable for spectral-pulse animation
    "--pulse-color": currentMode.glowColor,
  } as React.CSSProperties), [lensSize, src, bgSize, bgPos, currentMode, isNonNormal]);

  // Removed pinch to zoom functionality

  const toggleLens = useCallback(() => setShowLens(v => !v), []);

  const captureEvidence = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate the actual displayed image dimensions (same as bgPos calculation)
    const containerAspect = rect.width / rect.height;
    const imageAspect = naturalSize.w / naturalSize.h;
    
    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;
    if (containerAspect > imageAspect) {
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
      offsetX = (rect.width - displayWidth) / 2;
    } else {
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
      offsetY = (rect.height - displayHeight) / 2;
    }
    
    // Calculate cursor position relative to the actual image
    const imageX = cursor.x - offsetX;
    const imageY = cursor.y - offsetY;
    
    // Normalize to image coordinates (0-1)
    const normalizedX = Math.max(0, Math.min(1, imageX / displayWidth));
    const normalizedY = Math.max(0, Math.min(1, imageY / displayHeight));
    
    const coord = getGridCoord(normalizedX, normalizedY);
    const newEvidence: Evidence = {
      id: `evidence-${Date.now()}`,
      label: `Evidence ${evidence.length + 1} [${coord}]`,
      x: normalizedX,
      y: normalizedY,
      zoom,
      timestamp: Date.now(),
      mode: activeMode,
      notes: "",
    };
    
    setEvidence(prev => [...prev, newEvidence]);
    setActiveEvidence(newEvidence.id);
    setClickCount(prev => prev + 1);
  }, [cursor, zoom, evidence.length, naturalSize]);

  const onClick = useCallback((e: React.MouseEvent) => {
    // For first 3 clicks, capture evidence without Ctrl requirement
    if (clickCount < 3) {
      e.preventDefault();
      captureEvidence();
    }
    // For 4th click and beyond, require Ctrl key
    else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      captureEvidence();
    } else if (isTouch) {
      toggleLens();
    } else {
      // Show notification that Ctrl is now required
      toast.info("Hold Ctrl and click to capture more evidence", {
        description: "You've captured 3 pieces of evidence. Now hold Ctrl while clicking to capture more."
      });
    }
  }, [isTouch, captureEvidence, toggleLens, clickCount]);

  const inc = () => setZoom(z => clamp(parseFloat((z + 0.25).toFixed(2)), minZoom, maxZoom));
  const dec = () => setZoom(z => clamp(parseFloat((z - 0.25).toFixed(2)), minZoom, maxZoom));

  const incEvidence = () => setEvidenceZoom(z => clamp(parseFloat((z + 0.25).toFixed(2)), minZoom, maxZoom));
  const decEvidence = () => setEvidenceZoom(z => clamp(parseFloat((z - 0.25).toFixed(2)), minZoom, maxZoom));

  useKeyboardShortcuts({
    shortcuts: [
      { key: '=', action: activeEvidence ? incEvidence : inc, description: 'Zoom in' },
      { key: '+', action: activeEvidence ? incEvidence : inc, description: 'Zoom in' },
      { key: '-', action: activeEvidence ? decEvidence : dec, description: 'Zoom out' },
      { key: 'e', action: captureEvidence, description: 'Capture evidence' },
      { key: 'g', action: () => setShowGrid(v => !v), description: 'Toggle grid overlay' },
      ...VISION_MODES.map(m => ({
        key: m.key,
        action: () => setActiveMode(m.id),
        description: `${m.name} mode`,
      })),
    ],
  });

  // .ecto file export/import
  const ectoInputRef = useRef<HTMLInputElement | null>(null);

  const exportEcto = useCallback(() => {
    if (evidence.length === 0) {
      toast.info("No evidence to export");
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      image: { src, alt, width, height },
      mode: activeMode,
      grid: showGrid,
      evidence,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investigation-${new Date().toISOString().slice(0, 10)}.ecto`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${evidence.length} evidence item${evidence.length === 1 ? "" : "s"}`);
  }, [evidence, src, alt, width, height, activeMode, showGrid]);

  const importEcto = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || !Array.isArray(data.evidence)) {
          toast.error("Invalid .ecto file");
          return;
        }
        // Warn if the file was saved from a different image
        if (data.image?.src && data.image.src !== src) {
          toast.warning("This investigation was from a different image — evidence pins may not align", {
            duration: 5000,
          });
        }
        setEvidence(data.evidence);
        setClickCount(data.evidence.length);
        if (data.mode) setActiveMode(data.mode);
        if (data.grid !== undefined) setShowGrid(data.grid);
        setActiveEvidence(null);
        toast.success(`Loaded ${data.evidence.length} evidence item${data.evidence.length === 1 ? "" : "s"}`);
      } catch {
        toast.error("Could not read .ecto file");
      }
    };
    reader.readAsText(file);
  }, [src]);

  // Build callout absolute rect styles
  const calloutRects = useMemo(() => callouts.map(c => ({
    ...c,
    style: {
      left: `${c.x * 100}%`,
      top: `${c.y * 100}%`,
      width: `${c.w * 100}%`,
      height: `${c.h * 100}%`,
    } as React.CSSProperties,
    insetBg: {
      backgroundImage: `url(${src})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${naturalSize.w * zoom}px ${naturalSize.h * zoom}px`,
      backgroundPosition: `${-(c.x * naturalSize.w * zoom)}px ${-(c.y * naturalSize.h * zoom)}px`,
    } as React.CSSProperties,
  })), [callouts, src, naturalSize, zoom]);

  // Calculate evidence inset backgrounds
  const evidenceInsets = useMemo(() => {
    if (!containerRef.current) return evidence.map(e => ({ ...e, insetBg: {} }));
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerAspect = rect.width / rect.height;
    const imageAspect = naturalSize.w / naturalSize.h;
    
    let displayWidth, displayHeight;
    if (containerAspect > imageAspect) {
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
    }
    
    return evidence.map(e => {
      // Use evidenceZoom for active evidence, otherwise use the original zoom
      const currentZoom = activeEvidence === e.id ? evidenceZoom : e.zoom;
      const evidenceMode = VISION_MODES.find(m => m.id === e.mode) ?? VISION_MODES[0];
      return {
        ...e,
        evidenceMode,
        insetBg: {
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${displayWidth * currentZoom}px ${displayHeight * currentZoom}px`,
          // Center the evidence point in the inset viewer
          backgroundPosition: `${-(e.x * displayWidth * currentZoom - 150)}px ${-(e.y * displayHeight * currentZoom - 150)}px`,
          filter: evidenceMode.filter,
        } as React.CSSProperties,
      };
    });
  }, [evidence, src, naturalSize, activeEvidence, evidenceZoom]);

  const muted = dark ? "text-white/50" : "text-muted-foreground";
  const cardBg = dark ? "bg-transparent" : "bg-card";
  const panelBg = dark ? "bg-white/5" : "bg-card";
  const panelBorder = dark ? "border-white/10" : "border";
  const surfaceBg = dark ? "bg-white/5" : "bg-black/5";
  const btnVariant = dark ? "ghost" as const : "outline" as const;
  const btnClass = dark ? "text-white hover:bg-white/10 border-white/20" : "";

  return (
    <Card className={cn("w-full max-w-full shadow-lg border-0 flex flex-col overflow-hidden", cardBg, className)}>
      <CardHeader className="flex flex-col gap-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className={cn("text-xl", dark && "text-white")}>Spectral Analysis</CardTitle>
          <div className="flex items-center gap-3">
            <div className={cn(
              "hidden md:flex items-center gap-2 transition-opacity",
              activeEvidence ? "opacity-50" : "opacity-100"
            )}>
              <div className="flex flex-col items-center gap-1">
                <span className={cn("text-xs", muted)}>Lens Zoom</span>
                <div className="flex items-center gap-2">
                  <Button variant={btnVariant} size="icon" className={btnClass} onClick={dec} aria-label="Zoom out lens"><ZoomOut className="w-4 h-4" /></Button>
                  <div className="w-40">
                    <Slider
                      value={[zoom]}
                      min={minZoom}
                      max={maxZoom}
                      step={0.05}
                      onValueChange={(v) => setZoom(v[0]!)}
                      aria-label="Lens Zoom"
                    />
                  </div>
                  <Button variant={btnVariant} size="icon" className={btnClass} onClick={inc} aria-label="Zoom in lens"><ZoomIn className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className={cn("text-xs", dark && "bg-white/10 text-white")}>{zoom.toFixed(2)}×</Badge>
          </div>
        </div>
        {/* Vision Mode Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {VISION_MODES.map(m => {
            const Icon = MODE_ICONS[m.icon];
            const isActive = activeMode === m.id;
            return (
              <Button
                key={m.id}
                variant={isActive ? "default" : btnVariant}
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1",
                  isActive
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : btnClass
                )}
                onClick={() => setActiveMode(m.id)}
                title={`${m.name} (${m.key})`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {m.shortName}
              </Button>
            );
          })}
          <div className={cn("w-px h-5 mx-1", dark ? "bg-white/20" : "bg-border")} />
          <Button
            variant={showGrid ? "default" : btnVariant}
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1",
              showGrid
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : btnClass
            )}
            onClick={() => setShowGrid(v => !v)}
            title="Grid overlay (G)"
          >
            <Grid3x3 className="w-3 h-3" />
            Grid
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6 items-stretch h-full">
          {/* Image & overlay */}
          <div
            ref={containerRef}
            className={cn("relative w-full overflow-hidden rounded-2xl select-none", panelBorder, surfaceBg)}
            style={{ aspectRatio: `${width} / ${height}` }}
            onMouseMove={onMove}
            onTouchMove={onMove}
            onMouseEnter={() => !isTouch && setShowLens(true)}
            onMouseLeave={() => !isTouch && setShowLens(false)}
            onClick={onClick}
          >
            {/* The actual Image */}
            {/* We use an <img> inside a Next/Image fill wrapper to get natural dims reliably */}
            <Image
              src={src}
              alt={alt ?? "Detective zoom image"}
              fill
              sizes="100vw"
              className="object-contain transition-[filter] duration-300"
              style={{ filter: currentMode.filter }}
              onLoadingComplete={(el) => {
                // next/image passes the img element as HTMLElement
                const img = (el as unknown as HTMLImageElement);
                imgRef.current = img;
                handleImageLoad();
              }}
            />

            {/* Grid overlay with coordinate labels */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Grid lines */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(168,85,247,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(168,85,247,0.2) 1px, transparent 1px)",
                    backgroundSize: "10% 10%",
                  }}
                />
                {/* Column labels (A-J) along the top */}
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={`col-${i}`}
                    className="absolute text-[10px] font-bold leading-none"
                    style={{
                      left: `${i * 10 + 5}%`,
                      top: 4,
                      transform: "translateX(-50%)",
                      color: "rgba(168,85,247,0.7)",
                      textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                {/* Row labels (1-10) along the left */}
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={`row-${i}`}
                    className="absolute text-[10px] font-bold leading-none"
                    style={{
                      top: `${i * 10 + 5}%`,
                      left: 4,
                      transform: "translateY(-50%)",
                      color: "rgba(168,85,247,0.7)",
                      textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Callout overlays */}
            {calloutRects.map(c => (
              <button
                key={c.id}
                type="button"
                className={"absolute border-2 rounded-md border-yellow-400/80 hover:border-yellow-300/100 focus:outline-none focus:ring-2 focus:ring-yellow-300/70 group " + (activeCallout === c.id ? "ring-2 ring-yellow-300" : "")}
                style={c.style}
                onClick={(e) => { e.stopPropagation(); setActiveCallout(v => v === c.id ? null : c.id); }}
                onMouseEnter={() => setActiveCallout(c.id)}
                onMouseLeave={() => setActiveCallout(prev => (prev === c.id ? null : prev))}
                aria-label={c.label ?? c.id}
              >
                <span className="absolute -top-6 left-0 bg-yellow-400 text-black text-xs font-semibold px-1.5 py-0.5 rounded shadow-sm">
                  {c.label ?? c.id}
                </span>
                <span className="absolute -bottom-5 right-0 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect <MoveRight className="w-3 h-3" />
                </span>
              </button>
            ))}

            {/* Evidence pins on image */}
            {evidence.map((ev, idx) => (
              <button
                key={ev.id}
                type="button"
                className={cn(
                  "absolute z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all -translate-x-1/2 -translate-y-1/2",
                  activeEvidence === ev.id
                    ? "bg-purple-500 text-white ring-2 ring-purple-300 scale-125"
                    : "bg-white/90 text-black hover:scale-110 border border-black/20"
                )}
                style={{ left: `${ev.x * 100}%`, top: `${ev.y * 100}%` }}
                onClick={(e) => { e.stopPropagation(); setActiveEvidence(activeEvidence === ev.id ? null : ev.id); }}
                title={ev.label}
              >
                {idx + 1}
              </button>
            ))}

            {/* Hover/tap magnifier lens */}
            {showLens && (
              <div aria-hidden className="pointer-events-none" style={{ position: "absolute", left: 0, top: 0, transform: `translate(${cursor.x - lensSize / 2}px, ${cursor.y - lensSize / 2}px)`, zIndex: 20 }}>
                <div
                  className={cn(isNonNormal && "animate-spectral-pulse")}
                  style={lensStyle}
                />
                {/* Grid coordinate + mode label below lens */}
                <div className="text-center mt-1 pointer-events-none flex items-center justify-center gap-2">
                  {showGrid && (
                    <span className="text-xs font-bold text-purple-400" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                      {gridCoord}
                    </span>
                  )}
                  {isNonNormal && (
                    <span
                      className="text-xs font-bold"
                      style={{ color: currentMode.borderColor, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                    >
                      {currentMode.shortName}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Found-footage camera HUD overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 spectral-scanlines">
              {/* Timestamp — top-right */}
              <div className="absolute top-3 right-3 text-[10px] font-mono text-white/60" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                {hudTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>

              {/* Mode readout — bottom-left */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: currentMode.borderColor, textShadow: "0 0 4px rgba(0,0,0,0.8)" }}>
                  {currentMode.name}
                </span>
              </div>

            </div>
          </div>

          {/* Side panel: Evidence Viewer */}
          <div className="hidden lg:block min-h-0 max-h-full overflow-hidden">
            <div className="h-full">
              <div className={cn("rounded-2xl p-4 shadow-sm h-full flex flex-col overflow-hidden", panelBorder, panelBg)}>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("font-medium", dark && "text-white")}>Evidence Viewer</div>
                  <div className="flex items-center gap-1.5">
                    {(activeEvidence || activeCallout) && (
                      <Badge variant="outline" className={cn("mr-1", dark && "border-white/20 text-white")}>
                        {activeEvidence
                          ? evidence.find(e => e.id === activeEvidence)?.label
                          : activeCallout
                        }
                      </Badge>
                    )}
                    <Button
                      variant={btnVariant}
                      size="sm"
                      className={cn("h-7 px-2 text-xs gap-1", btnClass)}
                      onClick={() => ectoInputRef.current?.click()}
                      title="Load .ecto investigation file"
                    >
                      <Upload className="w-3 h-3" />
                      Load
                    </Button>
                    <Button
                      variant={btnVariant}
                      size="sm"
                      className={cn("h-7 px-2 text-xs gap-1", btnClass)}
                      onClick={exportEcto}
                      disabled={evidence.length === 0}
                      title="Save investigation as .ecto file"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </Button>
                  </div>
                </div>
                <input
                  ref={ectoInputRef}
                  type="file"
                  accept=".ecto"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importEcto(file);
                    e.target.value = "";
                  }}
                />
                <div className={cn("relative w-full rounded-xl overflow-hidden flex-1 min-h-[300px]", panelBorder, surfaceBg)}>
                  {activeEvidence ? (
                    (() => {
                      const e = evidenceInsets.find(x => x.id === activeEvidence)!;
                      return (
                        <div className="absolute inset-0" style={{ ...e.insetBg }} />
                      );
                    })()
                  ) : activeCallout ? (
                    (() => {
                      const c = calloutRects.find(x => x.id === activeCallout)!;
                      return (
                        <div className="absolute inset-0" style={{ ...c.insetBg }} />
                      );
                    })()
                  ) : (
                    <div className={cn("absolute inset-0 grid place-items-center text-sm text-center px-4", muted)}>
                      {clickCount < 3 ? (
                        "Click anywhere to capture evidence"
                      ) : (
                        <>Hold <kbd className={cn("px-1 py-0.5 rounded", dark ? "bg-white/10" : "bg-muted")}>Ctrl</kbd> and click to capture evidence</>
                      )}
                    </div>
                  )}
                </div>
                {/* Evidence Notes */}
                {activeEvidence && (
                  <div className="mt-3">
                    <label className={cn("text-xs font-medium mb-1 block", dark ? "text-purple-300" : "text-primary")}>
                      Investigation Notes
                    </label>
                    <textarea
                      className={cn(
                        "w-full text-xs rounded-md p-2 resize-none focus:outline-none focus:ring-1",
                        dark
                          ? "bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:ring-purple-500/50"
                          : "bg-muted/30 border text-foreground placeholder:text-muted-foreground focus:ring-primary/50"
                      )}
                      rows={2}
                      placeholder="Describe what you see..."
                      value={evidence.find(e => e.id === activeEvidence)?.notes ?? ""}
                      onChange={(e) => {
                        setEvidence(prev => prev.map(ev =>
                          ev.id === activeEvidence ? { ...ev, notes: e.target.value } : ev
                        ));
                      }}
                    />
                  </div>
                )}

                {activeEvidence && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Button variant={btnVariant} size="sm" className={cn("h-6 w-6 p-0", btnClass)} onClick={decEvidence}><ZoomOut className="w-3 h-3" /></Button>
                    <Slider
                      value={[evidenceZoom]}
                      min={minZoom}
                      max={maxZoom}
                      step={0.05}
                      onValueChange={(v) => setEvidenceZoom(v[0]!)}
                      aria-label="Evidence Zoom"
                      className="flex-1"
                    />
                    <Button variant={btnVariant} size="sm" className={cn("h-6 w-6 p-0", btnClass)} onClick={incEvidence}><ZoomIn className="w-3 h-3" /></Button>
                    <span className={cn("text-[10px] tabular-nums w-10 text-right", dark ? "text-white/50" : "text-muted-foreground")}>{evidenceZoom.toFixed(1)}×</span>
                  </div>
                )}

                {/* Evidence List */}
                {evidence.length > 0 && (
                  <div className={cn("mt-4 pt-4 min-h-0 flex flex-col flex-1", dark ? "border-t border-white/10" : "border-t")}>
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <h4 className={cn("text-sm font-medium", dark && "text-white")}>Captured Evidence</h4>
                      <Badge variant="secondary" className={cn("text-xs", dark && "bg-white/10 text-white")}>{evidence.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: dark ? "rgba(255,255,255,0.2) transparent" : "rgba(0,0,0,0.2) transparent" }}>
                      {evidence.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                            dark
                              ? activeEvidence === item.id
                                ? "bg-purple-500/10 border border-purple-500/20"
                                : "border border-white/10 hover:bg-white/10"
                              : activeEvidence === item.id
                                ? "bg-primary/10 border border-primary/20"
                                : "border hover:bg-muted/50"
                          )}
                          onClick={() => setActiveEvidence(activeEvidence === item.id ? null : item.id)}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <Eye className={cn("w-3 h-3", muted)} />
                            <div className="min-w-0">
                              <p className={cn("text-xs font-medium truncate", dark && "text-white")}>{item.label}</p>
                              <div className={cn("flex items-center gap-1.5 text-xs", muted)}>
                                <span>{item.zoom.toFixed(1)}× zoom</span>
                                {item.mode && item.mode !== "normal" && (() => {
                                  const m = VISION_MODES.find(v => v.id === item.mode);
                                  return m ? (
                                    <span
                                      className="px-1 py-0.5 rounded text-[10px] font-bold leading-none"
                                      style={{ backgroundColor: m.glowColor, color: "#000" }}
                                    >
                                      {m.shortName}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                              {item.notes && (
                                <p className={cn("text-[10px] truncate max-w-[140px] italic", muted)}>{item.notes}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive", dark && "text-white/40 hover:text-red-400")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvidence(prev => prev.filter(e => e.id !== item.id));
                              setClickCount(prev => prev - 1);
                              if (activeEvidence === item.id) {
                                setActiveEvidence(null);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className={cn("text-xs mt-2", muted)}>
                  Tip: {clickCount < 3 ? (
                    "Click anywhere to capture evidence."
                  ) : (
                    <>Hold <kbd className={cn("px-1 py-0.5 rounded", dark ? "bg-white/10" : "bg-muted")}>Ctrl</kbd> and click to capture evidence.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/*
  Notes & Integration:
  - This component uses Next.js Image with fill layout. Ensure parent has a fixed aspectRatio.
  - You can programmatically generate callouts by running a detector and mapping its boxes to {x,y,w,h} in normalized coords.
  - For very large panoramas or deep zoom (100+ MP), consider swapping to a tile-based viewer like OpenSeadragon.
  - Accessibility: callout buttons are keyboard-focusable and labeled; lens is decorative.
*/

// Example wrapper (optional)
export function DetectiveZoomExample() {
  const src = "/images/paranormal-sample.jpg"; // replace with your uploaded image path
  return (
    <div className="p-4">
      <DetectiveZoom
        src={src}
        alt="Alleged paranormal photo"
        width={1200}
        height={800}
        lensSize={240}
        defaultZoom={3}
        callouts={[
          { id: "window", label: "Window figure", x: 0.68, y: 0.12, w: 0.15, h: 0.22 },
          { id: "stair", label: "Stair shadow", x: 0.28, y: 0.58, w: 0.2, h: 0.18 },
        ]}
      />
    </div>
  );
}
