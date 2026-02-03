'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface ScheduledBooking {
    id: string;
    customerId: string;
    customerEmail: string;
    vendorId: string;
    confirmationStatus: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
    orderStatus: string;
    deliveryMethod: 'ONLINE' | 'AT_PRACTITIONER' | 'MOBILE';
    scheduledDateTime: {
        date: string;
        time: {
            start: string;
            end: string;
        };
        practitionerTimezone: string;
        customerTimezone?: string;
    };
    service: {
        id: string;
        name: string;
        vendor: {
            id: string;
            name: string;
            slug: string;
        };
    };
    price?: {
        amount: number;
        currency: string;
    };
    meetingLink?: string;
    meetingPasscode?: string;
    practitionerAddress?: string;
    confirmationDeadline?: string;
    rejectionReason?: string;
    cancellationReason?: string;
    cancelledBy?: string;
    ref: {
        id: string;
        partition: string[];
        container: string;
    };
}

export const useScheduledBookings = (customerId: string | undefined) => {
    return useQuery({
        queryKey: ['service-bookings', 'scheduled', customerId],
        queryFn: async () => {
            const response = await gql<{
                myScheduledBookings: ScheduledBooking[];
            }>(`
                query MyScheduledBookings($customerId: ID!) {
                    myScheduledBookings(customerId: $customerId) {
                        id
                        customerId
                        customerEmail
                        vendorId
                        confirmationStatus
                        orderStatus
                        deliveryMethod
                        scheduledDateTime {
                            date
                            time {
                                start
                                end
                            }
                            practitionerTimezone
                            customerTimezone
                        }
                        service {
                            id
                            name
                            vendor {
                                id
                                name
                                slug
                            }
                        }
                        price {
                            amount
                            currency
                        }
                        meetingLink
                        meetingPasscode
                        practitionerAddress
                        confirmationDeadline
                        rejectionReason
                        cancellationReason
                        cancelledBy
                        ref {
                            id
                            partition
                            container
                        }
                    }
                }
            `, { customerId });

            return response.myScheduledBookings;
        },
        enabled: !!customerId,
    });
};
