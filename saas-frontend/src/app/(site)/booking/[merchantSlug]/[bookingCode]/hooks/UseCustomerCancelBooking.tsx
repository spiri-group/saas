import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CustomerCancelBookingResponse {
    code: string;
    success: boolean;
    message: string;
    refundAmount?: {
        amount: number;
        currency: string;
    };
    refundPercentage?: number;
    refundInitiated: boolean;
}

interface CancelBookingVariables {
    bookingCode: string;
    customerEmail: string;
    merchantSlug: string;
}

const UseCustomerCancelBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: CancelBookingVariables) => {
            const response = await gql<{
                customer_cancel_booking: CustomerCancelBookingResponse;
            }>(`
                mutation CustomerCancelBooking($bookingCode: String!, $customerEmail: String!, $merchantSlug: String!) {
                    customer_cancel_booking(bookingCode: $bookingCode, customerEmail: $customerEmail, merchantSlug: $merchantSlug) {
                        code
                        success
                        message
                        refundAmount {
                            amount
                            currency
                        }
                        refundPercentage
                        refundInitiated
                    }
                }
            `, {
                bookingCode: variables.bookingCode,
                customerEmail: variables.customerEmail,
                merchantSlug: variables.merchantSlug
            });
            return response.customer_cancel_booking;
        },
        onSuccess: (_, variables) => {
            // Invalidate the booking query to refetch updated status
            queryClient.invalidateQueries({
                queryKey: ["public-booking", variables.bookingCode, variables.merchantSlug]
            });
        }
    });
};

export default UseCustomerCancelBooking;
