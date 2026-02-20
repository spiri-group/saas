'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type JoinLiveQueueInput = {
    sessionId: string;
    customerName: string;
    customerEmail: string;
    question: string;
    photo?: string;
    audio?: string;
};

export type JoinLiveQueueResult = {
    code: string;
    success: boolean;
    message: string;
    entry: {
        id: string;
        sessionId: string;
        vendorId: string;
        customerName: string;
        customerEmail: string;
        question: string;
        photoUrl: string | null;
        audioUrl: string | null;
        readingAudioUrl: string | null;
        entryStatus: string;
        priority: number;
        position: number;
        amount: {
            amount: number;
            currency: string;
        };
        stripePaymentIntentSecret: string;
        joinedAt: string;
        startedAt: string | null;
        completedAt: string | null;
        skippedAt: string | null;
        releasedAt: string | null;
        createdDate: string;
    } | null;
    clientSecret: string | null;
};

export const useJoinLiveQueue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: JoinLiveQueueInput) => {
            const response = await gql<{
                joinLiveQueue: JoinLiveQueueResult;
            }>(`
                mutation JoinLiveQueue($input: JoinLiveQueueInput!) {
                    joinLiveQueue(input: $input) {
                        code
                        success
                        message
                        entry {
                            id
                            sessionId
                            vendorId
                            customerName
                            customerEmail
                            question
                            photoUrl
                            audioUrl
                            readingAudioUrl
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
                        clientSecret
                    }
                }
            `, { input });
            return response.joinLiveQueue;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['live-session-public'] });
        },
    });
};
