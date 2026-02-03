import { gql } from "@/lib/services/gql";
import { booking_type, recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type CheckInResponse = {
    code: string;
    success: boolean;
    message: string;
    booking: booking_type;
};

const checkInBooking = async (
    bookingCode: string,
    sessionId: string,
    vendorId: string
): Promise<CheckInResponse> => {
    const resp = await gql<{
        check_in_booking: CheckInResponse;
    }>(
        `
            mutation CheckInBooking($bookingCode: String!, $sessionId: ID!, $vendorId: ID!) {
                check_in_booking(bookingCode: $bookingCode, sessionId: $sessionId, vendorId: $vendorId) {
                    code
                    success
                    message
                    booking {
                        id
                        code
                        checkedIn {
                            datetime
                        }
                        ticketStatus
                        customerEmail
                        user {
                            firstname
                            lastname
                        }
                    }
                }
            }
        `,
        { bookingCode, sessionId, vendorId }
    );

    return resp.check_in_booking;
};

const UseCheckInBooking = (sessionRef?: recordref_type) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            bookingCode,
            sessionId,
            vendorId,
        }: {
            bookingCode: string;
            sessionId: string;
            vendorId: string;
        }) => checkInBooking(bookingCode, sessionId, vendorId),
        onSuccess: (data, variables) => {
            // Invalidate the booking query to refresh data
            queryClient.invalidateQueries({
                queryKey: ["booking-by-code", variables.bookingCode, variables.vendorId],
            });
            // Also invalidate session bookings to refresh the list
            if (sessionRef) {
                queryClient.invalidateQueries({
                    queryKey: ["session-bookings", sessionRef],
                });
            }
        },
    });
};

export default UseCheckInBooking;
