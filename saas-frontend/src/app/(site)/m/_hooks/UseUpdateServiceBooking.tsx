import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UpdateServiceBookingInput = {
    bookingId: string;
    customerId: string;
    action: "CANCEL";
    reason?: string;
};

const useUpdateServiceBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateServiceBookingInput) => {
            const resp = await gql<{
                update_service_booking: {
                    code: string;
                    success: boolean;
                    message: string;
                    booking: any;
                    refundAmount?: number;
                    refundPercentage?: number;
                };
            }>(`
                mutation UpdateServiceBooking($input: UpdateServiceBookingInput!) {
                    update_service_booking(input: $input) {
                        code
                        success
                        message
                        booking {
                            id
                            status
                        }
                        refundAmount
                        refundPercentage
                    }
                }
            `, { input });

            return resp.update_service_booking;
        },
        onSuccess: () => {
            // Invalidate service bookings queries
            queryClient.invalidateQueries({ queryKey: ['serviceBookings'] });
            queryClient.invalidateQueries({ queryKey: ['customerServiceOrders'] });
        }
    });
};

export default useUpdateServiceBooking;
