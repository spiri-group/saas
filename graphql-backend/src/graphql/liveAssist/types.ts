import { currency_amount_type } from "../0_shared/types";

export type LiveSessionStatus = "ACTIVE" | "PAUSED" | "ENDED";
export type QueueEntryStatus = "WAITING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "RELEASED";

export const LIVE_ASSIST_CONTAINER = "Main-LiveAssist";
export const DOC_TYPE_SESSION = "live-session";
export const DOC_TYPE_QUEUE_ENTRY = "live-queue-entry";

export type live_recommendation_type = {
    message: string;                        // "Book a deeper 1:1 session with me"
    recommendedServiceId?: string;          // practitioner's own service
    recommendedServiceName?: string;        // denormalized for display
    recommendedProductId?: string;          // any merchant's product
    recommendedProductName?: string;        // denormalized for display
    recommendedProductVendorId?: string;    // product's vendor (may differ from session vendor)
};

export type liveSession_type = {
    id: string;
    partitionKey: string;           // = vendorId (generic partition key)
    docType: "live-session";
    vendorId: string;
    code: string;                   // 8-char shareable code (URL: /live/{code})
    sessionTitle?: string;          // optional title shown to viewers
    sessionStatus: LiveSessionStatus;
    // Pricing
    pricingMode: "CUSTOM" | "SERVICE";
    customPrice?: currency_amount_type;    // when CUSTOM
    serviceId?: string;                     // when SERVICE — link to existing service
    serviceName?: string;
    servicePrice?: currency_amount_type;
    // Default CTA — auto-applied to all readings unless overridden
    defaultCta?: live_recommendation_type;
    // Stats
    totalJoined: number;
    totalCompleted: number;
    totalRevenue: number;           // cents
    // Timestamps
    startedAt: string;
    pausedAt?: string;
    endedAt?: string;
    createdDate: string;
    modifiedDate?: string;
};

export type liveQueueEntry_type = {
    id: string;
    partitionKey: string;           // = sessionId (generic partition key)
    docType: "live-queue-entry";
    sessionId: string;
    vendorId: string;               // denormalized for Stripe lookups
    // Customer
    customerName: string;
    customerEmail: string;
    question: string;
    photoUrl?: string;              // base64 data URI for MVP
    audioUrl?: string;              // base64 data URI - customer voice question
    readingAudioUrl?: string;       // base64 data URI - practitioner recorded reading
    spreadPhotoUrl?: string;        // base64 data URI - practitioner's card spread photo
    // Post-reading recommendation (overrides session defaultCta if set)
    recommendation?: live_recommendation_type;
    practitionerNote?: string;      // personal note to customer
    // Queue
    entryStatus: QueueEntryStatus;
    priority: number;               // Date.now() — FIFO ordering
    position: number;               // initial position at join time
    // Payment
    amount: currency_amount_type;
    stripePaymentIntentId: string;
    stripePaymentIntentSecret: string;
    // Timestamps
    joinedAt: string;
    startedAt?: string;             // when practitioner starts reading
    completedAt?: string;
    skippedAt?: string;
    releasedAt?: string;
    createdDate: string;
};
