'use client';

import { useState, useEffect, useCallback } from "react";

type QueuedCheckIn = {
    bookingCode: string;
    sessionId: string;
    vendorId: string;
    timestamp: number;
};

const QUEUE_KEY = "spiri-offline-checkin-queue";

/**
 * Queues check-ins when offline and replays them when back online.
 */
const useOfflineCheckIn = (
    onlineCheckIn: (params: { bookingCode: string; sessionId: string; vendorId: string }) => Promise<any>
) => {
    const [queue, setQueue] = useState<QueuedCheckIn[]>([]);
    const [isReplaying, setIsReplaying] = useState(false);

    // Load queue from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) setQueue(JSON.parse(stored));
        } catch {
            // localStorage unavailable
        }
    }, []);

    // Save queue to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch {
            // localStorage unavailable
        }
    }, [queue]);

    // Replay queued check-ins when coming back online
    const replayQueue = useCallback(async () => {
        if (queue.length === 0 || isReplaying) return;
        setIsReplaying(true);

        const remaining: QueuedCheckIn[] = [];
        for (const item of queue) {
            try {
                await onlineCheckIn({
                    bookingCode: item.bookingCode,
                    sessionId: item.sessionId,
                    vendorId: item.vendorId,
                });
            } catch {
                remaining.push(item);
            }
        }
        setQueue(remaining);
        setIsReplaying(false);
    }, [queue, isReplaying, onlineCheckIn]);

    // Auto-replay when coming back online
    useEffect(() => {
        const handleOnline = () => {
            if (queue.length > 0) replayQueue();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [queue, replayQueue]);

    const addToQueue = useCallback((params: { bookingCode: string; sessionId: string; vendorId: string }) => {
        setQueue(prev => [...prev, { ...params, timestamp: Date.now() }]);
    }, []);

    return {
        queue,
        queueLength: queue.length,
        isReplaying,
        addToQueue,
        replayQueue,
    };
};

export default useOfflineCheckIn;
