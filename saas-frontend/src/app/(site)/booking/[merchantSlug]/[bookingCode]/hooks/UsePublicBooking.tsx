import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export interface PublicBookingDetails {
    code: string;
    tourName: string;
    sessionDate: string;
    sessionTime?: {
        from?: string;
        to?: string;
    };
    tickets: {
        variantName: string;
        quantity: number;
        price: {
            amount: number;
            currency: string;
        };
    }[];
    totalAmount?: {
        amount: number;
        currency: string;
    };
    canCancel: boolean;
    cancellationDeadline?: string;
    cancellationPolicy?: {
        title?: string;
        fullRefundHours?: number;
        partialRefundHours?: number;
        partialRefundPercentage?: number;
        refundPercentage?: number;
    };
    ticketStatus: string;
    merchantName?: string;
    merchantSlug?: string;
}

const UsePublicBooking = (bookingCode: string, merchantSlug: string) => {
    return useQuery({
        queryKey: ["public-booking", bookingCode, merchantSlug],
        queryFn: async () => {
            const response = await gql<{
                publicBookingByCode: PublicBookingDetails | null;
            }>(`
                query PublicBookingByCode($code: String!, $merchantSlug: String!) {
                    publicBookingByCode(code: $code, merchantSlug: $merchantSlug) {
                        code
                        tourName
                        sessionDate
                        sessionTime {
                            from
                            to
                        }
                        tickets {
                            variantName
                            quantity
                            price {
                                amount
                                currency
                            }
                        }
                        totalAmount {
                            amount
                            currency
                        }
                        canCancel
                        cancellationDeadline
                        cancellationPolicy {
                            title
                            fullRefundHours
                            partialRefundHours
                            partialRefundPercentage
                            refundPercentage
                        }
                        ticketStatus
                        merchantName
                        merchantSlug
                    }
                }
            `, {
                code: bookingCode,
                merchantSlug
            });
            return response.publicBookingByCode;
        },
        enabled: !!bookingCode && !!merchantSlug,
        retry: 1
    });
};

export default UsePublicBooking;
