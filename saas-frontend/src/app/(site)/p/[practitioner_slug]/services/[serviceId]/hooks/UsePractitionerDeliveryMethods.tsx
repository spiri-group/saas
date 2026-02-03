'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface DeliveryMethodsConfig {
    online: {
        enabled: boolean;
        defaultMeetingLink?: string;
    };
    atPractitionerLocation: {
        enabled: boolean;
        displayArea?: string;
    };
    mobile: {
        enabled: boolean;
        serviceRadiusKm?: number;
        travelSurcharge?: {
            amount: number;
            currency: string;
        };
    };
}

interface PractitionerScheduleResponse {
    deliveryMethods: DeliveryMethodsConfig;
}

export const usePractitionerDeliveryMethods = (practitionerId: string | undefined) => {
    return useQuery({
        queryKey: ['practitioner-delivery-methods', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                myPractitionerSchedule: PractitionerScheduleResponse | null;
            }>(`
                query PractitionerDeliveryMethods($practitionerId: ID!) {
                    myPractitionerSchedule(practitionerId: $practitionerId) {
                        deliveryMethods {
                            online {
                                enabled
                                defaultMeetingLink
                            }
                            atPractitionerLocation {
                                enabled
                                displayArea
                            }
                            mobile {
                                enabled
                                serviceRadiusKm
                                travelSurcharge {
                                    amount
                                    currency
                                }
                            }
                        }
                    }
                }
            `, { practitionerId });

            return response.myPractitionerSchedule?.deliveryMethods || null;
        },
        enabled: !!practitionerId,
    });
};
