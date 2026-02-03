import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { stripe_details_type, media_type } from "@/utils/spiriverse";

type MerchantRefundRequest = {
    id: string;
    orderId: string;
    userId: string;
    vendorId: string;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    refund_status: string;
    requestedAt: string;
    decisionAt?: string;
    decidedBy?: string;
    evidencePhotos?: media_type[];
    evidenceVideos?: media_type[];
    lines: {
        id: string;
        descriptor: string;
        price: {
            amount: number;
            currency: string;
        };
        quantity: number;
        refund_quantity: number;
        refund_status: string | null;
    }[];
    returnShippingEstimate?: {
        id: string;
        cost: {
            amount: number;
            currency: string;
        };
        whoPayShipping: string;
        status: string;
    };
    returnShippingLabels?: {
        label_id: string;
        tracking_number: string;
        carrier_code: string;
        service_code: string;
        label_download: {
            pdf: string;
            png: string;
            zpl: string;
        };
    }[];
    stripe?: stripe_details_type;
    order: {
        id: string;
        code: string;
        customerEmail: string;
        createdDate: string;
    };
};

const useMerchantRefunds = (merchantId: string, status: string[] = ["PENDING", "IN_PROGRESS", "APPROVED"]) => {
    return useQuery({
        queryKey: ['merchantRefunds', merchantId, status],
        queryFn: async () => {
            const resp = await gql<{
                refunds: MerchantRefundRequest[]
            }>(`query getMerchantRefunds($vendorId: ID!, $status: [String!]) {
                refunds(vendorId: $vendorId, status: $status) {
                    id
                    orderId
                    userId
                    vendorId
                    amount
                    currency
                    reason
                    status
                    refund_status
                    requestedAt
                    decisionAt
                    decidedBy
                    evidencePhotos {
                        name
                        url
                        urlRelative
                        type
                        size
                    }
                    evidenceVideos {
                        name
                        url
                        urlRelative
                        type
                        size
                        sizeBytes
                        durationSeconds
                    }
                    lines {
                        id
                        descriptor
                        price {
                            amount
                            currency
                        }
                        quantity
                        refund_quantity
                        refund_status
                    }
                    returnShippingEstimate {
                        id
                        cost {
                            amount
                            currency
                        }
                        whoPayShipping
                        status
                    }
                    returnShippingLabels {
                        label_id
                        tracking_number
                        carrier_code
                        service_code
                        label_download {
                            pdf
                            png
                            zpl
                        }
                    }
                    stripe {
                        accountId
                        setupIntentId
                        setupIntentSecret
                        totalDue {
                            amount
                            currency
                        }
                    }
                    order {
                        id
                        code
                        customerEmail
                        createdDate
                    }
                }
            }`, { vendorId: merchantId, status });
            
            return resp.refunds;
        },
        enabled: !!merchantId
    });
};

export default useMerchantRefunds;
export type { MerchantRefundRequest };