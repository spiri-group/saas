import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface WaitlistTicketPreference {
    variantId: string;
    quantity: number;
    notes?: string;
}

interface JoinWaitlistInput {
    sessionRef: {
        id: string;
        partition: string[];
        container: string;
    };
    tourId: string;
    vendorId: string;
    customerEmail: string;
    ticketPreferences: WaitlistTicketPreference[];
}

interface WaitlistEntry {
    id: string;
    sessionRef: {
        id: string;
        partition: string[];
        container: string;
    };
    customerEmail: string;
    positionInQueue: number;
    dateJoined: string;
    notificationStatus: string;
    ref: {
        id: string;
        partition: string[];
        container: string;
    };
}

interface JoinWaitlistResponse {
    code: string;
    success: boolean;
    message: string;
    waitlistEntry: WaitlistEntry | null;
    queuePosition: number | null;
    estimatedNotification: string | null;
}

const UseJoinWaitlist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: JoinWaitlistInput) => {
            const response = await gql<{
                join_tour_waitlist: JoinWaitlistResponse;
            }>(
                `mutation join_tour_waitlist(
                    $sessionRef: RecordRefInput!
                    $tourId: ID!
                    $vendorId: ID!
                    $customerEmail: String!
                    $ticketPreferences: [WaitlistTicketPreferenceInput!]!
                ) {
                    join_tour_waitlist(
                        sessionRef: $sessionRef
                        tourId: $tourId
                        vendorId: $vendorId
                        customerEmail: $customerEmail
                        ticketPreferences: $ticketPreferences
                    ) {
                        code
                        success
                        message
                        waitlistEntry {
                            id
                            sessionRef {
                                id
                                partition
                                container
                            }
                            customerEmail
                            positionInQueue
                            dateJoined
                            notificationStatus
                            ref {
                                id
                                partition
                                container
                            }
                        }
                        queuePosition
                        estimatedNotification
                    }
                }`,
                input
            );
            return response.join_tour_waitlist;
        },
        onSuccess: () => {
            // Invalidate waitlist status queries
            queryClient.invalidateQueries({ queryKey: ['waitlist-status'] });
            queryClient.invalidateQueries({ queryKey: ['my-waitlist-entries'] });
        }
    });
};

export default UseJoinWaitlist;
