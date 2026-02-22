'use client';

import { gql } from '@/lib/services/gql';
import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';

export type LiveQueueEntryData = {
    id: string;
    sessionId: string;
    vendorId: string;
    customerName: string;
    customerEmail: string;
    question: string;
    photoUrl: string | null;
    audioUrl: string | null;
    readingAudioUrl: string | null;
    spreadPhotoUrl: string | null;
    practitionerNote: string | null;
    recommendation: {
        message: string;
        recommendedServiceId: string | null;
        recommendedServiceName: string | null;
        recommendedProductId: string | null;
        recommendedProductName: string | null;
    } | null;
    entryStatus: string;
    priority: number;
    position: number;
    amount: { amount: number; currency: string };
    joinedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    skippedAt: string | null;
    releasedAt: string | null;
    createdDate: string;
};

export const useLiveQueue = (sessionId: string) => {
    return useRealTimeQueryList<LiveQueueEntryData>({
        queryKey: ['live-queue', sessionId],
        queryFn: async () => {
            const response = await gql<{
                liveQueue: LiveQueueEntryData[];
            }>(`
                query LiveQueue($sessionId: ID!) {
                    liveQueue(sessionId: $sessionId) {
                        id
                        sessionId
                        vendorId
                        customerName
                        customerEmail
                        question
                        photoUrl
                        audioUrl
                        readingAudioUrl
                        spreadPhotoUrl
                        practitionerNote
                        recommendation {
                            message
                            recommendedServiceId
                            recommendedServiceName
                            recommendedProductId
                            recommendedProductName
                        }
                        entryStatus
                        priority
                        position
                        amount {
                            amount
                            currency
                        }
                        joinedAt
                        startedAt
                        completedAt
                        skippedAt
                        releasedAt
                        createdDate
                    }
                }
            `, { sessionId });
            return response.liveQueue;
        },
        realtimeEvent: 'liveQueueEntry',
        selectId: (entry) => entry.id,
        signalRGroup: `live-session-${sessionId}`,
        enabled: !!sessionId,
    });
};
