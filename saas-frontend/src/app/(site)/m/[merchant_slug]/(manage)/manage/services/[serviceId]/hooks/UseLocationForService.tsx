'use client'; 

import { gql } from "@/lib/services/gql";
import { scheduleServiceConfiguration_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "sessions-for-date";

export const queryFn = async (merchantId: string, scheduleId: string) => {

    const resp = await gql<{
        location: scheduleServiceConfiguration_type
    }>(
        `query get_location($id: ID!, $merchantId: ID!) {
            serviceScheduleConfiguration(id: $id, merchantId: $merchantId) {
                location {
                    inPerson {
                        place {
                            formattedAddress
                        }
                    }
                }
            }
        }
        `,
        { 
            id: scheduleId,
            merchantId: merchantId
        }
    )    
    return resp.location;
}

const UseLocationForService = (merchantId: string, scheduleId: string) => {
    return useQuery({
        queryKey: [KEY, merchantId, scheduleId],
        queryFn: () => queryFn(merchantId, scheduleId)
    });
}

export default UseLocationForService;