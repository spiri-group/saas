'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface AvailableSlot {
    start: string;
    end: string;
    startUtc: string;
    endUtc: string;
}

export interface AvailableDay {
    date: string;
    dayName: string;
    slots: AvailableSlot[];
}

export const useAvailableSlots = (
    vendorId: string | undefined,
    serviceId: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined,
    customerTimezone?: string,
    deliveryMethod?: string
) => {
    return useQuery({
        queryKey: ['available-slots', vendorId, serviceId, startDate, endDate, customerTimezone, deliveryMethod],
        queryFn: async () => {
            const response = await gql<{
                availableSlots: AvailableDay[];
            }>(`
                query AvailableSlots(
                    $vendorId: ID!
                    $serviceId: ID!
                    $startDate: Date!
                    $endDate: Date!
                    $customerTimezone: String
                    $deliveryMethod: String
                ) {
                    availableSlots(
                        vendorId: $vendorId
                        serviceId: $serviceId
                        startDate: $startDate
                        endDate: $endDate
                        customerTimezone: $customerTimezone
                        deliveryMethod: $deliveryMethod
                    ) {
                        date
                        dayName
                        slots {
                            start
                            end
                            startUtc
                            endUtc
                        }
                    }
                }
            `, {
                vendorId,
                serviceId,
                startDate,
                endDate,
                customerTimezone,
                deliveryMethod
            });

            return response.availableSlots;
        },
        enabled: !!vendorId && !!serviceId && !!startDate && !!endDate,
    });
};
