import { vendor_type } from "../vendor/types"

export enum VendorLifecycleStage {
    CREATED = "CREATED",
    STRIPE_ONBOARDING = "STRIPE_ONBOARDING",
    FIRST_PAYOUT = "FIRST_PAYOUT",
    CARD_ADDED = "CARD_ADDED",
    PUBLISHED = "PUBLISHED",
    BILLING_ACTIVE = "BILLING_ACTIVE",
    BILLING_FAILED = "BILLING_FAILED",
    BILLING_BLOCKED = "BILLING_BLOCKED"
}

/**
 * Computes the lifecycle stage for a vendor based on their current state.
 * Priority order (highest to lowest):
 *   BILLING_BLOCKED > BILLING_FAILED > BILLING_ACTIVE > PUBLISHED >
 *   CARD_ADDED > FIRST_PAYOUT > STRIPE_ONBOARDING > CREATED
 */
export function computeLifecycleStage(vendor: vendor_type): VendorLifecycleStage {
    const sub = vendor.subscription

    if (sub?.payouts_blocked) {
        return VendorLifecycleStage.BILLING_BLOCKED
    }
    if (sub?.payment_status === "failed") {
        return VendorLifecycleStage.BILLING_FAILED
    }
    if (sub?.payment_status === "success" && sub?.next_billing_date) {
        return VendorLifecycleStage.BILLING_ACTIVE
    }
    if ((vendor as any).publishedAt) {
        return VendorLifecycleStage.PUBLISHED
    }
    if (sub?.card_status === "saved") {
        return VendorLifecycleStage.CARD_ADDED
    }
    if (sub?.first_payout_received) {
        return VendorLifecycleStage.FIRST_PAYOUT
    }
    if (vendor.stripe?.accountId) {
        return VendorLifecycleStage.STRIPE_ONBOARDING
    }
    return VendorLifecycleStage.CREATED
}
