'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    ImagePlus,
    Loader2,
    Pause,
    Play,
    Radio,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';
import { useLiveSession } from './hooks/UseLiveSession';
import { useJoinLiveQueue, JoinLiveQueueResult } from './hooks/UseJoinLiveQueue';
import { useQueuePosition, useLeaveLiveQueue } from './hooks/UseQueuePosition';
import { resizePhoto } from './utils/resizePhoto';
import AudioRecorder, { AudioPlayback } from '@/components/live-assist/AudioRecorder';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? '');

function formatAmount(cents: number, currency: string): string {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

// ─── Reconnection via localStorage ─────────────────────────

const QUEUE_STORAGE_PREFIX = 'live-queue-';

type SavedQueueEntry = {
    entryId: string;
    sessionId: string;
    question: string;
    amount: { amount: number; currency: string };
};

function saveQueueEntry(code: string, entry: SavedQueueEntry) {
    try {
        localStorage.setItem(`${QUEUE_STORAGE_PREFIX}${code}`, JSON.stringify(entry));
    } catch { /* ignore */ }
}

function loadQueueEntry(code: string): SavedQueueEntry | null {
    try {
        const raw = localStorage.getItem(`${QUEUE_STORAGE_PREFIX}${code}`);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function clearQueueEntry(code: string) {
    try {
        localStorage.removeItem(`${QUEUE_STORAGE_PREFIX}${code}`);
    } catch { /* ignore */ }
}

// ─── Branding ────────────────────────────────────────────────

function SpiriVerseBrand() {
    return (
        <div className="flex items-center justify-center gap-2 text-slate-500 mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide uppercase">SpiriVerse</span>
        </div>
    );
}

// ─── Authorization Form (inside Elements provider) ──────────

function AuthorizationForm({
    amount,
    currency,
    onSuccess,
}: {
    amount: number;
    currency: string;
    onSuccess: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const result = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
        });

        if (result.error) {
            setErrorMessage(result.error.message || 'Authorization failed. Please try again.');
            setIsProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement options={{ terms: { card: 'never' } }} />
            {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm" data-testid="auth-error">
                    {errorMessage}
                </div>
            )}
            <Button
                type="submit"
                data-testid="authorize-btn"
                disabled={!stripe || isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
            >
                {isProcessing ? 'Authorizing...' : `Authorize ${formatAmount(amount, currency)}`}
            </Button>
            <p className="text-center text-xs text-slate-500">
                You won&apos;t be charged until your reading is completed
            </p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secured by Stripe
            </div>
        </form>
    );
}

// ─── Main UI ────────────────────────────────────────────────

type CustomerState =
    | 'loading'
    | 'not-found'
    | 'ended'
    | 'join-form'
    | 'authorizing'
    | 'in-queue'
    | 'in-progress'
    | 'completed'
    | 'released'
    | 'paused';

type Props = {
    code: string;
};

export default function LiveSessionUI({ code }: Props) {
    const { data: session, isLoading: sessionLoading, error: sessionError } = useLiveSession(code);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [question, setQuestion] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [audio, setAudio] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Queue state
    const [joinResult, setJoinResult] = useState<JoinLiveQueueResult | null>(null);
    const [authorized, setAuthorized] = useState(false);

    // Reconnection state
    const [savedEntry, setSavedEntry] = useState<SavedQueueEntry | null>(null);
    const [reconnecting, setReconnecting] = useState(true);

    const joinMutation = useJoinLiveQueue();
    const leaveMutation = useLeaveLiveQueue();

    // Check localStorage for existing queue entry on mount
    useEffect(() => {
        const saved = loadQueueEntry(code);
        if (saved) {
            setSavedEntry(saved);
        }
        setReconnecting(false);
    }, [code]);

    // Real-time position tracking — use saved entry if reconnecting, otherwise fresh join
    const entryId = joinResult?.entry?.id || (savedEntry?.entryId ?? '');
    const sessionId = session?.id || (savedEntry?.sessionId ?? '');
    const isTrackingPosition = authorized || !!savedEntry;
    const { data: positionData } = useQueuePosition(
        isTrackingPosition ? entryId : '',
        isTrackingPosition ? sessionId : ''
    );

    // Handle reconnection: once position data arrives, decide if entry is still active
    useEffect(() => {
        if (!savedEntry || !positionData) return;

        const status = positionData.entryStatus;
        if (status === 'WAITING' || status === 'IN_PROGRESS') {
            // Entry still active — resume queue view
            if (!authorized) setAuthorized(true);
        } else {
            // Entry is done (COMPLETED, SKIPPED, RELEASED) — clear and show final state
            // Keep savedEntry so the state machine can show the right screen,
            // but clear localStorage so next visit starts fresh
            clearQueueEntry(code);
        }
    }, [savedEntry, positionData, authorized, code]);

    // Determine customer state
    const getCustomerState = (): CustomerState => {
        if (sessionLoading || reconnecting) return 'loading';
        if (sessionError || !session) return 'not-found';

        // Reconnected user — check position data
        if (savedEntry && !joinResult) {
            if (!positionData) return 'loading'; // still fetching position
            const st = positionData.entryStatus;
            if (st === 'COMPLETED') return 'completed';
            if (st === 'SKIPPED' || st === 'RELEASED') return 'released';
            if (positionData.sessionStatus === 'ENDED') return 'released';
            if (st === 'IN_PROGRESS') return 'in-progress';
            if (positionData.sessionStatus === 'PAUSED') return 'paused';
            return 'in-queue';
        }

        if (session.sessionStatus === 'ENDED') return 'ended';
        if (session.sessionStatus === 'PAUSED' && !authorized) return 'paused';

        if (!joinResult) return 'join-form';
        if (joinResult.clientSecret && !authorized) return 'authorizing';

        // After authorization, use real-time position data
        if (authorized && positionData) {
            if (positionData.sessionStatus === 'ENDED') return 'released';
            const st = positionData.entryStatus;
            if (st === 'COMPLETED') return 'completed';
            if (st === 'SKIPPED' || st === 'RELEASED') return 'released';
            if (st === 'IN_PROGRESS') return 'in-progress';
            if (positionData.sessionStatus === 'PAUSED') return 'paused';
            return 'in-queue';
        }

        if (authorized) return 'in-queue';
        return 'join-form';
    };

    const customerState = getCustomerState();

    // Handle photo upload
    const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const resized = await resizePhoto(file);
            setPhoto(resized);
            setPhotoPreview(resized);
        } catch {
            setFormError('Failed to process photo. Please try a different image.');
        }
    }, []);

    const removePhoto = useCallback(() => {
        setPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Handle form submit
    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!name.trim() || !email.trim() || (!question.trim() && !audio)) {
            setFormError('Please fill in all required fields (or record a voice question).');
            return;
        }
        if (!session) return;

        try {
            const result = await joinMutation.mutateAsync({
                sessionId: session.id,
                customerName: name.trim(),
                customerEmail: email.trim(),
                question: question.trim() || '(Voice recording)',
                photo: photo || undefined,
                audio: audio || undefined,
            });

            if (!result.success) {
                setFormError(result.message);
                return;
            }

            setJoinResult(result);
        } catch (err: any) {
            setFormError(err?.message || 'Failed to join queue. Please try again.');
        }
    };

    // Handle leaving queue
    const handleLeave = async () => {
        const eid = joinResult?.entry?.id || savedEntry?.entryId;
        const sid = joinResult?.entry?.sessionId || savedEntry?.sessionId;
        if (!eid || !sid) return;
        try {
            await leaveMutation.mutateAsync({ entryId: eid, sessionId: sid });
            setJoinResult(null);
            setAuthorized(false);
            setSavedEntry(null);
            clearQueueEntry(code);
        } catch {
            // ignore
        }
    };

    // ─── Renders ──────────────────────────────────

    // Loading
    if (customerState === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen" data-testid="live-loading">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
                    <p className="text-slate-400">Loading live session...</p>
                </div>
            </div>
        );
    }

    // Not found
    if (customerState === 'not-found') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-not-found">
                <div className="max-w-md w-full">
                    <SpiriVerseBrand />
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <AlertCircle className="w-12 h-12 text-red-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-2">Session Not Found</h2>
                                    <p className="text-sm text-slate-400">
                                        This live session link is not valid. Please check the link and try again.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Session ended (arrived late)
    if (customerState === 'ended') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-ended">
                <div className="max-w-md w-full">
                    <SpiriVerseBrand />
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <Clock className="w-12 h-12 text-slate-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-2">Session Has Ended</h2>
                                    <p className="text-sm text-slate-400">
                                        This live session has ended. Follow {session?.vendorName} for future sessions!
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Paused
    if (customerState === 'paused') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-paused">
                <div className="max-w-md w-full">
                    <SpiriVerseBrand />
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <Pause className="w-12 h-12 text-amber-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-2">Session Paused</h2>
                                    <p className="text-sm text-slate-400">
                                        {session?.vendorName}&apos;s session is currently paused. Please wait...
                                    </p>
                                    {authorized && positionData && (
                                        <p className="text-sm text-purple-400 mt-2">
                                            Your position: #{positionData.position} of {positionData.totalWaiting}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Join form
    if (customerState === 'join-form' && session) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-join-form">
                <div className="w-full max-w-lg space-y-6">
                    <SpiriVerseBrand />

                    {/* Header */}
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                            <span className="text-sm font-medium text-red-400 uppercase tracking-wide">Live</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white" data-testid="live-title">
                            {session.sessionTitle || `${session.vendorName}&apos;s Live Session`}
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">{session.vendorName}</p>
                    </div>

                    {/* Session info */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">
                                        {session.pricingMode === 'SERVICE' && session.serviceName
                                            ? session.serviceName
                                            : 'Reading'}
                                    </p>
                                    <p className="text-lg font-semibold text-white" data-testid="live-price">
                                        {formatAmount(session.price.amount, session.price.currency)} per reading
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-purple-400" data-testid="live-queue-count">
                                        {session.queueCount}
                                    </p>
                                    <p className="text-xs text-slate-400">in queue</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Join form */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-5">
                            <form onSubmit={handleJoin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-300">Your Name *</Label>
                                    <Input
                                        id="name"
                                        data-testid="join-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="bg-slate-800 border-slate-600 text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">Email *</Label>
                                    <Input
                                        id="email"
                                        data-testid="join-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="bg-slate-800 border-slate-600 text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="question" className="text-slate-300">Your Question *</Label>
                                    <Textarea
                                        id="question"
                                        data-testid="join-question"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder="Type your question, or use the mic to record it"
                                        className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
                                        required={!audio}
                                    />
                                    <AudioRecorder
                                        onRecordingComplete={(base64) => setAudio(base64)}
                                        onRecordingClear={() => setAudio(null)}
                                        maxDurationSeconds={60}
                                        label="Record your question"
                                    />
                                    {audio && !question.trim() && (
                                        <p className="text-xs text-slate-500">
                                            Voice recording attached. You can also type a brief summary above.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Photo (optional)</Label>
                                    {photoPreview ? (
                                        <div className="relative inline-block">
                                            <img
                                                src={photoPreview}
                                                alt="Upload preview"
                                                className="w-24 h-24 rounded-lg object-cover border border-slate-600"
                                                data-testid="join-photo-preview"
                                            />
                                            <button
                                                type="button"
                                                onClick={removePhoto}
                                                className="absolute -top-2 -right-2 bg-slate-700 rounded-full p-1 hover:bg-slate-600"
                                                data-testid="join-photo-remove"
                                            >
                                                <X className="h-3 w-3 text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-600 rounded-lg hover:border-slate-500"
                                            data-testid="join-photo-btn"
                                        >
                                            <ImagePlus className="h-4 w-4" />
                                            Add a photo
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                </div>

                                {formError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm" data-testid="join-error">
                                        {formError}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    data-testid="join-submit-btn"
                                    disabled={joinMutation.isPending}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
                                >
                                    {joinMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Joining...
                                        </>
                                    ) : (
                                        'Join Queue'
                                    )}
                                </Button>

                                <p className="text-center text-xs text-slate-500">
                                    Your card will be authorized for {formatAmount(session.price.amount, session.price.currency)}.
                                    You will only be charged if your reading is completed.
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Authorization step
    if (customerState === 'authorizing' && joinResult?.clientSecret && joinResult?.entry) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-authorizing">
                <div className="w-full max-w-lg space-y-6">
                    <SpiriVerseBrand />

                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white">Authorize Payment</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Your card will be held for {formatAmount(joinResult.entry.amount.amount, joinResult.entry.amount.currency)}
                        </p>
                    </div>

                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-5">
                            <Elements
                                stripe={stripePromise}
                                options={{
                                    clientSecret: joinResult.clientSecret,
                                    appearance: {
                                        theme: 'night',
                                        variables: { colorPrimary: '#7c3aed' },
                                    },
                                }}
                            >
                                <AuthorizationForm
                                    amount={joinResult.entry.amount.amount}
                                    currency={joinResult.entry.amount.currency}
                                    onSuccess={() => {
                                        setAuthorized(true);
                                        // Save to localStorage for reconnection
                                        if (joinResult.entry) {
                                            saveQueueEntry(code, {
                                                entryId: joinResult.entry.id,
                                                sessionId: joinResult.entry.sessionId,
                                                question: joinResult.entry.question,
                                                amount: joinResult.entry.amount,
                                            });
                                        }
                                    }}
                                />
                            </Elements>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // In queue
    if (customerState === 'in-queue') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-in-queue">
                <div className="max-w-md w-full space-y-6">
                    <SpiriVerseBrand />

                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re in the Queue!</h1>
                        <p className="text-sm text-slate-400">{session?.vendorName}&apos;s live session</p>
                    </div>

                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <div>
                                    <p className="text-5xl font-bold text-purple-400" data-testid="queue-position">
                                        #{positionData?.position || joinResult?.entry?.position || '...'}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        of {positionData?.totalWaiting || '?'} waiting
                                    </p>
                                </div>

                                <div className="bg-slate-800 rounded-lg p-3 text-left">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your question</p>
                                    <p className="text-sm text-white">{joinResult?.entry?.question || savedEntry?.question}</p>
                                </div>

                                <p className="text-xs text-slate-500">
                                    Card authorized for {
                                        joinResult?.entry
                                            ? formatAmount(joinResult.entry.amount.amount, joinResult.entry.amount.currency)
                                            : savedEntry
                                                ? formatAmount(savedEntry.amount.amount, savedEntry.amount.currency)
                                                : ''
                                    }.
                                    You&apos;ll only be charged when your reading is completed.
                                </p>

                                <Button
                                    variant="outline"
                                    data-testid="leave-queue-btn"
                                    onClick={handleLeave}
                                    className="text-slate-400 border-slate-600 hover:bg-slate-800"
                                >
                                    Leave Queue
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // In progress
    if (customerState === 'in-progress') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-in-progress">
                <div className="max-w-md w-full">
                    <SpiriVerseBrand />
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <Radio className="w-8 h-8 text-purple-400 animate-pulse" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-2">Your Reading is In Progress!</h2>
                                    <p className="text-sm text-slate-400">
                                        {session?.vendorName} is doing your reading now.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Completed
    if (customerState === 'completed') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-completed">
                <div className="max-w-md w-full">
                    <SpiriVerseBrand />
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <CheckCircle className="w-12 h-12 text-green-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-2">Reading Complete!</h2>
                                    <p className="text-sm text-slate-400">
                                        {joinResult?.entry
                                            ? `${formatAmount(joinResult.entry.amount.amount, joinResult.entry.amount.currency)} has been charged.`
                                            : savedEntry
                                                ? `${formatAmount(savedEntry.amount.amount, savedEntry.amount.currency)} has been charged.`
                                                : 'Your reading is complete.'}
                                    </p>
                                    {joinResult?.entry?.readingAudioUrl && (
                                        <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                            <p className="text-xs text-purple-400 mb-2">Your Reading Recording</p>
                                            <AudioPlayback
                                                audioUrl={joinResult.entry.readingAudioUrl}
                                                label="Play Reading"
                                            />
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-400 mt-2">
                                        You&apos;ll receive a confirmation email shortly.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Released / Skipped
    if (customerState === 'released') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="live-released">
                <div className="max-w-md w-full">
                    <SpiriVerseBrand />
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <ShieldCheck className="w-12 h-12 text-blue-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-2">Card Not Charged</h2>
                                    <p className="text-sm text-slate-400">
                                        {positionData?.sessionStatus === 'ENDED'
                                            ? 'This session has ended. Your card has NOT been charged.'
                                            : 'The practitioner has moved on. Your card has NOT been charged.'}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-2">
                                        Your card authorization has been released.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
}
