import { order_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import { RefundPolicyForOrderType, RefundPolicyReasonTierType } from "./UseOrderRefundPolicy";

export type RefundEligibilityResult = {
    isEligible: boolean;
    eligibleReasons: EligibleReason[];
    orderAgeDays: number;
}

export type EligibleReason = {
    id: string;
    code: string;
    title: string;
    confirmed: boolean;
    no_refund: boolean;
    whoPayShipping: string;
    applicableTier: {
        id: string;
        daysUpTo: number;
        refundPercentage: number;
    } | null;
    conditions: {
        id: string;
        title: string;
        code: string;
        isCustom: boolean;
        description: string;
    }[];
}

const useRefundEligibility = (order: order_type, refundPolicy?: RefundPolicyForOrderType): RefundEligibilityResult => {
    const orderDate = DateTime.fromISO(order.createdDate);
    const orderAgeDays = Math.abs(orderDate.diffNow('days').days);

    if (!refundPolicy) {
        return {
            isEligible: false,
            eligibleReasons: [],
            orderAgeDays
        };
    }

    const eligibleReasons: EligibleReason[] = [];

    refundPolicy.reasons.forEach(reason => {
        if (reason.no_refund) {
            return;
        }

        let applicableTier: RefundPolicyReasonTierType | null = null;

        const sortedTiers = reason.tiers
            .slice()
            .sort((a, b) => a.daysUpTo - b.daysUpTo);

        for (const tier of sortedTiers) {
            if (orderAgeDays <= tier.daysUpTo) {
                applicableTier = tier;
                break;
            }
        }

        if (applicableTier && applicableTier.refundPercentage > 0) {
            eligibleReasons.push({
                id: reason.id,
                code: reason.code,
                title: reason.title,
                confirmed: reason.confirmed,
                no_refund: reason.no_refund,
                whoPayShipping: reason.whoPayShipping,
                applicableTier,
                conditions: reason.conditions
            });
        }
    });

    return {
        isEligible: eligibleReasons.length > 0,
        eligibleReasons,
        orderAgeDays
    };
};

export default useRefundEligibility;