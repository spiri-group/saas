// VideoFrameSelector.tsx
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload } from 'lucide-react';
import FileUploader from '@/components/ux/FileUploader';

type VideoFrameSelectorProps = {
  videoUrl: string;
  merchantId: string;
  videoId: string;
  onFrameSelect?: (frameDataUrl: string) => void; // optional fallback
  onCustomUpload: (file: any) => void;
  currentCover?: string;
  /** How many thumbnails to sample from the video (default 6) */
  frameCount?: number;
  /** Output width for generated thumbnails (default 288px). Final height will be 9:16 portrait = width * 16/9 */
  targetWidth?: number;
  /** When true, exported frames are center-cropped to real 9:16 (not just styled) */
  enforcePortrait916?: boolean;
};

const PORTRAIT_9_16 = 9 / 16;

const VideoFrameSelector: React.FC<VideoFrameSelectorProps> = ({
  videoUrl,
  merchantId,
  videoId,
  onFrameSelect,
  onCustomUpload,
  currentCover,
  frameCount = 6,
  targetWidth = 288,
  enforcePortrait916 = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(currentCover ?? null);
  const [showUploader, setShowUploader] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---------- helpers ----------

  const waitForEvent = (el: HTMLMediaElement, timeoutMs = 10000) =>
    new Promise<void>((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const err = () => { cleanup(); reject(new Error('video error')); };
      const to = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, timeoutMs);
      const cleanup = () => {
        el.removeEventListener('loadedmetadata', ok);
        el.removeEventListener('error', err);
        clearTimeout(to);
      };
      el.addEventListener('loadedmetadata', ok, { once: true });
      el.addEventListener('error', err, { once: true });
      if (el.readyState >= 1) ok();
    });

  const blobToDataURL = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });

  const drawScaled = (
    v: HTMLVideoElement,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    width: number
  ) => {
    const scale = width / v.videoWidth;
    canvas.width = width;
    canvas.height = Math.round(v.videoHeight * scale);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
  };

  const drawCropped916 = (
    v: HTMLVideoElement,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    width: number
  ) => {
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const vidAspect = vw / vh;

    canvas.width = width;
    canvas.height = Math.round(width / PORTRAIT_9_16); // width * 16 / 9

    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (vidAspect > PORTRAIT_9_16) {
      // too wide → crop sides
      sw = Math.round(vh * PORTRAIT_9_16);
      sx = Math.round((vw - sw) / 2);
    } else if (vidAspect < PORTRAIT_9_16) {
      // too tall → crop top/bottom
      sh = Math.round(vw / PORTRAIT_9_16);
      sy = Math.round((vh - sh) / 2);
    }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  };

  // Sample times: first anchor ~12% into clip (great for short videos), then evenly spaced avoiding edges.
  const makeSampleTimes = (duration: number, count: number) => {
    if (!duration || !isFinite(duration)) return [];
    const c = Math.max(1, count);

    const firstAnchor = Math.min(0.9, Math.max(0.3, 0.12 * duration)); // ~0.84s for 7s
    const edge = Math.max(0.5, Math.min(1.0, duration * 0.05));        // avoid exact edges
    const start = Math.max(edge, firstAnchor + 0.2);
    const end = Math.max(duration - edge, start + 0.25);
    const span = Math.max(end - start, 0.5);

    const times: number[] = [Math.min(Math.max(0, firstAnchor), Math.max(0, duration - 0.001))];
    const remaining = c - 1;
    for (let i = 0; i < remaining; i++) {
      const t = start + (span * (i + 1)) / (remaining + 1);
      times.push(Math.min(Math.max(0, t), Math.max(0, duration - 0.001)));
    }

    // Ensure minimal separation to reduce keyframe collisions
    const MIN_GAP = Math.min(0.75, duration / (c * 1.5));
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] < MIN_GAP) {
        times[i] = Math.min(times[i - 1] + MIN_GAP, duration - 0.001);
      }
    }
    return times;
  };

  // 12x12 average hash for better sensitivity + Hamming distance for near-duplicate detection
  const hashCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const hashCtx = hashCanvas ? hashCanvas.getContext('2d') : null;
  const perceptualHash = (srcCanvas: HTMLCanvasElement): bigint[] => {
    const W = 12, H = 12; // increased resolution for better sensitivity
    hashCanvas!.width = W;
    hashCanvas!.height = H;
    hashCtx!.drawImage(srcCanvas, 0, 0, W, H);
    const { data } = hashCtx!.getImageData(0, 0, W, H);
    let sum = 0;
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const y = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      gray.push(y); sum += y;
    }
    const avg = sum / gray.length;
    
    // Split into two 64-bit chunks (144 pixels = 2x 64-bit + 16 bits)
    const chunks: bigint[] = [];
    let bits = BigInt(0);
    let count = 0;
    for (let i = 0; i < gray.length; i++) {
      bits = (bits << BigInt(1)) | (gray[i] > avg ? BigInt(1) : BigInt(0));
      count++;
      if (count === 64) {
        chunks.push(bits);
        bits = BigInt(0);
        count = 0;
      }
    }
    if (count > 0) chunks.push(bits);
    return chunks;
  };
  
  const hamming = (a: bigint, b: bigint) => {
    let x = a ^ b, d = 0;
    while (x) { x &= (x - BigInt(1)); d++; }
    return d;
  };
  
  const hashDistance = (hashA: bigint[], hashB: bigint[]): number => {
    let total = 0;
    for (let i = 0; i < Math.min(hashA.length, hashB.length); i++) {
      total += hamming(hashA[i], hashB[i]);
    }
    return total;
  };

  // ---------- extraction ----------

  useEffect(() => {
    let aborted = false;

    const extract = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      // ensure CORS-safe canvas capture
      video.crossOrigin = 'anonymous';

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      try {
        await waitForEvent(video, 10000);
      } catch {
        if (!aborted) setLoading(false);
        return;
      }

      const { duration, videoWidth, videoHeight } = video;
      if (!duration || !isFinite(duration) || !videoWidth || !videoHeight) {
        if (!aborted) setLoading(false);
        return;
      }

      const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

      const waitDecoded = async () => {
        if (hasRVFC) {
          await new Promise<void>((resolve) => {
            video.requestVideoFrameCallback?.(() => resolve());
            setTimeout(resolve, 500);
          });
        } else {
          await new Promise((r) => setTimeout(r, 300));
        }
      };

      const seekSoft = (t: number, timeout = 4000) =>
        new Promise<void>((resolve) => {
          const onSeeked = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); resolve(); };
          const to = setTimeout(() => { cleanup(); resolve(); }, timeout);
          const cleanup = () => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            clearTimeout(to);
          };
          try { video.currentTime = Math.min(Math.max(0, t), duration - 0.001); } catch {}
          video.addEventListener('seeked', onSeeked, { once: true });
          video.addEventListener('error', onError, { once: true });
        });

      const drawAndEncode = async () => {
        if (enforcePortrait916) {
          drawCropped916(video, ctx, canvas, targetWidth);
        } else {
          drawScaled(video, ctx, canvas, targetWidth);
        }
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.75));
        const dataUrl = await blobToDataURL(blob);
        const hash = perceptualHash(canvas);
        return { dataUrl, hash };
      };

      // ---- main extraction ----
      const baseTimes = makeSampleTimes(duration, frameCount);
      const oversampleTimes = makeSampleTimes(duration, frameCount * 3);
      const queue = [...new Set([...baseTimes, ...oversampleTimes])].sort((a, b) => a - b);

      const out: string[] = [];
      const hashes: bigint[][] = [];
      const MAX_NEAR_DUP_DIST = 8; // 0..144; <=8 considered near-duplicate with 12x12 hash
      const NUDGE_STEP = 0.067;    // ~2 frames @ 30fps (larger nudge)
      const MAX_NUDGES = 10;

      const tryAtTime = async (t: number) => {
        await seekSoft(t);
        await waitDecoded();

        let attempts = 0;
        const attemptedHashes = new Map<string, bigint[]>();
        
        while (attempts <= MAX_NUDGES) {
          await new Promise((r) => setTimeout(r, 80)); // longer settle before capture
          
          // Force a render cycle
          if (hasRVFC) {
            await new Promise<void>((resolve) => {
              video.requestVideoFrameCallback?.(() => resolve());
              setTimeout(resolve, 200);
            });
          }
          
          try {
            const { dataUrl, hash } = await drawAndEncode();
            const hashKey = hash.map(h => h.toString()).join('-');
            
            // First check: have we tried this exact hash in THIS attempt?
            if (attemptedHashes.has(hashKey)) {
              attempts++;
              const nextT = Math.min(video.currentTime + NUDGE_STEP * (attempts + 1), duration - 0.001);
              if (nextT === video.currentTime || nextT - video.currentTime < 0.016) return false;
              await seekSoft(nextT, 2000);
              await waitDecoded();
              continue;
            }
            
            attemptedHashes.set(hashKey, hash);
            
            // Second check: is this hash too similar to ANY previously accepted frame?
            const distance = Math.min(...hashes.map(h => hashDistance(h, hash)), Infinity);
            const isDuplicate = distance <= MAX_NEAR_DUP_DIST;
            
            if (!isDuplicate) {
              // Triple check: compare raw data URLs to catch pixel-perfect duplicates
              const exactDuplicate = out.some(existing => existing === dataUrl);
              if (!exactDuplicate) {
                out.push(dataUrl);
                hashes.push(hash);
                return true;
              }
            }
            
            // nudge forward progressively
            attempts++;
            const nextT = Math.min(video.currentTime + NUDGE_STEP * (attempts + 1), duration - 0.001);
            if (nextT === video.currentTime || nextT - video.currentTime < 0.016) return false;
            await seekSoft(nextT, 2000);
            await waitDecoded();
          } catch {
            return false;
          }
        }
        return false;
      };

      // Initial pass over queue
      for (const t of queue) {
        if (aborted) break;
        if (out.length >= frameCount) break;
        await tryAtTime(t);
      }

      // Back-fill if we still don’t have enough unique frames
      let sweepRounds = 0;
      while (!aborted && out.length < frameCount && sweepRounds < 3) {
        sweepRounds++;
        const need = frameCount - out.length;
        const extra = makeSampleTimes(duration, need + 2 + sweepRounds);
        for (const t of extra) {
          if (out.length >= frameCount) break;
          await tryAtTime(t + (Math.random() * 0.06 - 0.03)); // tiny jitter
        }
      }

      if (!aborted) {
        setFrames(out.slice(0, frameCount));
        setLoading(false);
      }
    };

    setFrames([]);
    setLoading(true);
    extract();

    return () => { aborted = true; };
  }, [videoUrl, frameCount, targetWidth, enforcePortrait916]);

  // ---------- handlers ----------

  const handleFrameClick = async (frameDataUrl: string) => {
    setSelectedFrame(frameDataUrl);

    try {
      const response = await fetch(frameDataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('file', blob, `cover.webp`);

      const uploadResponse = await fetch(`/api/azure_upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'container': 'public',
          'relative_path': `vendor/${merchantId}/video/${videoId}`,
          'variants': JSON.stringify([]),
        },
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', uploadResult);
      const uploadedFile = uploadResult.uploaded?.[0];
      console.log('Uploaded file:', uploadedFile);
      if (!uploadedFile) throw new Error('No file was uploaded');

      const coverPhoto = {
        name: uploadedFile.name,
        url: uploadedFile.url,
        urlRelative: `public/${uploadedFile.relativePath}`,
        size: 'SQUARE',
        type: 'IMAGE',
        code: videoId,
        sizeBytes: uploadedFile.sizeBytes,
      };

      onCustomUpload(coverPhoto);
    } catch (error) {
      console.error('Failed to upload frame:', error);
      if (onFrameSelect) onFrameSelect(frameDataUrl);
    }
  };

  const handleCoverUpload = (file: any) => {
    setSelectedFrame(file.url);
    onCustomUpload(file);
    setShowUploader(false);
  };

  // ---------- render ----------

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Select Cover Photo</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUploader((s) => !s)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Custom
        </Button>
      </div>

      {showUploader && (
        <div className="p-4 border border-slate-300 rounded-lg bg-slate-50">
          <FileUploader
            id="video_cover_custom"
            className="w-full h-32 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors"
            value={undefined}
            connection={{ container: 'public', relative_path: `vendor/${merchantId}/video/${videoId}` }}
            allowMultiple={false}
            acceptOnly={{ type: 'IMAGE' }}
            onDropAsync={async () => {}}
            onUploadCompleteAsync={(files) => { if (files.length) handleCoverUpload(files[0]); }}
          />
        </div>
      )}

      {loading && frames.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-2" />
          <p className="text-sm">Extracting video frames…</p>
        </div>
      )}

      {!loading && frames.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">Unable to extract frames from this video.</p>
          <p className="text-xs mt-1">Please upload a custom cover image above.</p>
        </div>
      )}

      {frames.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {frames.map((frame, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleFrameClick(frame)}
              className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all ${
                selectedFrame === frame
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <img
                src={frame}
                alt={`Frame ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              {selectedFrame === frame && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <div className="bg-blue-500 text-white rounded-full p-1">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hidden elements used for extraction */}
      <video
        ref={videoRef}
        className="hidden"
        preload="metadata"
        muted
        playsInline
        crossOrigin="anonymous"
        src={`${process.env.NEXT_PUBLIC_server_endpoint}/proxy_video?url=${encodeURIComponent(videoUrl)}`}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoFrameSelector;