import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseCancelBooking = (sessionRef: recordref_type) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: { bookingRef: recordref_type; vendorId: string; reason?: string }) => {
            const resp = await gql<{
                cancel_tour_booking: {
                    success: boolean;
                    message: string;
                }
            }>(`
                mutation CancelTourBooking($bookingRef: RecordRefInput!, $sessionRef: RecordRefInput!, $vendorId: ID!, $reason: String) {
                    cancel_tour_booking(bookingRef: $bookingRef, sessionRef: $sessionRef, vendorId: $vendorId, reason: $reason) {
                        success
                        message
                    }
                }
            `, {
                bookingRef: args.bookingRef,
                sessionRef,
                vendorId: args.vendorId,
                reason: args.reason || 'Cancelled by merchant'
            });
            return resp.cancel_tour_booking;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['session-header'] });
        }
    });
};

export default UseCancelBooking;
