'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export const usePauseLiveSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (args: { sessionId: string; vendorId: string }) => {
            const response = await gql<{
                pauseLiveSession: { code: string; success: boolean; message: string; session: any };
            }>(`
                mutation PauseLiveSession($sessionId: ID!, $vendorId: ID!) {
                    pauseLiveSession(sessionId: $sessionId, vendorId: $vendorId) {
                        code
                        success
                        message
                        session { id sessionStatus pausedAt }
                    }
                }
            `, args);
            return response.pauseLiveSession;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['live-sessions', vars.vendorId] });
        },
    });
};

export const useResumeLiveSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (args: { sessionId: string; vendorId: string }) => {
            const response = await gql<{
                resumeLiveSession: { code: string; success: boolean; message: string; session: any };
            }>(`
                mutation ResumeLiveSession($sessionId: ID!, $vendorId: ID!) {
                    resumeLiveSession(sessionId: $sessionId, vendorId: $vendorId) {
                        code
                        success
                        message
                        session { id sessionStatus }
                    }
                }
            `, args);
            return response.resumeLiveSession;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['live-sessions', vars.vendorId] });
        },
    });
};

export const useEndLiveSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (args: { sessionId: string; vendorId: string }) => {
            const response = await gql<{
                endLiveSession: { code: string; success: boolean; message: string; session: any };
            }>(`
                mutation EndLiveSession($sessionId: ID!, $vendorId: ID!) {
                    endLiveSession(sessionId: $sessionId, vendorId: $vendorId) {
                        code
                        success
                        message
                        session { id sessionStatus endedAt }
                    }
                }
            `, args);
            return response.endLiveSession;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['live-sessions', vars.vendorId] });
        },
    });
};

export const useStartReading = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (args: { entryId: string; sessionId: string }) => {
            const response = await gql<{
                startReading: { code: string; success: boolean; message: string; entry: any };
            }>(`
                mutation StartReading($entryId: ID!, $sessionId: ID!) {
                    startReading(entryId: $entryId, sessionId: $sessionId) {
                        code
                        success
                        message
                        entry { id entryStatus startedAt }
                    }
                }
            `, args);
            return response.startReading;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['live-queue', vars.sessionId] });
        },
    });
};

export const useCompleteReading = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (args: { entryId: string; sessionId: string; readingAudio?: string; spreadPhoto?: string }) => {
            const response = await gql<{
                completeReading: { code: string; success: boolean; message: string; entry: any };
            }>(`
                mutation CompleteReading($entryId: ID!, $sessionId: ID!, $readingAudio: String, $spreadPhoto: String) {
                    completeReading(entryId: $entryId, sessionId: $sessionId, readingAudio: $readingAudio, spreadPhoto: $spreadPhoto) {
                        code
                        success
                        message
                        entry { id entryStatus completedAt readingAudioUrl spreadPhotoUrl }
                    }
                }
            `, args);
            return response.completeReading;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['live-queue', vars.sessionId] });
            queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
        },
    });
};

export const useSkipReading = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (args: { entryId: string; sessionId: string }) => {
            const response = await gql<{
                skipReading: { code: string; success: boolean; message: string; entry: any };
            }>(`
                mutation SkipReading($entryId: ID!, $sessionId: ID!) {
                    skipReading(entryId: $entryId, sessionId: $sessionId) {
                        code
                        success
                        message
                        entry { id entryStatus skippedAt }
                    }
                }
            `, args);
            return response.skipReading;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['live-queue', vars.sessionId] });
        },
    });
};
