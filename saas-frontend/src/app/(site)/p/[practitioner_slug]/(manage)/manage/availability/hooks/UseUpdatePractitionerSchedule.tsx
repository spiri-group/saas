'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { PractitionerSchedule, PractitionerWeekday, DeliveryMethodsConfig } from './UsePractitionerSchedule';

export interface PractitionerScheduleInput {
    timezone: string;
    country: string;
    weekdays: PractitionerWeekday[];
    serviceIds?: string[];
    bufferMinutes?: number;
    advanceBookingDays?: number;
    minimumNoticeHours?: number;
    deliveryMethods: DeliveryMethodsConfig;
}

export const useUpdatePractitionerSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, input }: { practitionerId: string; input: PractitionerScheduleInput }) => {
            const response = await gql<{
                updatePractitionerSchedule: PractitionerSchedule;
            }>(`
                mutation UpdatePractitionerSchedule($practitionerId: ID!, $input: PractitionerScheduleInput!) {
                    updatePractitionerSchedule(practitionerId: $practitionerId, input: $input) {
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
            `, { practitionerId, input });

            return response.updatePractitionerSchedule;
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['practitioner-schedule', variables.practitionerId], data);
        },
    });
};

export interface DateOverrideTimeSlotInput {
    start: string;
    end: string;
    location?: { id: string; formattedAddress: string } | null;
}

export interface DateOverrideInput {
    date: string;
    type: 'BLOCKED' | 'CUSTOM';
    timeSlots?: DateOverrideTimeSlotInput[];
    reason?: string;
}

export const useSetPractitionerDateOverride = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, input }: { practitionerId: string; input: DateOverrideInput }) => {
            const response = await gql<{
                setPractitionerDateOverride: PractitionerSchedule;
            }>(`
                mutation SetPractitionerDateOverride($practitionerId: ID!, $input: DateOverrideInput!) {
                    setPractitionerDateOverride(practitionerId: $practitionerId, input: $input) {
                        id
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
                    }
                }
            `, { practitionerId, input });

            return response.setPractitionerDateOverride;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-schedule', variables.practitionerId] });
        },
    });
};

export const useRemovePractitionerDateOverride = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ practitionerId, date }: { practitionerId: string; date: string }) => {
            const response = await gql<{
                removePractitionerDateOverride: PractitionerSchedule;
            }>(`
                mutation RemovePractitionerDateOverride($practitionerId: ID!, $date: Date!) {
                    removePractitionerDateOverride(practitionerId: $practitionerId, date: $date) {
                        id
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
                    }
                }
            `, { practitionerId, date });

            return response.removePractitionerDateOverride;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-schedule', variables.practitionerId] });
        },
    });
};
