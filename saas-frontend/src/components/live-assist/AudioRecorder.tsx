'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';

type Props = {
    onRecordingComplete: (audioBase64: string, transcription?: string) => void;
    onRecordingClear?: () => void;
    maxDurationSeconds?: number;
    showTranscription?: boolean;
    className?: string;
    label?: string;
};

export default function AudioRecorder({
    onRecordingComplete,
    onRecordingClear,
    maxDurationSeconds = 120,
    showTranscription = false,
    className = '',
    label = 'Record',
}: Props) {
    const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const startRecording = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());

                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setState('recorded');

                // Convert to base64
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    onRecordingComplete(base64);
                };
                reader.readAsDataURL(blob);
            };

            mediaRecorder.start(1000);
            setState('recording');
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= maxDurationSeconds - 1) {
                        stopRecording();
                        return prev + 1;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch {
            setError('Microphone access denied. Please allow microphone access and try again.');
        }
    }, [maxDurationSeconds, onRecordingComplete]);

    const stopRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const playRecording = useCallback(() => {
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setState('playing');
        audio.onended = () => setState('recorded');
        audio.play();
    }, [audioUrl]);

    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setState('recorded');
    }, []);

    const clearRecording = useCallback(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setState('idle');
        setDuration(0);
        onRecordingClear?.();
    }, [audioUrl, onRecordingClear]);

    return (
        <div className={className}>
            {error && (
                <p className="text-xs text-red-400 mb-2">{error}</p>
            )}

            {state === 'idle' && (
                <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-600 rounded-lg hover:border-purple-500/50 hover:text-purple-300 transition-colors"
                    data-testid="audio-record-btn"
                >
                    <Mic className="h-4 w-4" />
                    {label}
                </button>
            )}

            {state === 'recording' && (
                <div className="flex items-center gap-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-400 font-mono tabular-nums">{formatTime(duration)}</span>
                    <span className="text-xs text-slate-400 flex-1">
                        {duration < maxDurationSeconds
                            ? 'Recording...'
                            : 'Max length reached'}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={stopRecording}
                        className="h-7 px-2 text-red-400 border-red-500/30 hover:bg-red-500/20"
                        data-testid="audio-stop-btn"
                    >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
                    </Button>
                </div>
            )}

            {(state === 'recorded' || state === 'playing') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg">
                    <button
                        type="button"
                        onClick={state === 'playing' ? stopPlayback : playRecording}
                        className="h-7 w-7 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                        data-testid="audio-play-btn"
                    >
                        {state === 'playing'
                            ? <Pause className="h-3 w-3" />
                            : <Play className="h-3 w-3 ml-0.5" />}
                    </button>
                    <span className="text-sm text-slate-300 font-mono tabular-nums">{formatTime(duration)}</span>
                    <span className="text-xs text-slate-500 flex-1">Voice recording</span>
                    <button
                        type="button"
                        onClick={clearRecording}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        data-testid="audio-clear-btn"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Minimal playback-only component for the practitioner to hear customer voice questions
// or for the customer to replay their reading
export function AudioPlayback({
    audioUrl,
    label = 'Listen',
    className = '',
}: {
    audioUrl: string;
    label?: string;
    className?: string;
}) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const toggle = () => {
        if (!audioRef.current) {
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.onended = () => setPlaying(false);
        }

        if (playing) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlaying(false);
        } else {
            audioRef.current.play();
            setPlaying(true);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <button
            type="button"
            onClick={toggle}
            className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors ${
                playing
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-700/50 text-slate-400 hover:text-purple-300 border border-slate-600'
            } ${className}`}
            data-testid="audio-playback-btn"
        >
            {playing
                ? <Pause className="h-3 w-3" />
                : <Play className="h-3 w-3" />}
            {label}
        </button>
    );
}
