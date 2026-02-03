'use client';

import { gql } from "@/lib/services/gql";

import { recordref_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";

const key = 'services-calendar';

const queryFn = async ( merchantId: string, startDt: DateTime, endDt: DateTime, serviceIds?: string[]) => {

    const servicesCalendarQuery = await gql<{
        servicesCalendar: {
            date: string,
            occurences: {
                time: {
                    start: string, 
                    end: string, 
                    duration_ms: number
                },
                services: {
                    name: string,
                    ref: recordref_type,
                    scheduleId: string
                }
            }[]
        }[]
    }>( 
        ` query get_services_calendar($start: Date!, $end: Date!, $merchantId: ID!, $serviceIds: [ID!]) {
            servicesCalendar(start: $start, end: $end, merchantId: $merchantId, $serviceIds) {
                date,
                occurences {
                    time {
                        start
                        end
                        duration_ms
                    }
                }
            }
        }
        `,
    {
        merchantId: merchantId,
        start: startDt.toISODate(),
        end: endDt.toISODate(),
        serviceIds
    })
    
    return servicesCalendarQuery.servicesCalendar;
}

const UseServicesCalendar = (merchantId: string, startDt: DateTime, endDt: DateTime, serviceIds?: string[]) => {
    return useQuery({
        queryKey: [key, merchantId, startDt, endDt, serviceIds],
        queryFn: () => queryFn(merchantId, startDt, endDt, serviceIds)
    })
}

export default UseServicesCalendar