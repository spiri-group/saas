'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface CancelBookingInput {
    bookingId: string;
    reason?: string;
}

export interface CancelBookingResponse {
    code: string;
    success: boolean;
    message: string;
    booking?: {
        id: string;
        confirmationStatus: string;
        cancelledDate: string;
        cancelledBy: string;
        cancellationReason?: string;
    };
}

export const useCancelBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CancelBookingInput) => {
            const response = await gql<{
                cancelScheduledBooking: CancelBookingResponse;
            }>(`
                mutation CancelScheduledBooking($bookingId: ID!, $cancelledBy: String!, $reason: String) {
                    cancelScheduledBooking(bookingId: $bookingId, cancelledBy: $cancelledBy, reason: $reason) {
                        code
                        success
                        message
                        booking {
                            id
                            confirmationStatus
                            cancelledDate
                            cancelledBy
                            cancellationReason
                        }
                    }
                }
            `, {
                bookingId: input.bookingId,
                cancelledBy: 'PRACTITIONER',
                reason: input.reason
            });

            return response.cancelScheduledBooking;
        },
        onSuccess: () => {
            // Invalidate booking queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
        },
    });
};
