import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'order-refund-policy';

export type RefundPolicyReasonTierType = {
    id: string,
    daysUpTo: number,
    refundPercentage: number
}

export type RefundPolicyForOrderType = {
    id: string,
    title: string,
    listingType: string,
    country: string,
    reasons: {
        id: string,
        code: string,
        title: string,
        confirmed: boolean,
        no_refund: boolean,
        whoPayShipping: string,
        tiers: RefundPolicyReasonTierType[],
        conditions: {
            id: string,
            title: string,
            code: string,
            isCustom: boolean,
            description: string
        }[]
    }[]
}

export const queryFn = async (orderId: string) => {
    const resp = await gql<{
        orderRefundPolicy: RefundPolicyForOrderType
    }>(`query orderRefundPolicy($orderId: ID!) {
        orderRefundPolicy(orderId: $orderId) {
            id
            title
            listingType
            country
            reasons {
                id
                code
                title
                confirmed
                no_refund
                whoPayShipping
                tiers {
                    id
                    daysUpTo
                    refundPercentage
                }
                conditions {
                    id
                    code
                    isCustom
                    title
                    description
                }
            }
        }
    }`,
        {
            orderId: orderId
        }
    );

    return resp.orderRefundPolicy;
}

const useOrderRefundPolicy = (orderId: string) => {
    return useQuery({
        queryKey: [key, orderId],
        queryFn: () => queryFn(orderId),
        enabled: !!orderId
    });
}

export default useOrderRefundPolicy;