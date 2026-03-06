import { currency_amount_type } from "../0_shared/types";

export type PaymentLinkStatus = "SENT" | "VIEWED" | "PAID" | "EXPIRED" | "CANCELLED";

export type paymentLinkItem_type = {
    id: string;
    vendorId: string;
    vendorName: string;
    itemType: "CUSTOM" | "SERVICE" | "PRODUCT";
    // CUSTOM
    customDescription?: string;
    // SERVICE / PRODUCT
    sourceId?: string;
    sourceName?: string;
    // All types
    amount: currency_amount_type;
};

export type paymentLink_type = {
    id: string;
    createdBy: string;                 // userId (partition key)
    customerEmail: string;
    customerName?: string;
    items: paymentLinkItem_type[];
    totalAmount: currency_amount_type;
    linkStatus: PaymentLinkStatus;     // NOT "status" per CLAUDE.md
    expiresAt: string;
    expirationHours: number;           // 24, 48, 168, 720
    sentAt: string;
    viewedAt?: string;
    paidAt?: string;
    stripePaymentIntentId?: string;
    stripePaymentIntentSecret?: string;
    bookingIds?: string[];
    createdDate: string;
    modifiedDate?: string;
    modifiedBy?: string;
};
