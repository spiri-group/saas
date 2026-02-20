import { GraphQLError } from "graphql";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { serverContext } from "../../services/azFunction";
import { DataAction } from "../../services/signalR";
import { vendor_type, subscription_tier } from "../vendor/types";
import { getTierFeatures } from "../subscription/featureGates";
import { renderEmailTemplate } from "../email/utils";
import { sender_details } from "../../client/email_templates";
import { getSpiriverseFeeConfig, getTargetFeeConfig } from "../../utils/functions";
import {
    liveSession_type, liveQueueEntry_type, live_recommendation_type,
    LiveSessionStatus, QueueEntryStatus,
    LIVE_ASSIST_CONTAINER, DOC_TYPE_SESSION, DOC_TYPE_QUEUE_ENTRY,
} from "./types";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://spiriverse.com";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateCode(length = 8): string {
    let code = "";
    for (let i = 0; i < length; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
}

function formatAmount(amount: number, currency: string): string {
    return `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

// ─── Helpers ────────────────────────────────────────────────────

async function getSessionWithAuth(
    context: serverContext,
    sessionId: string,
    vendorId: string
): Promise<liveSession_type> {
    if (!context.userId) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    // partitionKey = vendorId for sessions
    const session = await context.dataSources.cosmos.get_record<liveSession_type>(
        LIVE_ASSIST_CONTAINER, sessionId, vendorId
    );
    if (!session || session.docType !== DOC_TYPE_SESSION) {
        throw new GraphQLError("Live session not found", { extensions: { code: "NOT_FOUND" } });
    }
    return session;
}

async function getQueueEntry(
    context: serverContext,
    entryId: string,
    sessionId: string
): Promise<liveQueueEntry_type> {
    // partitionKey = sessionId for queue entries
    const entry = await context.dataSources.cosmos.get_record<liveQueueEntry_type>(
        LIVE_ASSIST_CONTAINER, entryId, sessionId
    );
    if (!entry || entry.docType !== DOC_TYPE_QUEUE_ENTRY) {
        throw new GraphQLError("Queue entry not found", { extensions: { code: "NOT_FOUND" } });
    }
    return entry;
}

function broadcastQueueEntry(context: serverContext, sessionId: string, entry: liveQueueEntry_type) {
    context.signalR.addDataMessage("liveQueueEntry", entry, {
        group: `live-session-${sessionId}`,
        action: DataAction.UPSERT,
    });
}

function broadcastSession(context: serverContext, session: liveSession_type) {
    context.signalR.addDataMessage("liveSession", session, {
        group: `live-session-${session.id}`,
        action: DataAction.UPSERT,
    });
}

async function sendLiveAssistEmail(
    context: serverContext,
    templateId: string,
    recipientEmail: string,
    variables: Record<string, string>
) {
    try {
        const emailContent = await renderEmailTemplate(context.dataSources, templateId, variables);
        if (emailContent) {
            await context.dataSources.email.sendRawHtmlEmail(
                sender_details.from,
                recipientEmail,
                emailContent.subject,
                emailContent.html
            );
        }
    } catch (err) {
        console.error(`Failed to send ${templateId} email:`, err);
    }
}

async function releasePaymentIntent(context: serverContext, entry: liveQueueEntry_type, stripeAccountId: string) {
    try {
        const connectedStripe = context.dataSources.stripe.asConnectedAccount(stripeAccountId);
        await connectedStripe.callApi("POST", `payment_intents/${entry.stripePaymentIntentId}/cancel`, {});
    } catch (err) {
        console.error(`Failed to cancel PaymentIntent ${entry.stripePaymentIntentId}:`, err);
    }
}

// ─── Resolvers ──────────────────────────────────────────────────

const resolvers = {
    Query: {
        liveSessions: async (_: any, args: { vendorId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const sessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @vendorId AND c.docType = 'live-session' ORDER BY c.createdDate DESC",
                    parameters: [{ name: "@vendorId", value: args.vendorId }],
                },
                true
            );

            return sessions;
        },

        liveSession: async (_: any, args: { sessionId: string; vendorId: string }, context: serverContext) => {
            return getSessionWithAuth(context, args.sessionId, args.vendorId);
        },

        liveQueue: async (_: any, args: { sessionId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const entries = await context.dataSources.cosmos.run_query<liveQueueEntry_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @sessionId AND c.docType = 'live-queue-entry' ORDER BY c.priority ASC",
                    parameters: [{ name: "@sessionId", value: args.sessionId }],
                },
                true
            );

            return entries;
        },

        liveSessionByCode: async (_: any, args: { code: string }, context: serverContext) => {
            // Public — no auth required
            const sessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.code = @code AND c.docType = 'live-session'",
                    parameters: [{ name: "@code", value: args.code }],
                },
                true
            );

            if (sessions.length === 0) return null;

            const session = sessions[0];

            // Get vendor info for public display
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", session.vendorId, session.vendorId
            );

            // Count waiting entries
            const countResult = await context.dataSources.cosmos.run_query<{ count: number }>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @sessionId AND c.docType = 'live-queue-entry' AND c.entryStatus = 'WAITING'",
                    parameters: [{ name: "@sessionId", value: session.id }],
                },
                true
            );
            const queueCount = countResult[0] || 0;

            // Determine price to show
            const price = session.pricingMode === "SERVICE" && session.servicePrice
                ? session.servicePrice
                : session.customPrice || { amount: 0, currency: "AUD" };

            return {
                id: session.id,
                vendorId: session.vendorId,
                vendorName: vendor?.name || "Practitioner",
                vendorLogo: vendor?.logo?.url || null,
                code: session.code,
                sessionTitle: session.sessionTitle,
                sessionStatus: session.sessionStatus,
                pricingMode: session.pricingMode,
                price,
                serviceName: session.serviceName,
                queueCount,
            };
        },

        liveQueuePosition: async (_: any, args: { entryId: string; sessionId: string }, context: serverContext) => {
            // Public — no auth required
            const entry = await context.dataSources.cosmos.get_record<liveQueueEntry_type>(
                LIVE_ASSIST_CONTAINER, args.entryId, args.sessionId
            );
            if (!entry || entry.docType !== DOC_TYPE_QUEUE_ENTRY) {
                throw new GraphQLError("Queue entry not found", { extensions: { code: "NOT_FOUND" } });
            }

            // Count how many WAITING entries have lower priority (ahead in queue)
            const aheadResult = await context.dataSources.cosmos.run_query<number>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @sessionId AND c.docType = 'live-queue-entry' AND c.entryStatus = 'WAITING' AND c.priority < @priority",
                    parameters: [
                        { name: "@sessionId", value: args.sessionId },
                        { name: "@priority", value: entry.priority },
                    ],
                },
                true
            );
            const position = (aheadResult[0] || 0) + 1;

            // Total waiting
            const totalResult = await context.dataSources.cosmos.run_query<number>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @sessionId AND c.docType = 'live-queue-entry' AND c.entryStatus = 'WAITING'",
                    parameters: [{ name: "@sessionId", value: args.sessionId }],
                },
                true
            );
            const totalWaiting = totalResult[0] || 0;

            // Get session status — cross-partition query since session partitionKey = vendorId
            const sessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT c.sessionStatus FROM c WHERE c.id = @sessionId AND c.docType = 'live-session'",
                    parameters: [{ name: "@sessionId", value: args.sessionId }],
                },
                true
            );
            const sessionStatus = sessions[0]?.sessionStatus || "ENDED";

            return {
                entryId: entry.id,
                entryStatus: entry.entryStatus,
                position,
                totalWaiting,
                sessionStatus,
            };
        },
    },

    Mutation: {
        startLiveSession: async (_: any, args: { input: any }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const { vendorId, sessionTitle, pricingMode, customPrice, serviceId, defaultCta } = args.input;

            // Verify vendor ownership and feature gate
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", vendorId, vendorId
            );
            if (!vendor) {
                throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });
            }

            const tier = vendor.subscription?.subscriptionTier as subscription_tier | undefined;
            if (!tier || !getTierFeatures(tier).hasLiveAssist) {
                throw new GraphQLError(
                    "Your current subscription does not include Live Assist. Please upgrade to Illuminate or higher.",
                    { extensions: { code: "FEATURE_GATED" } }
                );
            }

            if (!vendor.stripe?.accountId) {
                throw new GraphQLError(
                    "Please complete your Stripe onboarding before starting a live session.",
                    { extensions: { code: "STRIPE_NOT_CONFIGURED" } }
                );
            }

            // Check for existing active session
            const existingSessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @vendorId AND c.docType = 'live-session' AND c.sessionStatus IN ('ACTIVE', 'PAUSED')",
                    parameters: [{ name: "@vendorId", value: vendorId }],
                },
                true
            );
            if (existingSessions.length > 0) {
                throw new GraphQLError("You already have an active live session. End it before starting a new one.", {
                    extensions: { code: "BAD_REQUEST" },
                });
            }

            // Resolve service details if SERVICE pricing
            let serviceName: string | undefined;
            let servicePrice: { amount: number; currency: string } | undefined;
            if (pricingMode === "SERVICE" && serviceId) {
                const service = await context.dataSources.cosmos.get_record<any>(
                    "Main-Listing", serviceId, vendorId
                );
                if (service) {
                    serviceName = service.name;
                    servicePrice = service.ratePerHour || service.price;
                }
            }

            // Validate pricing
            if (pricingMode === "CUSTOM" && (!customPrice || customPrice.amount <= 0)) {
                throw new GraphQLError("Custom price must be greater than zero", { extensions: { code: "BAD_REQUEST" } });
            }
            if (pricingMode === "SERVICE" && !servicePrice) {
                throw new GraphQLError("Selected service not found or has no price", { extensions: { code: "BAD_REQUEST" } });
            }

            // Resolve default CTA names if set
            let resolvedDefaultCta: liveSession_type["defaultCta"];
            if (defaultCta?.message) {
                resolvedDefaultCta = { message: defaultCta.message };
                if (defaultCta.recommendedServiceId) {
                    const svc = await context.dataSources.cosmos.get_record<any>(
                        "Main-Listing", defaultCta.recommendedServiceId, vendorId
                    );
                    resolvedDefaultCta.recommendedServiceId = defaultCta.recommendedServiceId;
                    resolvedDefaultCta.recommendedServiceName = svc?.name;
                }
                if (defaultCta.recommendedProductId) {
                    const prodVendorId = defaultCta.recommendedProductVendorId || vendorId;
                    const prod = await context.dataSources.cosmos.get_record<any>(
                        "Main-Product", defaultCta.recommendedProductId, prodVendorId
                    );
                    resolvedDefaultCta.recommendedProductId = defaultCta.recommendedProductId;
                    resolvedDefaultCta.recommendedProductName = prod?.name;
                    resolvedDefaultCta.recommendedProductVendorId = prodVendorId;
                }
            }

            const now = DateTime.now().toISO()!;
            const code = generateCode(8);
            const sessionId = uuidv4();

            const session: liveSession_type = {
                id: sessionId,
                partitionKey: vendorId,
                docType: DOC_TYPE_SESSION,
                vendorId,
                code,
                sessionTitle: sessionTitle || undefined,
                sessionStatus: "ACTIVE",
                pricingMode,
                customPrice: pricingMode === "CUSTOM" ? customPrice : undefined,
                serviceId: pricingMode === "SERVICE" ? serviceId : undefined,
                serviceName,
                servicePrice,
                defaultCta: resolvedDefaultCta,
                totalJoined: 0,
                totalCompleted: 0,
                totalRevenue: 0,
                startedAt: now,
                createdDate: now,
            };

            await context.dataSources.cosmos.add_record(
                LIVE_ASSIST_CONTAINER, session, vendorId, context.userId
            );

            return {
                code: "200",
                success: true,
                message: "Live session started",
                session,
                shareUrl: `${FRONTEND_URL}/live/${code}`,
            };
        },

        pauseLiveSession: async (_: any, args: { sessionId: string; vendorId: string }, context: serverContext) => {
            const session = await getSessionWithAuth(context, args.sessionId, args.vendorId);

            if (session.sessionStatus !== "ACTIVE") {
                throw new GraphQLError("Session is not active", { extensions: { code: "BAD_REQUEST" } });
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.sessionId, args.vendorId,
                [
                    { op: "set", path: "/sessionStatus", value: "PAUSED" as LiveSessionStatus },
                    { op: "set", path: "/pausedAt", value: now },
                ],
                context.userId!
            );

            const updated = { ...session, sessionStatus: "PAUSED" as LiveSessionStatus, pausedAt: now };
            broadcastSession(context, updated);

            return { code: "200", success: true, message: "Session paused", session: updated };
        },

        resumeLiveSession: async (_: any, args: { sessionId: string; vendorId: string }, context: serverContext) => {
            const session = await getSessionWithAuth(context, args.sessionId, args.vendorId);

            if (session.sessionStatus !== "PAUSED") {
                throw new GraphQLError("Session is not paused", { extensions: { code: "BAD_REQUEST" } });
            }

            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.sessionId, args.vendorId,
                [{ op: "set", path: "/sessionStatus", value: "ACTIVE" as LiveSessionStatus }],
                context.userId!
            );

            const updated = { ...session, sessionStatus: "ACTIVE" as LiveSessionStatus };
            broadcastSession(context, updated);

            return { code: "200", success: true, message: "Session resumed", session: updated };
        },

        endLiveSession: async (_: any, args: { sessionId: string; vendorId: string }, context: serverContext) => {
            const session = await getSessionWithAuth(context, args.sessionId, args.vendorId);

            if (session.sessionStatus === "ENDED") {
                return { code: "200", success: true, message: "Session already ended", session };
            }

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", args.vendorId, args.vendorId
            );
            const stripeAccountId = vendor?.stripe?.accountId;

            // Release all WAITING entries
            const waitingEntries = await context.dataSources.cosmos.run_query<liveQueueEntry_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @sessionId AND c.docType = 'live-queue-entry' AND c.entryStatus = 'WAITING'",
                    parameters: [{ name: "@sessionId", value: args.sessionId }],
                },
                true
            );

            const now = DateTime.now().toISO()!;
            const practitionerName = vendor?.name || "The practitioner";

            for (const entry of waitingEntries) {
                // Cancel Stripe PaymentIntent
                if (stripeAccountId) {
                    await releasePaymentIntent(context, entry, stripeAccountId);
                }

                // Update entry status
                await context.dataSources.cosmos.patch_record(
                    LIVE_ASSIST_CONTAINER, entry.id, args.sessionId,
                    [
                        { op: "set", path: "/entryStatus", value: "RELEASED" as QueueEntryStatus },
                        { op: "set", path: "/releasedAt", value: now },
                    ],
                    context.userId!
                );

                // Send release email
                await sendLiveAssistEmail(context, "live-assist-released", entry.customerEmail, {
                    "practitioner.name": practitionerName,
                    "customer.name": entry.customerName,
                    "payment.amount": formatAmount(entry.amount.amount, entry.amount.currency),
                    "release.reason": "The live session has ended.",
                });

                broadcastQueueEntry(context, args.sessionId, {
                    ...entry,
                    entryStatus: "RELEASED",
                    releasedAt: now,
                });
            }

            // Update session
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.sessionId, args.vendorId,
                [
                    { op: "set", path: "/sessionStatus", value: "ENDED" as LiveSessionStatus },
                    { op: "set", path: "/endedAt", value: now },
                ],
                context.userId!
            );

            const updated = { ...session, sessionStatus: "ENDED" as LiveSessionStatus, endedAt: now };
            broadcastSession(context, updated);

            return {
                code: "200",
                success: true,
                message: `Session ended. ${waitingEntries.length} authorization(s) released.`,
                session: updated,
            };
        },

        startReading: async (_: any, args: { entryId: string; sessionId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const entry = await getQueueEntry(context, args.entryId, args.sessionId);

            if (entry.entryStatus !== "WAITING") {
                throw new GraphQLError(`Cannot start reading: entry is ${entry.entryStatus}`, {
                    extensions: { code: "BAD_REQUEST" },
                });
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.entryId, args.sessionId,
                [
                    { op: "set", path: "/entryStatus", value: "IN_PROGRESS" as QueueEntryStatus },
                    { op: "set", path: "/startedAt", value: now },
                ],
                context.userId
            );

            const updated = { ...entry, entryStatus: "IN_PROGRESS" as QueueEntryStatus, startedAt: now };
            broadcastQueueEntry(context, args.sessionId, updated);

            return { code: "200", success: true, message: "Reading started", entry: updated };
        },

        completeReading: async (_: any, args: { entryId: string; sessionId: string; readingAudio?: string; spreadPhoto?: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const entry = await getQueueEntry(context, args.entryId, args.sessionId);

            if (entry.entryStatus !== "IN_PROGRESS") {
                throw new GraphQLError(`Cannot complete reading: entry is ${entry.entryStatus}`, {
                    extensions: { code: "BAD_REQUEST" },
                });
            }

            // Get vendor for Stripe connected account
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", entry.vendorId, entry.vendorId
            );
            if (!vendor?.stripe?.accountId) {
                throw new GraphQLError("Vendor Stripe account not found", { extensions: { code: "STRIPE_NOT_CONFIGURED" } });
            }

            // Capture the PaymentIntent
            const connectedStripe = context.dataSources.stripe.asConnectedAccount(vendor.stripe.accountId);
            const captureResult = await connectedStripe.callApi(
                "POST",
                `payment_intents/${entry.stripePaymentIntentId}/capture`,
                {}
            );

            if (captureResult.status !== 200) {
                throw new GraphQLError("Failed to capture payment", { extensions: { code: "STRIPE_ERROR" } });
            }

            const now = DateTime.now().toISO()!;

            // Update queue entry
            const patchOps: any[] = [
                { op: "set", path: "/entryStatus", value: "COMPLETED" as QueueEntryStatus },
                { op: "set", path: "/completedAt", value: now },
            ];
            if (args.readingAudio) {
                patchOps.push({ op: "set", path: "/readingAudioUrl", value: args.readingAudio });
            }
            if (args.spreadPhoto) {
                patchOps.push({ op: "set", path: "/spreadPhotoUrl", value: args.spreadPhoto });
            }
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.entryId, args.sessionId,
                patchOps,
                context.userId
            );

            // Update session stats — get current values first
            const sessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.id = @sessionId AND c.docType = 'live-session'",
                    parameters: [{ name: "@sessionId", value: args.sessionId }],
                },
                true
            );
            const session = sessions[0];
            if (session) {
                await context.dataSources.cosmos.patch_record(
                    LIVE_ASSIST_CONTAINER, args.sessionId, session.vendorId,
                    [
                        { op: "set", path: "/totalCompleted", value: (session.totalCompleted || 0) + 1 },
                        { op: "set", path: "/totalRevenue", value: (session.totalRevenue || 0) + entry.amount.amount },
                    ],
                    context.userId
                );
            }

            // Note: completion email is sent via sendReadingSummary (with recommendation + note)

            const updated = {
                ...entry,
                entryStatus: "COMPLETED" as QueueEntryStatus,
                completedAt: now,
                ...(args.readingAudio ? { readingAudioUrl: args.readingAudio } : {}),
                ...(args.spreadPhoto ? { spreadPhotoUrl: args.spreadPhoto } : {}),
            };
            broadcastQueueEntry(context, args.sessionId, updated);

            return { code: "200", success: true, message: "Reading completed, payment captured", entry: updated };
        },

        skipReading: async (_: any, args: { entryId: string; sessionId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const entry = await getQueueEntry(context, args.entryId, args.sessionId);

            if (entry.entryStatus !== "WAITING" && entry.entryStatus !== "IN_PROGRESS") {
                throw new GraphQLError(`Cannot skip: entry is ${entry.entryStatus}`, {
                    extensions: { code: "BAD_REQUEST" },
                });
            }

            // Get vendor for Stripe
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", entry.vendorId, entry.vendorId
            );
            if (vendor?.stripe?.accountId) {
                await releasePaymentIntent(context, entry, vendor.stripe.accountId);
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.entryId, args.sessionId,
                [
                    { op: "set", path: "/entryStatus", value: "SKIPPED" as QueueEntryStatus },
                    { op: "set", path: "/skippedAt", value: now },
                ],
                context.userId
            );

            // Send release email
            await sendLiveAssistEmail(context, "live-assist-released", entry.customerEmail, {
                "practitioner.name": vendor?.name || "The practitioner",
                "customer.name": entry.customerName,
                "payment.amount": formatAmount(entry.amount.amount, entry.amount.currency),
                "release.reason": "The practitioner has moved on to the next reading.",
            });

            const updated = { ...entry, entryStatus: "SKIPPED" as QueueEntryStatus, skippedAt: now };
            broadcastQueueEntry(context, args.sessionId, updated);

            return { code: "200", success: true, message: "Reading skipped, authorization released", entry: updated };
        },

        joinLiveQueue: async (_: any, args: { input: any }, context: serverContext) => {
            // Public — no auth required
            const { sessionId, customerName, customerEmail, question, photo, audio } = args.input as {
                sessionId: string; customerName: string; customerEmail: string;
                question: string; photo?: string; audio?: string;
            };

            // Look up session
            const sessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.id = @sessionId AND c.docType = 'live-session'",
                    parameters: [{ name: "@sessionId", value: sessionId }],
                },
                true
            );
            if (sessions.length === 0) {
                throw new GraphQLError("Live session not found", { extensions: { code: "NOT_FOUND" } });
            }
            const session = sessions[0];

            if (session.sessionStatus !== "ACTIVE") {
                throw new GraphQLError(
                    session.sessionStatus === "PAUSED"
                        ? "This session is currently paused. Please try again shortly."
                        : "This session has ended.",
                    { extensions: { code: "BAD_REQUEST" } }
                );
            }

            // Get vendor for Stripe connected account
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", session.vendorId, session.vendorId
            );
            if (!vendor?.stripe?.accountId) {
                throw new GraphQLError("Practitioner payment setup is incomplete", {
                    extensions: { code: "STRIPE_NOT_CONFIGURED" },
                });
            }

            // Determine price
            const price = session.pricingMode === "SERVICE" && session.servicePrice
                ? session.servicePrice
                : session.customPrice;

            if (!price || price.amount <= 0) {
                throw new GraphQLError("Session has no valid price configured", { extensions: { code: "BAD_REQUEST" } });
            }

            // Calculate platform fee
            const feeConfig = await getSpiriverseFeeConfig({ cosmos: context.dataSources.cosmos });
            const targetFee = getTargetFeeConfig("service-booking", feeConfig);
            const applicationFeeAmount = Math.round(price.amount * (targetFee.percent / 100)) + (targetFee.fixed || 0);

            // Create PaymentIntent with manual capture on connected account
            const connectedStripe = context.dataSources.stripe.asConnectedAccount(vendor.stripe.accountId);

            // Resolve or create customer on connected account
            const customer = await connectedStripe.resolveCustomer(customerEmail);

            const entryId = uuidv4();
            const paymentIntentResult = await connectedStripe.callApi("POST", "payment_intents", {
                amount: price.amount,
                currency: price.currency.toLowerCase(),
                capture_method: "manual",
                customer: customer.id,
                application_fee_amount: applicationFeeAmount,
                metadata: {
                    liveSessionId: sessionId,
                    queueEntryId: entryId,
                    vendorId: session.vendorId,
                    type: "LIVE_ASSIST",
                },
            });

            if (paymentIntentResult.status !== 200) {
                throw new GraphQLError("Failed to create payment authorization", {
                    extensions: { code: "STRIPE_ERROR" },
                });
            }

            // Count current queue size for position
            const countResult = await context.dataSources.cosmos.run_query<number>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @sessionId AND c.docType = 'live-queue-entry' AND c.entryStatus = 'WAITING'",
                    parameters: [{ name: "@sessionId", value: sessionId }],
                },
                true
            );
            const currentWaiting = countResult[0] || 0;
            const position = currentWaiting + 1;

            const now = DateTime.now().toISO()!;
            const entry: liveQueueEntry_type = {
                id: entryId,
                partitionKey: sessionId,
                docType: DOC_TYPE_QUEUE_ENTRY,
                sessionId,
                vendorId: session.vendorId,
                customerName,
                customerEmail,
                question,
                photoUrl: photo || undefined,
                audioUrl: audio || undefined,
                entryStatus: "WAITING",
                priority: Date.now(),
                position,
                amount: price,
                stripePaymentIntentId: paymentIntentResult.data.id,
                stripePaymentIntentSecret: paymentIntentResult.data.client_secret,
                joinedAt: now,
                createdDate: now,
            };

            await context.dataSources.cosmos.add_record(
                LIVE_ASSIST_CONTAINER, entry, sessionId, "system"
            );

            // Update session joined count
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, sessionId, session.vendorId,
                [{ op: "set", path: "/totalJoined", value: (session.totalJoined || 0) + 1 }],
                "system"
            );

            // Broadcast new entry
            broadcastQueueEntry(context, sessionId, entry);

            // Send confirmation email
            await sendLiveAssistEmail(context, "live-assist-confirmation", customerEmail, {
                "practitioner.name": vendor.name,
                "customer.name": customerName,
                "queue.position": String(position),
                "payment.amount": formatAmount(price.amount, price.currency),
            });

            return {
                code: "200",
                success: true,
                message: "You've joined the queue!",
                entry,
                clientSecret: paymentIntentResult.data.client_secret,
            };
        },

        sendReadingSummary: async (_: any, args: { input: any }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const { entryId, sessionId, practitionerNote, recommendation } = args.input as {
                entryId: string; sessionId: string;
                practitionerNote?: string;
                recommendation?: { message: string; recommendedServiceId?: string; recommendedProductId?: string; recommendedProductVendorId?: string };
            };

            const entry = await getQueueEntry(context, entryId, sessionId);

            if (entry.entryStatus !== "COMPLETED") {
                throw new GraphQLError("Can only send summary for completed readings", { extensions: { code: "BAD_REQUEST" } });
            }

            // Get session to resolve defaultCta fallback + vendor info
            const sessions = await context.dataSources.cosmos.run_query<liveSession_type>(
                LIVE_ASSIST_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.id = @sessionId AND c.docType = 'live-session'",
                    parameters: [{ name: "@sessionId", value: sessionId }],
                },
                true
            );
            const session = sessions[0];
            const vendorId = entry.vendorId;

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", vendorId, vendorId
            );

            // Resolve recommendation names
            let resolvedRec: live_recommendation_type | undefined;
            const recInput = recommendation || session?.defaultCta;
            if (recInput?.message) {
                resolvedRec = { message: recInput.message };
                if (recInput.recommendedServiceId) {
                    const svc = await context.dataSources.cosmos.get_record<any>(
                        "Main-Listing", recInput.recommendedServiceId, vendorId
                    );
                    resolvedRec.recommendedServiceId = recInput.recommendedServiceId;
                    resolvedRec.recommendedServiceName = svc?.name;
                }
                if (recInput.recommendedProductId) {
                    const prodVendorId = recInput.recommendedProductVendorId || vendorId;
                    const prod = await context.dataSources.cosmos.get_record<any>(
                        "Main-Listing", recInput.recommendedProductId, prodVendorId
                    );
                    resolvedRec.recommendedProductId = recInput.recommendedProductId;
                    resolvedRec.recommendedProductName = prod?.name;
                    resolvedRec.recommendedProductVendorId = prodVendorId;
                }
            }

            // Patch the entry
            const patchOps: any[] = [];
            if (practitionerNote) {
                patchOps.push({ op: "set", path: "/practitionerNote", value: practitionerNote });
            }
            if (resolvedRec) {
                patchOps.push({ op: "set", path: "/recommendation", value: resolvedRec });
            }

            if (patchOps.length > 0) {
                await context.dataSources.cosmos.patch_record(
                    LIVE_ASSIST_CONTAINER, entryId, sessionId,
                    patchOps, context.userId
                );
            }

            // Send the enriched reading-complete email
            const emailVars: Record<string, string> = {
                "practitioner.name": vendor?.name || "Your practitioner",
                "customer.name": entry.customerName,
                "payment.amount": formatAmount(entry.amount.amount, entry.amount.currency),
            };
            if (practitionerNote) {
                emailVars["practitioner.note"] = practitionerNote;
            }
            if (resolvedRec) {
                emailVars["recommendation.message"] = resolvedRec.message;
                if (resolvedRec.recommendedServiceName) {
                    emailVars["recommendation.serviceName"] = resolvedRec.recommendedServiceName;
                    emailVars["recommendation.serviceUrl"] = `${FRONTEND_URL}/p/${vendor?.slug || vendorId}/services/${resolvedRec.recommendedServiceId}`;
                }
                if (resolvedRec.recommendedProductName) {
                    emailVars["recommendation.productName"] = resolvedRec.recommendedProductName;
                    const prodVendor = resolvedRec.recommendedProductVendorId && resolvedRec.recommendedProductVendorId !== vendorId
                        ? await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", resolvedRec.recommendedProductVendorId, resolvedRec.recommendedProductVendorId)
                        : vendor;
                    emailVars["recommendation.productUrl"] = `${FRONTEND_URL}/m/${prodVendor?.slug || resolvedRec.recommendedProductVendorId}/shop/${resolvedRec.recommendedProductId}`;
                }
            }

            await sendLiveAssistEmail(context, "live-assist-reading-complete", entry.customerEmail, emailVars);

            const updated = {
                ...entry,
                ...(practitionerNote ? { practitionerNote } : {}),
                ...(resolvedRec ? { recommendation: resolvedRec } : {}),
            };
            broadcastQueueEntry(context, sessionId, updated);

            return { code: "200", success: true, message: "Reading summary sent", entry: updated };
        },

        leaveLiveQueue: async (_: any, args: { entryId: string; sessionId: string }, context: serverContext) => {
            // Public — customer can leave queue
            const entry = await getQueueEntry(context, args.entryId, args.sessionId);

            if (entry.entryStatus !== "WAITING") {
                throw new GraphQLError("Can only leave queue when waiting", { extensions: { code: "BAD_REQUEST" } });
            }

            // Get vendor for Stripe
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", entry.vendorId, entry.vendorId
            );
            if (vendor?.stripe?.accountId) {
                await releasePaymentIntent(context, entry, vendor.stripe.accountId);
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                LIVE_ASSIST_CONTAINER, args.entryId, args.sessionId,
                [
                    { op: "set", path: "/entryStatus", value: "RELEASED" as QueueEntryStatus },
                    { op: "set", path: "/releasedAt", value: now },
                ],
                "system"
            );

            const updated = { ...entry, entryStatus: "RELEASED" as QueueEntryStatus, releasedAt: now };
            broadcastQueueEntry(context, args.sessionId, updated);

            return { code: "200", success: true, message: "You've left the queue", entry: updated };
        },
    },
};

export { resolvers };
