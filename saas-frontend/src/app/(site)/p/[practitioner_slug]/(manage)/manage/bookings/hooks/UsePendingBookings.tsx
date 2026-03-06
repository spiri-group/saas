'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface ScheduledBooking {
    id: string;
    service: {
        id: string;
        name: string;
    };
    customer: {
        id: string;
        name: string;
        email: string;
    };
    confirmationStatus: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';
    confirmationDeadline?: string;
    deliveryMethod: 'ONLINE' | 'AT_PRACTITIONER' | 'MOBILE';
    scheduledDateTime: {
        date: string;
        time: {
            start: string;
            end: string;
        };
        practitionerTimezone: string;
    };
    meetingLink?: string;
    meetingPasscode?: string;
    customerAddress?: {
        formattedAddress?: string;
    };
    practitionerAddress?: string;
    questionnaireResponses?: Array<{
        questionId: string;
        question: string;
        answer: string;
    }>;
    payment?: {
        amount: number;
        currency: string;
    };
    createdAt: string;
}

export const usePendingBookings = (practitionerId: string | undefined) => {
    return useQuery({
        queryKey: ['pending-booking-confirmations', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                pendingBookingConfirmations: ScheduledBooking[];
            }>(`
                query PendingBookingConfirmations($practitionerId: ID!) {
                    pendingBookingConfirmations(practitionerId: $practitionerId) {
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
                        confirmationDeadline
                        deliveryMethod
                        scheduledDateTime {
                            date
                            time {
                                start
                                end
                            }
                            practitionerTimezone
                        }
                        questionnaireResponses {
                            questionId
                            question
                            answer
                        }
                        payment {
                            amount
                            currency
                        }
                        createdAt
                    }
                }
            `, { practitionerId });

            return response.pendingBookingConfirmations || [];
        },
        enabled: !!practitionerId,
    });
};
