import { recordref_type, currency_amount_type, googleplace_type } from "../0_shared/types"
import { vendor_type } from "../vendor/types"
import { service_type } from "../service/types"

// Workflow status for featuring requests
// Using requestStatus (NOT status) to avoid Cosmos soft-delete conflict per CLAUDE.md
export enum FeaturingRequestStatus {
    PENDING = "PENDING",        // Merchant sent request, awaiting practitioner response
    ACCEPTED = "ACCEPTED",      // Practitioner accepted, relationship is active
    REJECTED = "REJECTED",      // Practitioner rejected the request
    EXPIRED = "EXPIRED",        // Request timed out (e.g., 7 days)
    TERMINATED = "TERMINATED"   // Either party ended an active relationship
}

export enum FeaturingType {
    FULL_PROFILE = "FULL_PROFILE",          // Feature entire practitioner profile + all services
    SELECTED_SERVICES = "SELECTED_SERVICES"  // Feature only specific services
}

// Schedule types for featuring relationships
export type featuring_schedule_weekday_type = {
    day: number;           // 0=Sunday, 6=Saturday
    dayName: string;
    enabled: boolean;
    timeSlots: { start: string; end: string }[];
}

export type featuring_schedule_type = {
    scheduleMode: "PRACTITIONER_DEFAULT" | "STORE_SPECIFIC";
    timezone: string;
    weekdays?: featuring_schedule_weekday_type[];
    dateOverrides?: {
        date: string;
        type: "BLOCKED" | "CUSTOM";
        timeSlots?: { start: string; end: string }[];
        reason?: string;
    }[];
    bufferMinutes?: number;
    advanceBookingDays?: number;
}

export type featuring_delivery_context_type = {
    inStore: boolean;
    online: boolean;
    storeLocation?: googleplace_type;
}

export type featuring_service_price_override_type = {
    serviceId: string;
    serviceName: string;       // denormalized
    overrideType: "FIXED" | "HOURLY";
    fixedPrice?: currency_amount_type;
    ratePerHour?: currency_amount_type;
}

export type featuring_relationship_type = {
    id: string;                              // Format: "feat_{merchantId}_{practitionerId}"
    docType: "FEATURING_RELATIONSHIP";

    // Parties involved
    merchantId: string;
    practitionerId: string;

    // Denormalized info for efficient display (avoids joins)
    merchantName: string;
    merchantSlug: string;
    merchantLogo?: string;
    practitionerName: string;
    practitionerSlug: string;
    practitionerHeadline?: string;
    practitionerAvatar?: string;

    // Featuring configuration
    featuringType: FeaturingType;
    featuredServiceIds?: string[];           // Only populated when type is SELECTED_SERVICES

    // Revenue share stored as basis points for precision
    // Example: 1500 = 15.00%, 500 = 5.00%
    merchantRevenueShareBps: number;         // What merchant gets from referrals
    practitionerRevenueShareBps: number;     // 10000 - merchantRevenueShareBps (auto-calculated)

    // Request workflow - CRITICAL: Using requestStatus, NOT status
    requestStatus: FeaturingRequestStatus;
    requestedAt: string;                     // ISO timestamp
    respondedAt?: string;                    // When practitioner responded
    terminatedAt?: string;                   // When relationship was terminated
    terminatedBy?: "MERCHANT" | "PRACTITIONER";
    terminationReason?: string;

    // Request/response messages
    requestMessage?: string;                 // Merchant's message when requesting
    responseMessage?: string;                // Practitioner's message when responding

    // Store-specific schedule, delivery, and pricing
    storeSchedule?: featuring_schedule_type;
    deliveryContext?: featuring_delivery_context_type;
    servicePriceOverrides?: featuring_service_price_override_type[];

    // Display preferences for shopfront
    displayOrder?: number;                   // Ordering in featured section (lower = higher)
    highlighted?: boolean;                   // Special highlighting on shopfront

    // Timestamps
    createdAt: string;
    updatedAt: string;

    // Cosmos record reference
    ref?: recordref_type;
}

// Input type for creating a featuring request
export type create_featuring_request_input = {
    practitionerId: string;
    featuringType: FeaturingType;
    featuredServiceIds?: string[];           // Required when type is SELECTED_SERVICES
    merchantRevenueShareBps: number;         // Proposed merchant share (e.g., 1500 for 15%)
    requestMessage?: string;
}

// Input type for practitioner responding to a request
export type respond_featuring_request_input = {
    relationshipId: string;
    accept: boolean;
    responseMessage?: string;
}

// Input type for updating an active featuring relationship
export type update_featuring_relationship_input = {
    relationshipId: string;
    featuredServiceIds?: string[];           // Change which services are featured
    merchantRevenueShareBps?: number;        // Renegotiate share (requires mutual agreement)
    displayOrder?: number;
    highlighted?: boolean;
}

// Input type for configuring store schedule
export type configure_featuring_schedule_input = {
    relationshipId: string;
    storeSchedule: featuring_schedule_type;
}

// Input type for configuring store-specific pricing
export type configure_featuring_pricing_input = {
    relationshipId: string;
    servicePriceOverrides: featuring_service_price_override_type[];
}

// Input type for configuring delivery context
export type configure_featuring_delivery_input = {
    relationshipId: string;
    deliveryContext: featuring_delivery_context_type;
}

// Resolved types for frontend queries
export type featured_practitioner_type = {
    relationship: featuring_relationship_type;
    practitioner: vendor_type;
    services: service_type[];                // All or selected services based on featuringType
}

export type featured_service_type = {
    relationship: featuring_relationship_type;
    service: service_type;
    practitioner: vendor_type;
}

// Response type for mutations
export type featuring_request_response = {
    code: string;
    success: boolean;
    message: string;
    relationship?: featuring_relationship_type;
}

// Enriched practitioner with service info for discovery
export type discovered_practitioner_type = {
    practitioner: vendor_type;
    serviceCount: number;
    priceRange?: {
        min: { amount: number; currency: string };
        max: { amount: number; currency: string };
    };
}

// Type for practitioner discovery (browsing available practitioners)
export type practitioner_discovery_response = {
    practitioners: discovered_practitioner_type[];
    totalCount: number;
    hasMore: boolean;
}

// Type to track featuring source on orders (added to order line)
export type featuring_source_type = {
    relationshipId: string;
    merchantId: string;
    merchantName: string;
    merchantSlug: string;
    merchantRevenueShareBps: number;
    practitionerRevenueShareBps: number;
}
