'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useRealTimeQuery } from '@/components/utils/RealTime/useRealTimeQuery';

export type QueuePositionData = {
    entryId: string;
    entryStatus: string;
    position: number;
    totalWaiting: number;
    sessionStatus: string;
};

export const useQueuePosition = (entryId: string, sessionId: string) => {
    return useRealTimeQuery<QueuePositionData>({
        queryKey: ['live-queue-position', entryId, sessionId],
        queryFn: async () => {
            const response = await gql<{
                liveQueuePosition: QueuePositionData;
            }>(`
                query LiveQueuePosition($entryId: ID!, $sessionId: ID!) {
                    liveQueuePosition(entryId: $entryId, sessionId: $sessionId) {
                        entryId
                        entryStatus
                        position
                        totalWaiting
                        sessionStatus
                    }
                }
            `, { entryId, sessionId });
            return response.liveQueuePosition;
        },
        realtimeEvent: 'liveQueueEntry',
        selectId: (data) => data?.entryId || entryId,
        signalRGroup: `live-session-${sessionId}`,
        enabled: !!entryId && !!sessionId,
        refetchInterval: 15000, // also poll every 15s as fallback
    });
};

export const useLeaveLiveQueue = () => {
    return {
        mutateAsync: async (args: { entryId: string; sessionId: string }) => {
            const response = await gql<{
                leaveLiveQueue: { code: string; success: boolean; message: string };
            }>(`
                mutation LeaveLiveQueue($entryId: ID!, $sessionId: ID!) {
                    leaveLiveQueue(entryId: $entryId, sessionId: $sessionId) {
                        code
                        success
                        message
                    }
                }
            `, args);
            return response.leaveLiveQueue;
        },
    };
};
