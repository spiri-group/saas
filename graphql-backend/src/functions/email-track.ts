/**
 * Email open tracking endpoint.
 * Serves a 1x1 transparent GIF and records open events in Table Storage.
 * Called by email clients when recipients open emails containing the tracking pixel.
 */
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import { TableStorageDataSource } from "../services/tablestorage";
import NodeCache from "node-cache";

export const EMAIL_TRACKING_TABLE = "EmailTracking";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

const GIF_HEADERS = {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// Cached across invocations
const cache = new NodeCache({ stdTTL: 300 });
let tableStorage: TableStorageDataSource | null = null;

async function getTableStorage(request: HttpRequest, context: InvocationContext): Promise<TableStorageDataSource> {
    if (tableStorage) return tableStorage;

    const host = request.headers.get("host") || "localhost";
    const logger = new LogManager(context);
    const keyVault = new vault(host, logger, cache);

    tableStorage = new TableStorageDataSource(logger, keyVault);
    await tableStorage.init();
    return tableStorage;
}

export async function emailTrack(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const trackingId = request.params.trackingId;

    if (!trackingId) {
        return { status: 200, headers: GIF_HEADERS, body: TRANSPARENT_GIF };
    }

    // Always return the pixel immediately - record open in background
    try {
        const storage = await getTableStorage(request, context);

        // trackingId format: {emailId}_{recipientIndex}
        const separatorIdx = trackingId.lastIndexOf("_");
        if (separatorIdx === -1) {
            return { status: 200, headers: GIF_HEADERS, body: TRANSPARENT_GIF };
        }

        const emailId = trackingId.substring(0, separatorIdx);

        // Try to get existing tracking record
        const existing = await storage.getEntity<{
            openCount: number;
            firstOpenedAt?: string;
            lastOpenedAt?: string;
        }>(EMAIL_TRACKING_TABLE, emailId, trackingId);

        if (existing) {
            const now = new Date().toISOString();
            await storage.updateEntity(EMAIL_TRACKING_TABLE, {
                partitionKey: emailId,
                rowKey: trackingId,
                openCount: (existing.openCount || 0) + 1,
                firstOpenedAt: existing.firstOpenedAt || now,
                lastOpenedAt: now,
            });
        }
    } catch (error) {
        // Never fail the pixel response - just log the error
        context.error("Email tracking error:", error);
    }

    return { status: 200, headers: GIF_HEADERS, body: TRANSPARENT_GIF };
}

app.http("email-track", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "email-track/{trackingId}",
    handler: emailTrack,
});
