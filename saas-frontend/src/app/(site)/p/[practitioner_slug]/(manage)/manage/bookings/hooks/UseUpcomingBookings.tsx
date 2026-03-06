'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ScheduledBooking } from './UsePendingBookings';

export const useUpcomingBookings = (practitionerId: string | undefined) => {
    return useQuery({
        queryKey: ['upcoming-bookings', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                upcomingBookings: ScheduledBooking[];
            }>(`
                query UpcomingBookings($practitionerId: ID!) {
                    upcomingBookings(practitionerId: $practitionerId) {
                        id
                        service {
                            id
                            name
                        }
                        customer {
                            id
                            name
                            email
                        }
                        confirmationStatus
                        deliveryMethod
                        scheduledDateTime {
                            date
                            time {
                                start
                                end
                            }
                            practitionerTimezone
                        }
                        meetingLink
                        meetingPasscode
                        customerAddress {
                            formattedAddress
                        }
                        practitionerAddress
                        payment {
                            amount
                            currency
                        }
                        createdAt
                    }
                }
            `, { practitionerId });

            return response.upcomingBookings || [];
        },
        enabled: !!practitionerId,
    });
};
