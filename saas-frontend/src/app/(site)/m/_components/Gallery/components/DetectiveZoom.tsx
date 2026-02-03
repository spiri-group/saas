import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, MoveRight, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
};

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
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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

  const lensStyle: React.CSSProperties = useMemo(() => ({
    width: lensSize,
    height: lensSize,
    borderRadius: "9999px",
    position: "absolute",
    pointerEvents: "none",
    transform: `translate(${cursor.x - lensSize / 2}px, ${cursor.y - lensSize / 2}px)`,
    backgroundImage: `url(${src})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: bgSize,
    backgroundPosition: bgPos,
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
    border: "2px solid rgba(255,255,255,0.9)",
    backdropFilter: "none",
  }), [cursor, lensSize, src, bgSize, bgPos]);

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
    
    const newEvidence: Evidence = {
      id: `evidence-${Date.now()}`,
      label: `Evidence ${evidence.length + 1}`,
      x: normalizedX,
      y: normalizedY,
      zoom,
      timestamp: Date.now()
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
      return {
        ...e,
        insetBg: {
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${displayWidth * currentZoom}px ${displayHeight * currentZoom}px`,
          // Center the evidence point in the inset viewer
          backgroundPosition: `${-(e.x * displayWidth * currentZoom - 150)}px ${-(e.y * displayHeight * currentZoom - 150)}px`,
        } as React.CSSProperties,
      };
    });
  }, [evidence, src, naturalSize, activeEvidence, evidenceZoom]);

  return (
    <Card className={"w-full max-w-full shadow-lg border-0 " + (className ?? "")}> 
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Inspector</CardTitle>
        <div className="flex items-center gap-3">
          <div className={cn(
            "hidden md:flex items-center gap-2 transition-opacity",
            activeEvidence ? "opacity-50" : "opacity-100"
          )}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">Lens Zoom</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={dec} aria-label="Zoom out lens"><ZoomOut className="w-4 h-4" /></Button>
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
                <Button variant="outline" size="icon" onClick={inc} aria-label="Zoom in lens"><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">{zoom.toFixed(2)}×</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6 items-start">
          {/* Image & overlay */}
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-2xl border bg-black/5 select-none"
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
              className="object-contain"
              onLoadingComplete={(el) => {
                // next/image passes the img element as HTMLElement
                const img = (el as unknown as HTMLImageElement);
                imgRef.current = img;
                handleImageLoad();
              }}
            />

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

            {/* Hover/tap magnifier lens */}
            {showLens && (
              <div aria-hidden className="pointer-events-none" style={lensStyle} />
            )}
          </div>

          {/* Side panel: Evidence Viewer */}
          <div className="hidden lg:block">
            <div>
              <div className="rounded-2xl border p-4 bg-card shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">Evidence Viewer</div>
                  {(activeEvidence || activeCallout) && (
                    <Badge variant="outline">
                      {activeEvidence 
                        ? evidence.find(e => e.id === activeEvidence)?.label
                        : activeCallout
                      }
                    </Badge>
                  )}
                </div>
                <div className="relative w-full rounded-xl overflow-hidden border bg-black/5 flex-1 min-h-[300px]">
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
                    <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground text-center px-4">
                      {clickCount < 3 ? (
                        "Click anywhere to capture evidence"
                      ) : (
                        <>Hold <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl</kbd> and click to capture evidence</>
                      )}
                    </div>
                  )}
                </div>
                <div className={cn(
                  "mt-4 p-2 rounded-md transition-colors",
                  activeEvidence ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs font-medium",
                      activeEvidence ? "text-primary" : "text-muted-foreground"
                    )}>
                      {activeEvidence ? "Active Evidence Zoom" : "Evidence Zoom"}
                    </span>
                    <Badge variant={activeEvidence ? "default" : "outline"} className="text-xs">
                      {evidenceZoom.toFixed(2)}×
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={decEvidence} 
                      disabled={!activeEvidence}
                      aria-label="Zoom out evidence"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Slider
                      value={[evidenceZoom]}
                      min={minZoom}
                      max={maxZoom}
                      step={0.05}
                      onValueChange={(v) => setEvidenceZoom(v[0]!)}
                      aria-label="Evidence Zoom"
                      disabled={!activeEvidence}
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={incEvidence} 
                      disabled={!activeEvidence}
                      aria-label="Zoom in evidence"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Evidence List */}
                {evidence.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Captured Evidence</h4>
                      <Badge variant="secondary" className="text-xs">{evidence.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {evidence.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                            activeEvidence === item.id 
                              ? "bg-primary/10 border-primary/20" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => setActiveEvidence(activeEvidence === item.id ? null : item.id)}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <Eye className="w-3 h-3 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{item.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.zoom.toFixed(1)}× zoom
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
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
                
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: {clickCount < 3 ? (
                    "Click anywhere to capture evidence."
                  ) : (
                    <>Hold <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl</kbd> and click to capture evidence.</>
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
