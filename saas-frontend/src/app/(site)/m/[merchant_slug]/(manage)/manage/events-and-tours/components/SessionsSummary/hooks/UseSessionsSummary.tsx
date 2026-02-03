import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";
import {DateTime} from "luxon";

const key = 'sessions-summary';

const queryFn = async (from: DateTime, to: DateTime, merchantId?: string, tourId?: string) => {
    if (merchantId == null) return null;

    const resp = await gql<{
        sessionsSummary: {
            date: string,
            numberOfSessions: number,
            attendanceRate: number,
            overallCapacity: number
        }[]
    }>( `query get_sessions($from: DateTime!, $to: DateTime!, $vendorId: ID!, $listingId: ID) {
              sessionsSummary(from: $from, to: $to, vendorId: $vendorId, listingId: $listingId) {
                date
                numberOfSessions
                attendanceRate
                overallCapacity
              }
          }
        `,
        {
            from: from.toISO(), to: to.toISO(),
            vendorId: merchantId,
            listingId: tourId
        }
    )
    return resp.sessionsSummary;
}

const UseSessionsSummary = (from: DateTime, to: DateTime, merchantId?: string, tourId?: string) => {
    return useQuery({
        queryKey: [key, merchantId, from, to, merchantId, tourId],
        queryFn: () => queryFn(from, to, merchantId, tourId)
    });
}

export default UseSessionsSummary