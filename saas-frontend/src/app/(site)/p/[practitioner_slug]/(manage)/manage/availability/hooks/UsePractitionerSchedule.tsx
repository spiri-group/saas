'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface TimeSlotLocation {
    id: string;
    formattedAddress: string;
}

export interface TimeSlotConfig {
    id: string;
    start: string;
    end: string;
    location?: TimeSlotLocation | null;
}

export interface PractitionerWeekday {
    day: number;
    dayName: string;
    enabled: boolean;
    timeSlots: TimeSlotConfig[];
}

export interface DateOverrideTimeSlot {
    start: string;
    end: string;
    location?: TimeSlotLocation | null;
}

export interface DateOverride {
    date: string;
    type: 'BLOCKED' | 'CUSTOM';
    timeSlots?: DateOverrideTimeSlot[];
    reason?: string;
}

export interface GooglePlace {
    id?: string;
    formattedAddress?: string;
}

export interface CurrencyAmount {
    amount: number;
    currency: string;
}

export interface OnlineDeliverySettings {
    enabled: boolean;
    defaultMeetingLink?: string;
}

export interface AtPractitionerDeliverySettings {
    enabled: boolean;
    location?: GooglePlace;
    displayArea?: string;
}

export interface MobileDeliverySettings {
    enabled: boolean;
    serviceRadiusKm?: number;
    travelSurcharge?: CurrencyAmount;
    baseLocation?: GooglePlace;
}

export interface DeliveryMethodsConfig {
    online: OnlineDeliverySettings;
    atPractitionerLocation: AtPractitionerDeliverySettings;
    mobile: MobileDeliverySettings;
}

export interface PractitionerSchedule {
    id: string;
    practitionerId: string;
    timezone: string;
    country: string;
    weekdays: PractitionerWeekday[];
    dateOverrides: DateOverride[];
    serviceIds: string[];
    bufferMinutes: number;
    advanceBookingDays: number;
    minimumNoticeHours: number;
    deliveryMethods: DeliveryMethodsConfig;
}

export const usePractitionerSchedule = (practitionerId: string | undefined) => {
    return useQuery({
        queryKey: ['practitioner-schedule', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                myPractitionerSchedule: PractitionerSchedule | null;
            }>(`
                query MyPractitionerSchedule($practitionerId: ID!) {
                    myPractitionerSchedule(practitionerId: $practitionerId) {
                        id
                        practitionerId
                        timezone
                        country
                        weekdays {
                            day
                            dayName
                            enabled
                            timeSlots {
                                id
                                start
                                end
                                location {
                                    id
                                    formattedAddress
                                }
                            }
                        }
                        dateOverrides {
                            date
                            type
                            timeSlots {
                                start
                                end
                                location {
                                    id
                                    formattedAddress
                                }
                            }
                            reason
                        }
                        serviceIds
                        bufferMinutes
                        advanceBookingDays
                        minimumNoticeHours
                        deliveryMethods {
                            online {
                                enabled
                                defaultMeetingLink
                            }
                            atPractitionerLocation {
                                enabled
                                location {
                                    id
                                    formattedAddress
                                }
                                displayArea
                            }
                            mobile {
                                enabled
                                serviceRadiusKm
                                travelSurcharge {
                                    amount
                                    currency
                                }
                                baseLocation {
                                    id
                                    formattedAddress
                                }
                            }
                        }
                    }
                }
            `, { practitionerId });

            return response.myPractitionerSchedule;
        },
        enabled: !!practitionerId,
    });
};
