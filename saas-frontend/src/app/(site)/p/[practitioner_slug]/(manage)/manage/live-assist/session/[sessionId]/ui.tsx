'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Radio,
    Copy,
    Check,
    Pause,
    Play,
    Square,
    SkipForward,
    CheckCircle,
    Users,
    DollarSign,
    Loader2,
    ArrowLeft,
    Clock,
    UserPlus,
    Volume2,
    VolumeX,
    QrCode,
    X,
    Camera,
    Send,
    MessageSquare,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { gql } from '@/lib/services/gql';
import { useLiveQueue, LiveQueueEntryData } from '../../_hooks/UseLiveQueue';
import {
    usePauseLiveSession,
    useResumeLiveSession,
    useEndLiveSession,
    useStartReading,
    useCompleteReading,
    useSkipReading,
} from '../../_hooks/UseSessionActions';
import { useSendReadingSummary } from '../../_hooks/UseSendReadingSummary';
import { useRealTimeQuery } from '@/components/utils/RealTime/useRealTimeQuery';
import AudioRecorder, { AudioPlayback } from '@/components/live-assist/AudioRecorder';
import PageQRCode from '@/components/ux/PageQRCode';
import { resizePhoto } from '@/app/(site)/live/[code]/utils/resizePhoto';
import Link from 'next/link';

type Props = {
    practitionerId: string;
    sessionId: string;
    slug: string;
};

function formatAmount(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

// Live elapsed timer hook
function useElapsedTime(startedAt: string | undefined, isRunning: boolean): string {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        if (!startedAt) return;

        const update = () => {
            const start = new Date(startedAt).getTime();
            const now = Date.now();
            const diffSec = Math.floor((now - start) / 1000);
            const hrs = Math.floor(diffSec / 3600);
            const mins = Math.floor((diffSec % 3600) / 60);
            const secs = diffSec % 60;
            if (hrs > 0) {
                setElapsed(`${hrs}h ${mins.toString().padStart(2, '0')}m`);
            } else {
                setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startedAt, isRunning]);

    return elapsed;
}

const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : '';

// Play a gentle two-tone chime using Web Audio API
function playJoinChime() {
    try {
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // First tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = 587; // D5
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Second tone (higher, delayed)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = 880; // A5
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0.12, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.5);

        // Cleanup
        setTimeout(() => ctx.close(), 600);
    } catch {
        // Web Audio not available
    }
}

export default function LiveQueueDashboard({ practitionerId, sessionId, slug }: Props) {
    const [copied, setCopied] = useState(false);
    const [newEntryFlash, setNewEntryFlash] = useState(false);
    const [readingAudio, setReadingAudio] = useState<string | null>(null);
    const [spreadPhoto, setSpreadPhoto] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showQR, setShowQR] = useState(false);
    const spreadPhotoRef = useRef<HTMLInputElement>(null);

    // Post-reading summary panel
    const [summaryEntry, setSummaryEntry] = useState<LiveQueueEntryData | null>(null);
    const [summaryNote, setSummaryNote] = useState('');
    const [summaryCtaMessage, setSummaryCtaMessage] = useState('');
    const [summarySent, setSummarySent] = useState(false);

    const prevQueueCountRef = useRef<number | null>(null);

    // Fetch session with real-time updates
    const { data: session, isLoading: sessionLoading } = useRealTimeQuery({
        queryKey: ['live-session-detail', sessionId, practitionerId],
        queryFn: async () => {
            const response = await gql<{
                liveSession: any;
            }>(`
                query LiveSession($sessionId: ID!, $vendorId: ID!) {
                    liveSession(sessionId: $sessionId, vendorId: $vendorId) {
                        id
                        vendorId
                        code
                        sessionTitle
                        sessionStatus
                        pricingMode
                        defaultCta {
                            message
                            recommendedServiceId
                            recommendedServiceName
                            recommendedProductId
                            recommendedProductName
                        }
                        totalJoined
                        totalCompleted
                        totalRevenue
                        startedAt
                    }
                }
            `, { sessionId, vendorId: practitionerId });
            return response.liveSession;
        },
        realtimeEvent: 'liveSession',
        selectId: (data) => data?.id || sessionId,
        signalRGroup: `live-session-${sessionId}`,
        enabled: !!sessionId,
    });

    // Fetch queue with real-time updates
    const { data: queue } = useLiveQueue(sessionId);

    // Mutations
    const pauseMutation = usePauseLiveSession();
    const resumeMutation = useResumeLiveSession();
    const endMutation = useEndLiveSession();
    const startReadingMutation = useStartReading();
    const completeReadingMutation = useCompleteReading();
    const skipReadingMutation = useSkipReading();
    const sendSummaryMutation = useSendReadingSummary();

    // Derived state
    const isLive = session?.sessionStatus === 'ACTIVE';
    const isPaused = session?.sessionStatus === 'PAUSED';
    const isEnded = session?.sessionStatus === 'ENDED';

    const waitingEntries = (queue || []).filter((e: LiveQueueEntryData) => e.entryStatus === 'WAITING').sort((a: LiveQueueEntryData, b: LiveQueueEntryData) => a.priority - b.priority);
    const currentReading = (queue || []).find((e: LiveQueueEntryData) => e.entryStatus === 'IN_PROGRESS');
    const completedEntries = (queue || []).filter((e: LiveQueueEntryData) => e.entryStatus === 'COMPLETED');
    const waitingCount = waitingEntries.length;

    // Detect new queue entries joining — flash + chime
    useEffect(() => {
        if (prevQueueCountRef.current !== null && waitingCount > prevQueueCountRef.current) {
            setNewEntryFlash(true);
            setTimeout(() => setNewEntryFlash(false), 2000);
            if (soundEnabled) playJoinChime();
        }
        prevQueueCountRef.current = waitingCount;
    }, [waitingCount, soundEnabled]);

    // Elapsed time
    const elapsed = useElapsedTime(session?.startedAt, isLive || isPaused);

    const shareUrl = session?.code ? `${FRONTEND_URL}/live/${session.code}` : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePause = () => pauseMutation.mutate({ sessionId, vendorId: practitionerId });
    const handleResume = () => resumeMutation.mutate({ sessionId, vendorId: practitionerId });
    const handleEnd = () => endMutation.mutate({ sessionId, vendorId: practitionerId });

    const handleStartReading = (entryId: string) => {
        startReadingMutation.mutate({ entryId, sessionId });
    };

    // Complete + auto-advance: complete current (with optional audio + spread photo), open summary panel, then start next
    const handleCompleteReading = useCallback((entryId: string) => {
        const completingEntry = currentReading;
        completeReadingMutation.mutate(
            {
                entryId,
                sessionId,
                readingAudio: readingAudio || undefined,
                spreadPhoto: spreadPhoto || undefined,
            },
            {
                onSuccess: () => {
                    setReadingAudio(null);
                    setSpreadPhoto(null);
                    // Open summary panel for post-reading note + CTA
                    if (completingEntry) {
                        setSummaryEntry(completingEntry);
                        setSummaryNote('');
                        setSummaryCtaMessage(session?.defaultCta?.message || '');
                        setSummarySent(false);
                    }
                    // Auto-advance: find the next waiting entry and start it
                    if (waitingEntries.length > 0) {
                        startReadingMutation.mutate({ entryId: waitingEntries[0].id, sessionId });
                    }
                },
            }
        );
    }, [completeReadingMutation, startReadingMutation, sessionId, waitingEntries, readingAudio, spreadPhoto, currentReading, session]);

    // Skip + auto-advance
    const handleSkipReading = useCallback((entryId: string) => {
        skipReadingMutation.mutate({ entryId, sessionId }, {
            onSuccess: () => {
                setReadingAudio(null);
                setSpreadPhoto(null);
                // Auto-advance: find the next waiting entry and start it
                if (waitingEntries.length > 0) {
                    startReadingMutation.mutate({ entryId: waitingEntries[0].id, sessionId });
                }
            },
        });
    }, [skipReadingMutation, startReadingMutation, sessionId, waitingEntries]);

    // Send summary for completed reading
    const handleSendSummary = useCallback(() => {
        if (!summaryEntry) return;
        sendSummaryMutation.mutate({
            entryId: summaryEntry.id,
            sessionId,
            practitionerNote: summaryNote.trim() || undefined,
            recommendation: summaryCtaMessage.trim() ? {
                message: summaryCtaMessage.trim(),
                recommendedServiceId: session?.defaultCta?.recommendedServiceId || undefined,
            } : undefined,
        }, {
            onSuccess: () => setSummarySent(true),
        });
    }, [summaryEntry, sessionId, summaryNote, summaryCtaMessage, session, sendSummaryMutation]);

    // Handle spread photo capture
    const handleSpreadPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resized = await resizePhoto(file);
            setSpreadPhoto(resized);
        } catch {
            // ignore resize failure
        }
    }, []);

    if (sessionLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6 text-center">
                <p className="text-slate-400">Session not found.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl" data-testid="live-queue-dashboard">
            {/* Fullscreen QR overlay */}
            {showQR && shareUrl && (
                <div
                    className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center cursor-pointer"
                    onClick={() => setShowQR(false)}
                    data-testid="qr-fullscreen"
                >
                    <PageQRCode
                        url={shareUrl}
                        size={Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.7 : 300, 400)}
                        dotColor="#7c3aed"
                        cornerColor="#7c3aed"
                        cornerDotColor="#7c3aed"
                        label=""
                        srOnly
                    />
                    <p className="mt-6 text-lg font-medium text-slate-800">{shareUrl.replace('https://', '')}</p>
                    <p className="mt-2 text-sm text-slate-500">Tap anywhere to close</p>
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                        onClick={() => setShowQR(false)}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
            )}

            {/* Back link */}
            <Link href={`/p/${slug}/manage/live-assist`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Live Assist
            </Link>

            {/* Header Bar */}
            <Card className={`mb-6 ${isLive ? 'bg-red-500/10 border-red-500/30' : isPaused ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {isLive && <Radio className="h-5 w-5 text-red-500 animate-pulse" data-testid="live-indicator" />}
                            {isPaused && <Pause className="h-5 w-5 text-amber-500" />}
                            {isEnded && <Square className="h-5 w-5 text-slate-500" />}
                            <div>
                                <p className="font-semibold text-white">
                                    {isLive ? 'LIVE' : isPaused ? 'PAUSED' : 'ENDED'}{' '}
                                    <span className="font-normal text-slate-300">
                                        {session.sessionTitle || 'Live Session'}
                                    </span>
                                </p>
                                {/* Elapsed timer */}
                                {elapsed && (
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5" data-testid="elapsed-time">
                                        <Clock className="h-3 w-3" />
                                        {elapsed}
                                    </p>
                                )}
                            </div>
                        </div>

                        {!isEnded && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSoundEnabled(v => !v)}
                                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                                    title={soundEnabled ? 'Mute join sounds' : 'Unmute join sounds'}
                                    data-testid="sound-toggle-btn"
                                >
                                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </button>
                                {isLive && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePause}
                                        disabled={pauseMutation.isPending}
                                        className="text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                        data-testid="pause-btn"
                                    >
                                        <Pause className="h-4 w-4 mr-1" />
                                        Pause
                                    </Button>
                                )}
                                {isPaused && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResume}
                                        disabled={resumeMutation.isPending}
                                        className="text-green-400 border-green-500/30 hover:bg-green-500/20"
                                        data-testid="resume-btn"
                                    >
                                        <Play className="h-4 w-4 mr-1" />
                                        Resume
                                    </Button>
                                )}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-400 border-red-500/30 hover:bg-red-500/20"
                                            data-testid="end-session-btn"
                                        >
                                            <Square className="h-4 w-4 mr-1" />
                                            End Session
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>End this live session?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                All remaining viewers in the queue ({waitingCount}) will have their card
                                                authorizations released. They will NOT be charged. This cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleEnd}
                                                className="bg-red-600 hover:bg-red-700"
                                                data-testid="confirm-end-btn"
                                            >
                                                {endMutation.isPending ? 'Ending...' : 'End Session'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>

                    {/* Share URL + QR */}
                    {!isEnded && (
                        <div className="mt-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Share:</span>
                                <code className="text-xs text-purple-400 bg-slate-800/50 px-2 py-1 rounded flex-1 truncate" data-testid="share-url">
                                    {shareUrl}
                                </code>
                                <button onClick={handleCopy} className="text-slate-400 hover:text-white" data-testid="copy-link-btn">
                                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                    onClick={() => setShowQR(v => !v)}
                                    className={`text-slate-400 hover:text-white ${showQR ? 'text-purple-400' : ''}`}
                                    data-testid="qr-toggle-btn"
                                    title="Show QR code"
                                >
                                    <QrCode className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {showQR && shareUrl && (
                                <div className="mt-3 flex justify-center">
                                    <PageQRCode
                                        url={shareUrl}
                                        size={180}
                                        dotColor="#7c3aed"
                                        cornerColor="#7c3aed"
                                        cornerDotColor="#7c3aed"
                                        label="Scan to join the queue"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-3 text-sm text-slate-400">
                        <span
                            className={`flex items-center gap-1 transition-colors ${newEntryFlash ? 'text-green-400' : ''}`}
                            data-testid="stat-waiting"
                        >
                            {newEntryFlash ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            {waitingCount} waiting
                        </span>
                        <span className="flex items-center gap-1" data-testid="stat-completed">
                            <CheckCircle className="h-4 w-4" /> {session.totalCompleted || 0} done
                        </span>
                        <span className="flex items-center gap-1" data-testid="stat-revenue">
                            <DollarSign className="h-4 w-4" /> {formatAmount(session.totalRevenue || 0)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Current Reading */}
            {currentReading && (
                <Card className="mb-6 bg-purple-500/10 border-purple-500/30" data-testid="current-reading-card">
                    <CardContent className="p-5">
                        <p className="text-xs font-medium text-purple-400 uppercase tracking-wide mb-3">Current Reading</p>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-lg" data-testid="current-name">
                                    {currentReading.customerName}
                                </p>
                                <p className="text-sm text-slate-400">{currentReading.customerEmail}</p>
                                <div className="flex items-start gap-2 mt-2">
                                    <p className="text-white flex-1" data-testid="current-question">
                                        &ldquo;{currentReading.question}&rdquo;
                                    </p>
                                    {currentReading.audioUrl && (
                                        <AudioPlayback
                                            audioUrl={currentReading.audioUrl}
                                            label="Hear question"
                                            className="shrink-0 mt-0.5"
                                        />
                                    )}
                                </div>
                                {currentReading.photoUrl && (
                                    <img
                                        src={currentReading.photoUrl}
                                        alt="Customer photo"
                                        className="mt-3 w-32 h-32 rounded-lg object-cover border border-slate-600"
                                        data-testid="current-photo"
                                    />
                                )}
                            </div>
                        </div>
                        {/* Capture tools: audio recording + spread photo */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <AudioRecorder
                                onRecordingComplete={(base64) => setReadingAudio(base64)}
                                onRecordingClear={() => setReadingAudio(null)}
                                maxDurationSeconds={300}
                                label="Record reading"
                                className="flex-1"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    ref={spreadPhotoRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleSpreadPhotoCapture}
                                    className="hidden"
                                />
                                {spreadPhoto ? (
                                    <div className="relative">
                                        <img
                                            src={spreadPhoto}
                                            alt="Card spread"
                                            className="w-16 h-16 rounded-lg object-cover border border-purple-500/30"
                                            data-testid="spread-photo-preview"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setSpreadPhoto(null); if (spreadPhotoRef.current) spreadPhotoRef.current.value = ''; }}
                                            className="absolute -top-1.5 -right-1.5 bg-slate-700 rounded-full p-0.5 hover:bg-slate-600"
                                        >
                                            <X className="h-3 w-3 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => spreadPhotoRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-600 rounded-lg hover:border-purple-500/30 hover:text-purple-400 transition-colors"
                                        data-testid="spread-photo-btn"
                                    >
                                        <Camera className="h-4 w-4" />
                                        Spread photo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                            <Button
                                onClick={() => handleCompleteReading(currentReading.id)}
                                disabled={completeReadingMutation.isPending || startReadingMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                                data-testid="complete-reading-btn"
                            >
                                {completeReadingMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                {waitingEntries.length > 0 ? 'Complete & Next' : 'Complete Reading'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSkipReading(currentReading.id)}
                                disabled={skipReadingMutation.isPending || startReadingMutation.isPending}
                                className="text-slate-400 border-slate-600"
                                data-testid="skip-reading-btn"
                            >
                                <SkipForward className="h-4 w-4 mr-1" />
                                Skip
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Post-reading summary panel — non-blocking, can fill while next reading happens */}
            {summaryEntry && !summarySent && (
                <Card className="mb-6 bg-amber-500/5 border-amber-500/20" data-testid="summary-panel">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Send summary to {summaryEntry.customerName}
                            </p>
                            <button
                                onClick={() => setSummaryEntry(null)}
                                className="text-slate-500 hover:text-white"
                                title="Skip sending summary"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Personal note (optional)</label>
                                <Textarea
                                    value={summaryNote}
                                    onChange={(e) => setSummaryNote(e.target.value)}
                                    placeholder="Your grandmother is at peace..."
                                    className="bg-slate-800/50 border-slate-600 text-white text-sm min-h-[60px]"
                                    data-testid="summary-note"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">
                                    Follow-up recommendation
                                    {session?.defaultCta?.message && (
                                        <span className="text-slate-500 ml-1">(default pre-filled)</span>
                                    )}
                                </label>
                                <Textarea
                                    value={summaryCtaMessage}
                                    onChange={(e) => setSummaryCtaMessage(e.target.value)}
                                    placeholder="I&apos;d recommend a deeper 1:1 session to explore this further"
                                    className="bg-slate-800/50 border-slate-600 text-white text-sm min-h-[48px]"
                                    data-testid="summary-cta"
                                />
                                {session?.defaultCta?.recommendedServiceName && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Links to: {session.defaultCta.recommendedServiceName}
                                    </p>
                                )}
                            </div>

                            <Button
                                onClick={handleSendSummary}
                                disabled={sendSummaryMutation.isPending || (!summaryNote.trim() && !summaryCtaMessage.trim())}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
                                data-testid="send-summary-btn"
                            >
                                {sendSummaryMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Send to {summaryEntry.customerName}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary sent confirmation */}
            {summaryEntry && summarySent && (
                <div
                    className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-between"
                    data-testid="summary-sent"
                >
                    <p className="text-sm text-green-400 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" />
                        Summary sent to {summaryEntry.customerName}
                    </p>
                    <button onClick={() => setSummaryEntry(null)} className="text-slate-500 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Start first reading - only shows when no current reading */}
            {!currentReading && waitingEntries.length > 0 && !isEnded && (
                <Card className="mb-6 bg-slate-800 border-slate-700" data-testid="next-up-card">
                    <CardContent className="p-5">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Next Up</p>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-lg">{waitingEntries[0].customerName}</p>
                                <p className="text-sm text-slate-400">{waitingEntries[0].customerEmail}</p>
                                <p className="text-white mt-2">&ldquo;{waitingEntries[0].question}&rdquo;</p>
                                {waitingEntries[0].photoUrl && (
                                    <img
                                        src={waitingEntries[0].photoUrl}
                                        alt="Customer photo"
                                        className="mt-3 w-32 h-32 rounded-lg object-cover border border-slate-600"
                                    />
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={() => handleStartReading(waitingEntries[0].id)}
                            disabled={startReadingMutation.isPending}
                            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                            data-testid="start-reading-btn"
                        >
                            {startReadingMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            Start Reading
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Queue List */}
            {waitingEntries.length > (currentReading ? 0 : 1) && (
                <div className="space-y-2" data-testid="queue-list">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        Up Next ({currentReading ? waitingEntries.length : waitingEntries.length - 1})
                    </h3>
                    {waitingEntries.slice(currentReading ? 0 : 1).map((entry: LiveQueueEntryData, idx: number) => (
                        <Card key={entry.id} className="bg-slate-900 border-slate-700" data-testid={`queue-entry-${entry.id}`}>
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-slate-500 w-6">
                                            #{(currentReading ? idx + 1 : idx + 2)}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium text-white">{entry.customerName}</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[300px]">
                                                {entry.question}
                                            </p>
                                        </div>
                                    </div>
                                    {entry.photoUrl && (
                                        <img
                                            src={entry.photoUrl}
                                            alt=""
                                            className="w-8 h-8 rounded object-cover border border-slate-600"
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Completed Readings */}
            {completedEntries.length > 0 && (
                <div className="mt-6 space-y-2" data-testid="completed-list">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        Completed ({completedEntries.length})
                    </h3>
                    {completedEntries.map((entry: LiveQueueEntryData) => (
                        <Card key={entry.id} className="bg-slate-900/50 border-slate-800" data-testid={`completed-entry-${entry.id}`}>
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="text-sm text-slate-300">{entry.customerName}</p>
                                            <p className="text-xs text-slate-500">{formatAmount(entry.amount.amount)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty state when ended */}
            {isEnded && waitingEntries.length === 0 && !currentReading && (
                <div className="text-center py-8 text-slate-400" data-testid="session-ended">
                    <p>This session has ended.</p>
                    <p className="text-sm mt-1">
                        {session.totalCompleted || 0} readings completed &middot; {formatAmount(session.totalRevenue || 0)} earned
                    </p>
                </div>
            )}
        </div>
    );
}
