import { gql } from "@/lib/services/gql";
import { booking_type } from "@/utils/spiriverse";
import { useMutation } from "@tanstack/react-query";

interface SessionBookingInput {
    ref: {
        id: string;
        partition: string[];
        container: string;
    };
    tickets: {
        variantId: string;
        quantity: number;
    }[];
}

interface CreateTourBookingInput {
    customerEmail: string;
    merchantId: string;
    sessions: SessionBookingInput[];
}

// Extended booking type with stripe details for checkout
interface BookingWithStripe extends booking_type {
    stripe?: {
        paymentIntentId?: string;
        paymentIntentSecret?: string;
        accountId?: string;
    };
    totalAmount?: {
        amount: number;
        currency: string;
    };
}

const UseCreateTourBooking = () => {
    return useMutation({
        mutationFn: async (input: CreateTourBookingInput) => {
            const response = await gql<{
                create_tour_booking: {
                    success: boolean;
                    message: string;
                    bookings: BookingWithStripe[];
                };
            }>(
                `mutation create_tour_booking(
                    $customerEmail: String!
                    $merchantId: String!
                    $sessions: [SessionBookingInput]!
                ) {
                    create_tour_booking(
                        customerEmail: $customerEmail
                        merchantId: $merchantId
                        sessions: $sessions
                    ) {
                        success
                        message
                        bookings {
                            id
                            code
                            userId
                            customerEmail
                            orderId
                            ticketStatus {
                                code
                                label
                            }
                            ref {
                                id
                                partition
                                container
                            }
                            payment_link
                            stripe {
                                paymentIntentId
                                paymentIntentSecret
                                accountId
                            }
                            totalAmount {
                                amount
                                currency
                            }
                        }
                    }
                }`,
                input
            );
            return response.create_tour_booking;
        }
    });
};

export default UseCreateTourBooking;
