'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ScheduledBooking } from './UsePendingBookings';

interface RejectBookingInput {
    practitionerId: string;
    bookingId: string;
    reason: string;
}

interface RejectBookingResponse {
    rejectBooking: ScheduledBooking;
}

export const useRejectBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, bookingId, reason }: RejectBookingInput) => {
            const response = await gql<RejectBookingResponse>(`
                mutation RejectBooking(
                    $practitionerId: ID!
                    $bookingId: ID!
                    $reason: String!
                ) {
                    rejectBooking(
                        practitionerId: $practitionerId
                        bookingId: $bookingId
                        reason: $reason
                    ) {
                        id
                        confirmationStatus
                        rejectionReason
                    }
                }
            `, { practitionerId, bookingId, reason });

            return response.rejectBooking;
        },
        onSuccess: (_, variables) => {
            // Invalidate pending bookings query
            queryClient.invalidateQueries({ queryKey: ['pending-booking-confirmations', variables.practitionerId] });
        }
    });
};
