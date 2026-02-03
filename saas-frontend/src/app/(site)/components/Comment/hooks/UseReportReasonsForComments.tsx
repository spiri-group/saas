'use client';

import { gql } from "@/lib/services/gql"
import { choice_option_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

export const KEY = "report-reasons-for-comments"

export const queryFn = async () => {
    const resp = await gql<{reportReasons: choice_option_type[]}>(
        `
        query get_reportReasons_for_comments($objectType: String!) {
            reportReasons(objectType: $objectType) {
                id
                defaultLabel
            }
        }
        `,
        { objectType: "Comments" }
    )    
    return resp.reportReasons;
}

const UseReportReasonsForComments = () => {
    return useQuery({
        queryKey: [KEY],
        queryFn: () => queryFn()
    });
}

export default UseReportReasonsForComments