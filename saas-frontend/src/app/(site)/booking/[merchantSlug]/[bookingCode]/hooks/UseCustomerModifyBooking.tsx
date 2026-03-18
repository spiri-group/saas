import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CustomerModifyBookingResponse {
    code: string;
    success: boolean;
    message: string;
    refundAmount?: { amount: number; currency: string };
    additionalCharge?: { amount: number; currency: string };
    updatedTickets?: { variantName: string; quantity: number; price: { amount: number; currency: string } }[];
}

interface ModifyBookingVariables {
    bookingCode: string;
    customerEmail: string;
    merchantSlug: string;
    ticketChanges: { variantId: string; newQuantity: number }[];
}

const UseCustomerModifyBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: ModifyBookingVariables) => {
            const response = await gql<{
                customer_modify_booking: CustomerModifyBookingResponse;
            }>(`
                mutation CustomerModifyBooking($bookingCode: String!, $customerEmail: String!, $merchantSlug: String!, $ticketChanges: [CustomerTicketChangeInput!]!) {
                    customer_modify_booking(bookingCode: $bookingCode, customerEmail: $customerEmail, merchantSlug: $merchantSlug, ticketChanges: $ticketChanges) {
                        code
                        success
                        message
                        refundAmount { amount currency }
                        additionalCharge { amount currency }
                        updatedTickets { variantName quantity price { amount currency } }
                    }
                }
            `, variables);
            return response.customer_modify_booking;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["public-booking", variables.bookingCode, variables.merchantSlug]
            });
        }
    });
};

export default UseCustomerModifyBooking;
