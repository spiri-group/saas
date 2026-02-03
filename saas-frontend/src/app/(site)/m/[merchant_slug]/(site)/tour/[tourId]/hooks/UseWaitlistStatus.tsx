import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

interface WaitlistStatusInput {
    sessionRef: {
        id: string;
        partition: string[];
        container: string;
    };
    customerEmail?: string;
}

interface WaitlistStatusResponse {
    sessionId: string;
    totalInWaitlist: number;
    yourPosition: number | null;
    isInWaitlist: boolean;
}

const UseWaitlistStatus = (input: WaitlistStatusInput) => {
    return useQuery({
        queryKey: ['waitlist-status', input.sessionRef.id, input.customerEmail],
        queryFn: async () => {
            const response = await gql<{
                waitlistStatus: WaitlistStatusResponse;
            }>(
                `query waitlistStatus(
                    $sessionRef: RecordRefInput!
                    $customerEmail: String
                ) {
                    waitlistStatus(
                        sessionRef: $sessionRef
                        customerEmail: $customerEmail
                    ) {
                        sessionId
                        totalInWaitlist
                        yourPosition
                        isInWaitlist
                    }
                }`,
                input
            );
            return response.waitlistStatus;
        },
        enabled: !!input.sessionRef.id
    });
};

export default UseWaitlistStatus;
