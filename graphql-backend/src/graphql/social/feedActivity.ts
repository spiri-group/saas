import { media_type } from "../0_shared/types";
import { serverContext } from "../../services/azFunction";
import { v4 as uuid } from "uuid";

// ── Feed Activity Types ────────────────────────────────────────────

export type FeedActivityType =
    | "VIDEO_UPDATE"
    | "ORACLE_MESSAGE"
    | "NEW_SERVICE"
    | "NEW_PRODUCT"
    | "NEW_EVENT"
    | "NEW_GALLERY_ITEM"
    | "NEW_JOURNEY"
    | "SOCIAL_POST";

export type FeedActivity = {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorSlug: string;
    vendorLogo: media_type | null;
    vendorDocType: "MERCHANT" | "PRACTITIONER";
    activityType: FeedActivityType;
    sourceId: string;
    title: string;
    subtitle: string | null;
    media: media_type | null;
    coverPhoto: media_type | null;
    metadata: Record<string, any>;
    publishedAt: string;
    /** Cosmos TTL in seconds — null means no expiry */
    ttl?: number | null;
};

// ── Vendor Info Helper ─────────────────────────────────────────────

export type VendorInfo = {
    vendorId: string;
    vendorName: string;
    vendorSlug: string;
    vendorLogo: media_type | null;
    vendorDocType: "MERCHANT" | "PRACTITIONER";
};

/**
 * Extract the denormalized vendor info needed for feed activities.
 * Call this once per mutation context and pass it to publishFeedActivity.
 */
export function extractVendorInfo(vendor: any): VendorInfo {
    return {
        vendorId: vendor.id,
        vendorName: vendor.name || "Unknown",
        vendorSlug: vendor.slug || "",
        vendorLogo: vendor.logo || null,
        vendorDocType: vendor.docType || "MERCHANT",
    };
}

// ── Publisher ──────────────────────────────────────────────────────

/**
 * Publish a feed activity to Main-SocialPost.
 * This is fire-and-forget — errors are logged but don't fail the parent mutation.
 */
export async function publishFeedActivity(
    context: serverContext,
    vendor: VendorInfo,
    activityType: FeedActivityType,
    sourceId: string,
    data: {
        title: string;
        subtitle?: string | null;
        media?: media_type | null;
        coverPhoto?: media_type | null;
        metadata?: Record<string, any>;
        ttl?: number | null;
        publishedAt?: string;
    }
): Promise<void> {
    try {
        const activity: FeedActivity = {
            id: `fa_${vendor.vendorId}_${activityType.toLowerCase()}_${sourceId}`,
            vendorId: vendor.vendorId,
            vendorName: vendor.vendorName,
            vendorSlug: vendor.vendorSlug,
            vendorLogo: vendor.vendorLogo,
            vendorDocType: vendor.vendorDocType,
            activityType,
            sourceId,
            title: data.title,
            subtitle: data.subtitle || null,
            media: data.media || null,
            coverPhoto: data.coverPhoto || null,
            metadata: data.metadata || {},
            publishedAt: data.publishedAt || new Date().toISOString(),
            ttl: data.ttl || null,
        };

        await context.dataSources.cosmos.add_record(
            "Main-SocialPost",
            activity,
            vendor.vendorId,
            "SYSTEM"
        );
    } catch (err) {
        // Don't fail the parent mutation — feed is secondary
        console.error(`[FeedActivity] Failed to publish ${activityType} for ${vendor.vendorId}:`, err);
    }
}

/**
 * Remove a feed activity (e.g., when a service is deleted).
 */
export async function removeFeedActivity(
    context: serverContext,
    vendorId: string,
    activityType: FeedActivityType,
    sourceId: string
): Promise<void> {
    try {
        const id = `fa_${vendorId}_${activityType.toLowerCase()}_${sourceId}`;
        await context.dataSources.cosmos.delete_record(
            "Main-SocialPost",
            id,
            vendorId,
            "SYSTEM"
        );
    } catch {
        // Silently ignore — activity may not exist
    }
}
