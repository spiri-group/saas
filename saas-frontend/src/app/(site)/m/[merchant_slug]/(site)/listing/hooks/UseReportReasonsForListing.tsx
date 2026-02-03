'use client';

import { gql } from "@/lib/services/gql"
import { choice_option_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

export const KEY = "report-reasons-for-listing"

export const queryFn = async (id: string, vendorId: string) => {
    const resp = await gql<{listing: {reportReasons: choice_option_type[]}}>(
        `
        query get_reportReasons_for_listing($id: String!, $vendorId: String!) {
            listing(id: $id, vendorId: $vendorId) {
                id
                reportReasons(defaultLocale: "EN") {
                    id
                    defaultLabel
                }
            }
        }
        `,
        { id, vendorId }
    )    
    return resp.listing.reportReasons;
}

const UseReportReasonsForListing = (id: string, vendorId :string) => {
    return useQuery({
        queryKey: [KEY, id, vendorId],
        queryFn: () => queryFn(id, vendorId)
    });
}

export default UseReportReasonsForListing