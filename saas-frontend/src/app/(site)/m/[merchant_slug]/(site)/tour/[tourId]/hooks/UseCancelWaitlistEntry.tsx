import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CancelWaitlistInput {
    waitlistEntryId: string;
    sessionId: string;
    vendorId: string;
}

interface CancelWaitlistResponse {
    code: string;
    success: boolean;
    message: string;
}

const UseCancelWaitlistEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CancelWaitlistInput) => {
            const response = await gql<{
                cancel_waitlist_entry: CancelWaitlistResponse;
            }>(
                `mutation cancel_waitlist_entry(
                    $waitlistEntryId: ID!
                    $sessionId: ID!
                    $vendorId: ID!
                ) {
                    cancel_waitlist_entry(
                        waitlistEntryId: $waitlistEntryId
                        sessionId: $sessionId
                        vendorId: $vendorId
                    ) {
                        code
                        success
                        message
                    }
                }`,
                input
            );
            return response.cancel_waitlist_entry;
        },
        onSuccess: () => {
            // Invalidate waitlist status queries
            queryClient.invalidateQueries({ queryKey: ['waitlist-status'] });
            queryClient.invalidateQueries({ queryKey: ['my-waitlist-entries'] });
        }
    });
};

export default UseCancelWaitlistEntry;
