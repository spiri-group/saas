'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface CancelScheduledBookingInput {
    bookingId: string;
    cancelledBy: 'CUSTOMER' | 'PRACTITIONER';
    reason?: string;
}

export interface CancelScheduledBookingResponse {
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

export const useCancelScheduledBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CancelScheduledBookingInput) => {
            const response = await gql<{
                cancelScheduledBooking: CancelScheduledBookingResponse;
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
                cancelledBy: input.cancelledBy,
                reason: input.reason
            });

            return response.cancelScheduledBooking;
        },
        onSuccess: () => {
            // Invalidate booking queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
        },
    });
};
