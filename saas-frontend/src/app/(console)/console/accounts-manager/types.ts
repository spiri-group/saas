export type VendorLifecycleStage =
    | 'CREATED'
    | 'STRIPE_ONBOARDING'
    | 'FIRST_PAYOUT'
    | 'CARD_ADDED'
    | 'PUBLISHED'
    | 'BILLING_ACTIVE'
    | 'BILLING_FAILED'
    | 'BILLING_BLOCKED';

export type VendorDocType = 'MERCHANT' | 'PRACTITIONER';

export interface ConsoleVendorAccount {
    id: string;
    name: string;
    slug: string;
    docType: VendorDocType;
    lifecycleStage: VendorLifecycleStage;
    publishedAt?: string;
    createdDate?: string;
    subscription?: {
        plans?: { productId: string; variantId: string; price: { amount: number; currency: string }; name: string }[];
        next_billing_date?: string;
        billing_interval?: string;
        billing_history?: BillingRecord[];
        payment_status?: string;
        card_status?: string;
        payouts_blocked?: boolean;
        last_payment_date?: string;
        payment_retry_count?: number;
        discountPercent?: number;
        waived?: boolean;
        waivedUntil?: string;
        overrideNotes?: string;
    };
    stripe?: {
        customerId?: string;
        accountId?: string;
    };
}

export interface BillingRecord {
    id: string;
    date: string;
    amount: number;
    currency: string;
    billingStatus: string;
    stripePaymentIntentId?: string;
    error?: string;
    period_start: string;
    period_end: string;
}

export interface ConsoleCustomerAccount {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    spiritualInterests?: string[];
    vendorCount: number;
    orderCount: number;
    createdDate?: string;
}

export interface ConsoleVendorAccountsResponse {
    vendors: ConsoleVendorAccount[];
    totalCount: number;
    hasMore: boolean;
}

export interface ConsoleCustomerAccountsResponse {
    customers: ConsoleCustomerAccount[];
    totalCount: number;
    hasMore: boolean;
}

export interface MutationResponse {
    code: string;
    success: boolean;
    message: string;
}

export interface VendorAccountFilters {
    search?: string;
    docTypes?: VendorDocType[];
    lifecycleStages?: VendorLifecycleStage[];
}

export interface CustomerAccountFilters {
    search?: string;
}

export interface SubscriptionOverrideInput {
    discountPercent?: number | null;
    waived?: boolean;
    waivedUntil?: string | null;
    overrideNotes?: string | null;
}
