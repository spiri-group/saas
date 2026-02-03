'use client';

import { useMutation } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface BookScheduledServiceInput {
    vendorId: string;
    serviceId: string;
    customerId: string;
    customerEmail: string;
    date: string;
    startTime: string;
    endTime: string;
    customerTimezone: string;
    deliveryMethod: string;
    customerAddress?: {
        formatted_address?: string;
        place_id?: string;
        name?: string;
        lat?: number;
        lng?: number;
    };
    questionnaireResponses?: Array<{
        questionId: string;
        question: string;
        answer: string;
    }>;
    selectedAddOns?: string[];
}

export interface BookScheduledServiceResponse {
    code: string;
    success: boolean;
    message: string;
    booking?: {
        id: string;
        confirmationStatus: string;
        confirmationDeadline: string;
        deliveryMethod: string;
        scheduledDateTime: {
            date: string;
            time: {
                start: string;
                end: string;
            };
            practitionerTimezone: string;
        };
    };
    clientSecret?: string;
}

export const useBookScheduledService = () => {
    return useMutation({
        mutationFn: async (input: BookScheduledServiceInput) => {
            const response = await gql<{
                bookScheduledService: BookScheduledServiceResponse;
            }>(`
                mutation BookScheduledService($input: BookScheduledServiceInput!) {
                    bookScheduledService(input: $input) {
                        code
                        success
                        message
                        booking {
                            id
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
                        }
                        clientSecret
                    }
                }
            `, { input });

            return response.bookScheduledService;
        },
    });
};
