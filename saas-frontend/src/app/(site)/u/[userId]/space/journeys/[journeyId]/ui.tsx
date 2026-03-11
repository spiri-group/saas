'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Play, Pause, SkipBack, SkipForward, Check, Lock, Music,
  Clock, BookOpen, Sparkles, ChevronRight, ChevronLeft, Loader2, Timer, ShoppingCart, Package,
} from 'lucide-react';
import { useUnifiedCart } from '@/app/(site)/components/Catalogue/components/ShoppingCart/useUnifiedCart';
import { decodeAmountFromSmallestUnit } from '@/lib/functions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useJourneyProgress,
  useJourneyDetail,
  useJourneyTracks,
  useUpdateProgress,
  useAddReflection,
  JourneyTrack,
  JourneyTrackProgress,
} from '../_hooks/UseMyJourneys';

// ── Helpers ────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isTrackLocked(track: JourneyTrack): boolean {
  if (!track.releaseDate) return false;
  return new Date(track.releaseDate) > new Date();
}

// ── Component ──────────────────────────────────────────────

interface Props {
  userId: string;
  journeyId: string;
}

const UI: React.FC<Props> = ({ userId, journeyId }) => {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedPositionRef = useRef<number>(0);

  // Step 1: Fetch progress to get vendorId
  const { data: progress, isLoading: progressLoading, isError: progressError } = useJourneyProgress(journeyId, userId);
  const vendorId = progress?.vendorId || '';

  // Step 2: Fetch journey details + tracks once we have vendorId
  const { data: journey, isLoading: journeyLoading } = useJourneyDetail(journeyId, vendorId);
  const { data: tracks, isLoading: tracksLoading } = useJourneyTracks(journeyId, vendorId);

  const updateProgress = useUpdateProgress();
  const addReflection = useAddReflection();
  const cart = useUnifiedCart();

  const isLoading = progressLoading || (!!vendorId && (journeyLoading || tracksLoading));

  // Sort tracks by trackNumber
  const sortedTracks = useMemo(() => {
    if (!tracks) return [];
    return [...tracks].sort((a, b) => a.trackNumber - b.trackNumber);
  }, [tracks]);

  // ── Player State ─────────────────────────────────────────

  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [completedInSession, setCompletedInSession] = useState<Set<string>>(new Set());

  const activeTrack = sortedTracks[activeTrackIndex] || null;

  const getTrackProgress = useCallback((trackId: string): JourneyTrackProgress | undefined => {
    return progress?.trackProgress?.find(tp => tp.trackId === trackId);
  }, [progress]);

  // ── Initialize to current track from progress ────────────

  useEffect(() => {
    if (hasInitialized || !progress || sortedTracks.length === 0) return;

    const currentNum = progress.currentTrackNumber || 1;
    const idx = sortedTracks.findIndex(t => t.trackNumber === currentNum);
    if (idx >= 0) {
      setActiveTrackIndex(idx);
      const tp = getTrackProgress(sortedTracks[idx].id);
      if (tp && tp.lastPositionSeconds > 0 && !tp.completed) {
        setCurrentTime(tp.lastPositionSeconds);
      }
    }
    setHasInitialized(true);
  }, [progress, sortedTracks, hasInitialized, getTrackProgress]);

  // ── Audio Element Management ─────────────────────────────

  useEffect(() => {
    if (!activeTrack?.audioFile?.url) return;
    const audio = audioRef.current;
    if (!audio) return;

    const newSrc = activeTrack.audioFile.url;
    if (audio.src !== newSrc) {
      audio.src = newSrc;
      audio.load();
      const tp = getTrackProgress(activeTrack.id);
      if (tp && tp.lastPositionSeconds > 0 && !tp.completed) {
        audio.currentTime = tp.lastPositionSeconds;
      }
    }
  }, [activeTrack, getTrackProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => { if (!isSeeking) setCurrentTime(audio.currentTime); };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setShowReflection(true); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeeking, activeTrackIndex]);

  // ── Periodic Progress Save (every 10s) ───────────────────

  useEffect(() => {
    if (!activeTrack || !isPlaying) {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
        progressSaveInterval.current = null;
      }
      return;
    }

    progressSaveInterval.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !activeTrack) return;
      const pos = Math.floor(audio.currentTime);
      if (Math.abs(pos - lastSavedPositionRef.current) < 5) return;
      lastSavedPositionRef.current = pos;

      updateProgress.mutate({
        journeyId, userId,
        trackId: activeTrack.id,
        lastPositionSeconds: pos,
        completed: false,
      });
    }, 10000);

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
        progressSaveInterval.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.id, isPlaying, journeyId, userId]);

  // ── Check for 90% completion ─────────────────────────────

  useEffect(() => {
    if (!activeTrack || duration === 0) return;
    if (currentTime >= duration * 0.9 && !completedInSession.has(activeTrack.id)) {
      const tp = getTrackProgress(activeTrack.id);
      if (!tp?.completed) {
        setCompletedInSession(prev => new Set(prev).add(activeTrack.id));
        updateProgress.mutate({
          journeyId, userId,
          trackId: activeTrack.id,
          lastPositionSeconds: Math.floor(currentTime),
          completed: true,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, activeTrack?.id]);

  // ── Player Controls ──────────────────────────────────────

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack?.audioFile?.url) return;
    if (isPlaying) { audio.pause(); } else { audio.play().catch(() => {}); }
  }, [isPlaying, activeTrack]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  }, []);

  const selectTrack = useCallback((index: number) => {
    const track = sortedTracks[index];
    if (!track || isTrackLocked(track)) return;

    if (activeTrack && audioRef.current) {
      updateProgress.mutate({
        journeyId, userId,
        trackId: activeTrack.id,
        lastPositionSeconds: Math.floor(audioRef.current.currentTime),
        completed: false,
      });
    }

    setActiveTrackIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setShowReflection(false);
    setReflectionText('');

    setTimeout(() => { audioRef.current?.play().catch(() => {}); }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedTracks, activeTrack, journeyId, userId]);

  const handlePrevTrack = useCallback(() => {
    if (activeTrackIndex > 0) selectTrack(activeTrackIndex - 1);
  }, [activeTrackIndex, selectTrack]);

  const handleNextTrack = useCallback(() => {
    if (activeTrackIndex < sortedTracks.length - 1) selectTrack(activeTrackIndex + 1);
  }, [activeTrackIndex, sortedTracks.length, selectTrack]);

  // ── Reflection ───────────────────────────────────────────

  const handleSaveReflection = useCallback(async () => {
    if (!activeTrack || !reflectionText.trim()) return;
    setSavingReflection(true);
    try {
      await addReflection.mutateAsync({
        journeyId, userId,
        trackId: activeTrack.id,
        reflection: reflectionText.trim(),
      });
      toast.success('Reflection saved');
      setReflectionText('');
    } catch {
      toast.error('Failed to save reflection');
    } finally {
      setSavingReflection(false);
    }
  }, [activeTrack, reflectionText, journeyId, userId, addReflection]);

  const handleContinueToNext = useCallback(() => {
    setShowReflection(false);
    if (activeTrackIndex < sortedTracks.length - 1) selectTrack(activeTrackIndex + 1);
  }, [activeTrackIndex, sortedTracks.length, selectTrack]);

  // ── Loading / Error States ───────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="player-loading">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (progressError || !journey) {
    return (
      <div className="p-6 md:p-10" data-testid="player-error">
        <button
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors"
          onClick={() => router.push(`/u/${userId}/space/journeys`)}
          data-testid="back-to-journeys"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Journeys
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Music className="w-16 h-16 text-slate-600 mb-4" />
          <h2 className="text-xl font-medium text-slate-300">Journey not found</h2>
          <p className="text-slate-500 mt-2">This journey may no longer be available.</p>
        </div>
      </div>
    );
  }

  // Check rental expiry
  const isRental = progress?.accessType === 'RENTAL';
  const rentalExpired = isRental && progress?.rentalExpiresAt && new Date(progress.rentalExpiresAt) <= new Date();
  const rentalDaysLeft = isRental && progress?.rentalExpiresAt
    ? Math.max(0, Math.ceil((new Date(progress.rentalExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (rentalExpired) {
    const thumbnailUrl = journey.thumbnail?.image?.media?.url;
    return (
      <div className="min-h-screen bg-slate-950" data-testid="journey-rental-expired">
        <div className="px-6 pt-6">
          <button
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            onClick={() => router.push(`/u/${userId}/space/journeys`)}
            data-testid="back-to-journeys"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Journeys
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          {thumbnailUrl ? (
            <Image src={thumbnailUrl} alt={journey.name} width={192} height={192} className="object-cover rounded-2xl mb-6 opacity-50" />
          ) : (
            <Music className="w-16 h-16 text-slate-600 mb-6" />
          )}
          <Timer className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-medium text-slate-300 mb-2">Rental Expired</h2>
          <p className="text-slate-500 max-w-md mb-6">
            Your rental access to &ldquo;{journey.name}&rdquo; has expired. You can rent it again or purchase it for permanent access.
          </p>
          <Button
            onClick={() => router.push(`/m/${journey.vendor?.slug || progress?.vendorId}/journey/${journeyId}`)}
            className="bg-purple-600 hover:bg-purple-500 text-white"
            data-testid="repurchase-btn"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            View in Store
          </Button>
        </div>
      </div>
    );
  }

  const thumbnailUrl = journey.thumbnail?.image?.media?.url;
  const thumbnailBgClass = 'bg-indigo-950';
  const activeTrackProgress = activeTrack ? getTrackProgress(activeTrack.id) : undefined;
  const existingReflection = activeTrackProgress?.reflection;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950" data-testid="journey-player-page">
      <audio ref={audioRef} preload="metadata" />

      {/* Rental banner */}
      {isRental && rentalDaysLeft !== null && (
        <div
          className={`px-6 py-2 text-center text-sm ${rentalDaysLeft <= 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/10 text-blue-300'}`}
          data-testid="rental-banner"
        >
          <Timer className="w-3.5 h-3.5 inline mr-1.5" />
          Rental access &mdash; {rentalDaysLeft} {rentalDaysLeft === 1 ? 'day' : 'days'} remaining
        </div>
      )}

      {/* Back nav */}
      <div className="px-6 pt-6">
        <button
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
          onClick={() => router.push(`/u/${userId}/space/journeys`)}
          data-testid="back-to-journeys"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Journeys
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 p-6 lg:p-8">
        {/* ── Left Column: Now Playing ──────────────────── */}
        <div className="flex-1">

          {/* Journey Intention */}
          {journey.intention && (
            <div className="mb-6 px-4 py-3 border-l-2 border-purple-500/50 bg-purple-500/5 rounded-r-lg" data-testid="journey-intention">
              <p className="text-purple-300/80 text-sm italic leading-relaxed">
                &ldquo;{journey.intention}&rdquo;
              </p>
            </div>
          )}

          {/* Album Art */}
          <div className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/10 mb-8" data-testid="album-art">
            {thumbnailUrl ? (
              <Image src={thumbnailUrl} alt={journey.name} fill className="object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${thumbnailBgClass}`}>
                <Music className="w-24 h-24 text-purple-400/30" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center mb-6">
            <h1 className="text-white text-xl font-semibold mb-1" data-testid="now-playing-title">
              {activeTrack?.title || 'No track selected'}
            </h1>
            <p className="text-slate-400 text-sm" data-testid="now-playing-journey">{journey.name}</p>
            <p className="text-slate-500 text-xs mt-1">{journey.vendor?.name}</p>
          </div>

          {/* Progress Slider */}
          <div className="max-w-md mx-auto mb-2 px-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={() => setIsSeeking(false)}
              onTouchStart={() => setIsSeeking(true)}
              onTouchEnd={() => setIsSeeking(false)}
              className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125"
              style={{
                background: `linear-gradient(to right, rgb(168 85 247) ${progressPercent}%, rgb(30 41 59) ${progressPercent}%)`,
              }}
              data-testid="audio-seek-bar"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span data-testid="current-time">{formatTime(currentTime)}</span>
              <span data-testid="total-time">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={handlePrevTrack}
              disabled={activeTrackIndex === 0}
              className="text-slate-400 hover:text-white disabled:text-slate-700 transition-colors p-2"
              aria-label="Previous track"
              data-testid="prev-track-btn"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={!activeTrack?.audioFile?.url}
              className="w-16 h-16 rounded-full bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700
                flex items-center justify-center text-white transition-colors shadow-lg shadow-purple-500/30"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              aria-pressed={isPlaying}
              data-testid="play-pause-btn"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>

            <button
              onClick={handleNextTrack}
              disabled={activeTrackIndex >= sortedTracks.length - 1}
              className="text-slate-400 hover:text-white disabled:text-slate-700 transition-colors p-2"
              aria-label="Next track"
              data-testid="next-track-btn"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Recommended Crystals for Current Track */}
          {activeTrack?.recommendedCrystals && activeTrack.recommendedCrystals.length > 0 && (
            <div className="mb-8" data-testid="track-crystals">
              <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Recommended Crystals
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeTrack.recommendedCrystals.map((crystal) => (
                  <Badge key={crystal} className="bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20">
                    {crystal}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Cross-sell: Linked Products */}
          {activeTrack?.linkedProducts && activeTrack.linkedProducts.length > 0 && (
            <div className="mb-8" data-testid="track-linked-products">
              <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                Pairs well with this track
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeTrack.linkedProducts.map((product) => {
                  const sku = product.skus?.[0];
                  const thumbUrl = product.thumbnail?.image?.media?.url;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3 hover:border-emerald-500/30 transition-colors"
                      data-testid={`linked-product-${product.id}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                        {thumbUrl ? (
                          <Image src={thumbUrl} alt={product.name} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{product.name}</p>
                        {sku?.price && (
                          <p className="text-xs text-slate-400">
                            ${decodeAmountFromSmallestUnit(sku.price.amount, sku.price.currency)} {sku.price.currency}
                          </p>
                        )}
                      </div>
                      {sku && product.ref && (
                        <Button
                          size="sm"
                          onClick={() => cart.addProduct({
                            productRef: product.ref!,
                            variantId: sku.id,
                            descriptor: product.name,
                            quantity: 1,
                            price: sku.price,
                            imageUrl: thumbUrl,
                          })}
                          disabled={cart.isAddingProduct}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0"
                          data-testid={`add-product-${product.id}`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Integration Prompts & Reflection */}
          {(showReflection || existingReflection) && activeTrack && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 mb-8" data-testid="reflection-section">
              <h3 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Integration &amp; Reflection
              </h3>

              {activeTrack.integrationPrompts && activeTrack.integrationPrompts.length > 0 && (
                <div className="mb-5">
                  <ul className="space-y-2">
                    {activeTrack.integrationPrompts.map((prompt, i) => (
                      <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span>{prompt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {existingReflection && (
                <div className="mb-4 bg-slate-800/50 rounded-lg p-4" data-testid="saved-reflection">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Your Reflection</p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{existingReflection}</p>
                </div>
              )}

              <div>
                <Textarea
                  dark
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder={existingReflection ? 'Add another reflection...' : 'Write your reflection...'}
                  className="min-h-[100px] resize-none focus:border-purple-500/50 focus:ring-purple-500/20"
                  data-testid="reflection-textarea"
                />
                <div className="flex items-center justify-between mt-3">
                  <Button
                    onClick={handleSaveReflection}
                    disabled={!reflectionText.trim() || savingReflection}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                    size="sm"
                    data-testid="save-reflection-btn"
                  >
                    {savingReflection ? 'Saving...' : 'Save Reflection'}
                  </Button>

                  {showReflection && activeTrackIndex < sortedTracks.length - 1 && (
                    <Button
                      onClick={handleContinueToNext}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                      data-testid="continue-next-btn"
                    >
                      Continue to Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Track List ──────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 lg:flex-shrink-0 mt-8 lg:mt-0">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden sticky top-6">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-white text-sm font-medium">Tracks</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {sortedTracks.length} tracks &middot; {formatDuration(journey.totalDurationSeconds)}
              </p>
            </div>

            <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto" data-testid="track-list">
              {sortedTracks.map((track, index) => {
                const tp = getTrackProgress(track.id);
                const locked = isTrackLocked(track);
                const isActive = index === activeTrackIndex;
                const isCompleted = tp?.completed || completedInSession.has(track.id);

                return (
                  <button
                    key={track.id}
                    onClick={() => selectTrack(index)}
                    disabled={locked}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors
                      ${isActive ? 'bg-purple-500/10 border-l-2 border-purple-500' : 'border-l-2 border-transparent hover:bg-slate-800/50'}
                      ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    data-testid={`track-item-${track.id}`}
                  >
                    {/* Track number / status indicator */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      {locked ? (
                        <Lock className="w-4 h-4 text-slate-600" />
                      ) : isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      ) : isActive && isPlaying ? (
                        <div className="flex items-center gap-0.5" data-testid="playing-indicator">
                          <span className="w-0.5 h-3 bg-purple-400 rounded-full animate-pulse" />
                          <span className="w-0.5 h-4 bg-purple-400 rounded-full animate-pulse [animation-delay:0.15s]" />
                          <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse [animation-delay:0.3s]" />
                        </div>
                      ) : (
                        <span className={`text-sm font-medium ${isActive ? 'text-purple-400' : 'text-slate-500'}`}>
                          {track.trackNumber}
                        </span>
                      )}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isActive ? 'text-purple-300 font-medium' : 'text-slate-300'}`}>
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(track.durationSeconds)}
                        </span>
                        {track.integrationPrompts && track.integrationPrompts.length > 0 && (
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Prompts
                          </span>
                        )}
                        {tp?.reflection && (
                          <span className="text-xs text-purple-400/60 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Reflected
                          </span>
                        )}
                      </div>
                    </div>

                    {isActive && !locked && (
                      <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Journey Crystals (overall) */}
          {journey.recommendedCrystals && journey.recommendedCrystals.length > 0 && (
            <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4" data-testid="journey-crystals">
              <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Journey Crystals
              </h3>
              <div className="flex flex-wrap gap-2">
                {journey.recommendedCrystals.map((crystal) => (
                  <Badge key={crystal} className="bg-slate-800 text-slate-300 border border-slate-700 text-xs">
                    {crystal}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UI;
