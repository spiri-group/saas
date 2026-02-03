'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ScheduledBooking } from './UsePendingBookings';

interface ConfirmBookingInput {
    practitionerId: string;
    bookingId: string;
    meetingLink?: string;
    meetingPasscode?: string;
}

interface ConfirmBookingResponse {
    confirmBooking: ScheduledBooking;
}

export const useConfirmBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, bookingId, meetingLink, meetingPasscode }: ConfirmBookingInput) => {
            const response = await gql<ConfirmBookingResponse>(`
                mutation ConfirmBooking(
                    $practitionerId: ID!
                    $bookingId: ID!
                    $meetingLink: String
                    $meetingPasscode: String
                ) {
                    confirmBooking(
                        practitionerId: $practitionerId
                        bookingId: $bookingId
                        meetingLink: $meetingLink
                        meetingPasscode: $meetingPasscode
                    ) {
                        id
                        confirmationStatus
                        meetingLink
                        meetingPasscode
                        scheduledDateTime {
                            date
                            time {
                                start
                                end
                            }
                            practitionerTimezone
                        }
                    }
                }
            `, { practitionerId, bookingId, meetingLink, meetingPasscode });

            return response.confirmBooking;
        },
        onSuccess: (_, variables) => {
            // Invalidate pending and upcoming bookings queries
            queryClient.invalidateQueries({ queryKey: ['pending-booking-confirmations', variables.practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-bookings', variables.practitionerId] });
        }
    });
};
