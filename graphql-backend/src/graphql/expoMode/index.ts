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
    expo_type, expoItem_type, expoSale_type, expoSaleItem_type,
    ExpoStatus, ExpoSaleStatus,
    EXPO_MODE_CONTAINER, DOC_TYPE_EXPO, DOC_TYPE_EXPO_ITEM, DOC_TYPE_EXPO_SALE,
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

async function getExpoWithAuth(
    context: serverContext,
    expoId: string,
    vendorId: string
): Promise<expo_type> {
    if (!context.userId) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const expo = await context.dataSources.cosmos.get_record<expo_type>(
        EXPO_MODE_CONTAINER, expoId, vendorId
    );
    if (!expo || expo.docType !== DOC_TYPE_EXPO) {
        throw new GraphQLError("Expo not found", { extensions: { code: "NOT_FOUND" } });
    }
    return expo;
}

function broadcastExpo(context: serverContext, expo: expo_type) {
    context.signalR.addDataMessage("expo", expo, {
        group: `expo-${expo.id}`,
        action: DataAction.UPSERT,
    });
}

function broadcastExpoItem(context: serverContext, expoId: string, item: expoItem_type) {
    context.signalR.addDataMessage("expoItem", item, {
        group: `expo-${expoId}`,
        action: DataAction.UPSERT,
    });
}

function broadcastExpoSale(context: serverContext, expoId: string, sale: expoSale_type) {
    context.signalR.addDataMessage("expoSale", sale, {
        group: `expo-${expoId}`,
        action: DataAction.UPSERT,
    });
}

async function sendExpoEmail(
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

async function getNextSaleNumber(context: serverContext, expoId: string): Promise<number> {
    const countResult = await context.dataSources.cosmos.run_query<number>(
        EXPO_MODE_CONTAINER,
        {
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-sale'",
            parameters: [{ name: "@expoId", value: expoId }],
        },
        true
    );
    return (countResult[0] || 0) + 1;
}

async function updateExpoStats(
    context: serverContext,
    expoId: string,
    vendorId: string,
    sale: expoSale_type,
    userId: string
) {
    const expo = await context.dataSources.cosmos.get_record<expo_type>(
        EXPO_MODE_CONTAINER, expoId, vendorId
    );
    if (!expo) return;

    const totalItemsSoldInSale = sale.items.reduce((sum, i) => sum + i.quantity, 0);

    // Count as new customer: walk-ups without email always count; email customers check for prior sales
    let isNewCustomer = true;
    if (sale.customerEmail) {
        const priorSales = await context.dataSources.cosmos.run_query<number>(
            EXPO_MODE_CONTAINER,
            {
                query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-sale' AND c.customerEmail = @email AND c.id != @saleId AND c.saleStatus = 'PAID'",
                parameters: [
                    { name: "@expoId", value: expoId },
                    { name: "@email", value: sale.customerEmail },
                    { name: "@saleId", value: sale.id },
                ],
            },
            true
        );
        isNewCustomer = (priorSales[0] || 0) === 0;
    }

    await context.dataSources.cosmos.patch_record(
        EXPO_MODE_CONTAINER, expoId, vendorId,
        [
            { op: "set", path: "/totalSales", value: (expo.totalSales || 0) + 1 },
            { op: "set", path: "/totalRevenue", value: (expo.totalRevenue || 0) + sale.subtotal.amount },
            { op: "set", path: "/totalItemsSold", value: (expo.totalItemsSold || 0) + totalItemsSoldInSale },
            { op: "set", path: "/totalCustomers", value: (expo.totalCustomers || 0) + (isNewCustomer ? 1 : 0) },
        ],
        userId
    );
}

async function decrementInventory(
    context: serverContext,
    expoId: string,
    saleItems: expoSaleItem_type[],
    userId: string
) {
    for (const saleItem of saleItems) {
        const item = await context.dataSources.cosmos.get_record<expoItem_type>(
            EXPO_MODE_CONTAINER, saleItem.itemId, expoId
        );
        if (!item || item.docType !== DOC_TYPE_EXPO_ITEM) continue;

        await context.dataSources.cosmos.patch_record(
            EXPO_MODE_CONTAINER, saleItem.itemId, expoId,
            [{ op: "set", path: "/quantitySold", value: (item.quantitySold || 0) + saleItem.quantity }],
            userId
        );

        broadcastExpoItem(context, expoId, {
            ...item,
            quantitySold: (item.quantitySold || 0) + saleItem.quantity,
        });
    }
}

function formatSaleItemsForEmail(items: expoSaleItem_type[]): string {
    return items.map(i =>
        `${i.quantity}x ${i.itemName} — ${formatAmount(i.lineTotal.amount, i.lineTotal.currency)}`
    ).join(", ");
}

// ─── Resolvers ──────────────────────────────────────────────────

const resolvers = {
    Query: {
        expos: async (_: any, args: { vendorId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            return context.dataSources.cosmos.run_query<expo_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @vendorId AND c.docType = 'expo' ORDER BY c.createdAt DESC",
                    parameters: [{ name: "@vendorId", value: args.vendorId }],
                },
                true
            );
        },

        expo: async (_: any, args: { expoId: string; vendorId: string }, context: serverContext) => {
            return getExpoWithAuth(context, args.expoId, args.vendorId);
        },

        expoItems: async (_: any, args: { expoId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            return context.dataSources.cosmos.run_query<expoItem_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-item' ORDER BY c.sortOrder ASC",
                    parameters: [{ name: "@expoId", value: args.expoId }],
                },
                true
            );
        },

        expoSales: async (_: any, args: { expoId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            return context.dataSources.cosmos.run_query<expoSale_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-sale' ORDER BY c.createdAt DESC",
                    parameters: [{ name: "@expoId", value: args.expoId }],
                },
                true
            );
        },

        expoByCode: async (_: any, args: { code: string }, context: serverContext) => {
            const expos = await context.dataSources.cosmos.run_query<expo_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.code = @code AND c.docType = 'expo'",
                    parameters: [{ name: "@code", value: args.code }],
                },
                true
            );

            if (expos.length === 0) return null;

            const expo = expos[0];

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", expo.vendorId, expo.vendorId
            );

            return {
                id: expo.id,
                vendorId: expo.vendorId,
                vendorName: vendor?.name || "Practitioner",
                vendorLogo: vendor?.logo?.url || null,
                code: expo.code,
                expoName: expo.expoName,
                expoStatus: expo.expoStatus,
            };
        },

        expoPublicItems: async (_: any, args: { expoId: string }, context: serverContext) => {
            const items = await context.dataSources.cosmos.run_query<expoItem_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-item' AND c.isActive = true ORDER BY c.sortOrder ASC",
                    parameters: [{ name: "@expoId", value: args.expoId }],
                },
                true
            );

            return items.map(item => ({
                id: item.id,
                itemName: item.itemName,
                itemDescription: item.itemDescription,
                itemImage: item.itemImage,
                price: item.price,
                trackInventory: item.trackInventory,
                quantityAvailable: item.trackInventory && item.quantityBrought != null
                    ? Math.max(0, item.quantityBrought - (item.quantitySold || 0))
                    : null,
                sortOrder: item.sortOrder,
            }));
        },
    },

    Mutation: {
        createExpo: async (_: any, args: { input: any }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const { vendorId, expoName } = args.input;

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", vendorId, vendorId
            );
            if (!vendor) {
                throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });
            }

            const tier = vendor.subscription?.subscriptionTier as subscription_tier | undefined;
            if (!tier || !getTierFeatures(tier).hasExpoMode) {
                throw new GraphQLError(
                    "Your current subscription does not include Expo Mode. Please upgrade to Illuminate or higher.",
                    { extensions: { code: "FEATURE_GATED" } }
                );
            }

            if (!vendor.stripe?.accountId) {
                throw new GraphQLError(
                    "Please complete your Stripe onboarding before creating an expo.",
                    { extensions: { code: "STRIPE_NOT_CONFIGURED" } }
                );
            }

            // Check for existing active expo
            const existingExpos = await context.dataSources.cosmos.run_query<expo_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.partitionKey = @vendorId AND c.docType = 'expo' AND c.expoStatus IN ('SETUP', 'LIVE', 'PAUSED')",
                    parameters: [{ name: "@vendorId", value: vendorId }],
                },
                true
            );
            if (existingExpos.length > 0) {
                throw new GraphQLError("You already have an active expo. End it before creating a new one.", {
                    extensions: { code: "BAD_REQUEST" },
                });
            }

            const now = DateTime.now().toISO()!;
            const code = generateCode(8);
            const expoId = uuidv4();

            const expo: expo_type = {
                id: expoId,
                partitionKey: vendorId,
                docType: DOC_TYPE_EXPO,
                vendorId,
                code,
                expoName: expoName.trim(),
                expoStatus: "SETUP",
                totalSales: 0,
                totalRevenue: 0,
                totalItemsSold: 0,
                totalCustomers: 0,
                createdAt: now,
            };

            await context.dataSources.cosmos.add_record(
                EXPO_MODE_CONTAINER, expo, vendorId, context.userId
            );

            return {
                code: "200",
                success: true,
                message: "Expo created in setup mode",
                expo,
                shareUrl: `${FRONTEND_URL}/expo/${code}`,
            };
        },

        updateExpo: async (_: any, args: { input: any }, context: serverContext) => {
            const { expoId, vendorId, expoName } = args.input;
            const expo = await getExpoWithAuth(context, expoId, vendorId);

            const patchOps: any[] = [];
            if (expoName != null) {
                patchOps.push({ op: "set", path: "/expoName", value: expoName.trim() });
            }

            if (patchOps.length > 0) {
                await context.dataSources.cosmos.patch_record(
                    EXPO_MODE_CONTAINER, expoId, vendorId, patchOps, context.userId!
                );
            }

            const updated = { ...expo, ...(expoName != null ? { expoName: expoName.trim() } : {}) };
            broadcastExpo(context, updated);

            return { code: "200", success: true, message: "Expo updated", expo: updated };
        },

        goLiveExpo: async (_: any, args: { expoId: string; vendorId: string }, context: serverContext) => {
            const expo = await getExpoWithAuth(context, args.expoId, args.vendorId);

            if (expo.expoStatus !== "SETUP") {
                throw new GraphQLError("Expo can only go live from SETUP status", { extensions: { code: "BAD_REQUEST" } });
            }

            // Validate at least 1 item exists
            const itemCount = await context.dataSources.cosmos.run_query<number>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-item'",
                    parameters: [{ name: "@expoId", value: args.expoId }],
                },
                true
            );
            if ((itemCount[0] || 0) === 0) {
                throw new GraphQLError("Add at least one item before going live", { extensions: { code: "BAD_REQUEST" } });
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                EXPO_MODE_CONTAINER, args.expoId, args.vendorId,
                [
                    { op: "set", path: "/expoStatus", value: "LIVE" as ExpoStatus },
                    { op: "set", path: "/goLiveAt", value: now },
                ],
                context.userId!
            );

            const updated = { ...expo, expoStatus: "LIVE" as ExpoStatus, goLiveAt: now };
            broadcastExpo(context, updated);

            return { code: "200", success: true, message: "Expo is now live!", expo: updated };
        },

        pauseExpo: async (_: any, args: { expoId: string; vendorId: string }, context: serverContext) => {
            const expo = await getExpoWithAuth(context, args.expoId, args.vendorId);

            if (expo.expoStatus !== "LIVE") {
                throw new GraphQLError("Expo is not live", { extensions: { code: "BAD_REQUEST" } });
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                EXPO_MODE_CONTAINER, args.expoId, args.vendorId,
                [
                    { op: "set", path: "/expoStatus", value: "PAUSED" as ExpoStatus },
                    { op: "set", path: "/pausedAt", value: now },
                ],
                context.userId!
            );

            const updated = { ...expo, expoStatus: "PAUSED" as ExpoStatus, pausedAt: now };
            broadcastExpo(context, updated);

            return { code: "200", success: true, message: "Expo paused", expo: updated };
        },

        resumeExpo: async (_: any, args: { expoId: string; vendorId: string }, context: serverContext) => {
            const expo = await getExpoWithAuth(context, args.expoId, args.vendorId);

            if (expo.expoStatus !== "PAUSED") {
                throw new GraphQLError("Expo is not paused", { extensions: { code: "BAD_REQUEST" } });
            }

            await context.dataSources.cosmos.patch_record(
                EXPO_MODE_CONTAINER, args.expoId, args.vendorId,
                [{ op: "set", path: "/expoStatus", value: "LIVE" as ExpoStatus }],
                context.userId!
            );

            const updated = { ...expo, expoStatus: "LIVE" as ExpoStatus };
            broadcastExpo(context, updated);

            return { code: "200", success: true, message: "Expo resumed", expo: updated };
        },

        endExpo: async (_: any, args: { expoId: string; vendorId: string }, context: serverContext) => {
            const expo = await getExpoWithAuth(context, args.expoId, args.vendorId);

            if (expo.expoStatus === "ENDED") {
                return { code: "200", success: true, message: "Expo already ended", expo };
            }

            const now = DateTime.now().toISO()!;
            await context.dataSources.cosmos.patch_record(
                EXPO_MODE_CONTAINER, args.expoId, args.vendorId,
                [
                    { op: "set", path: "/expoStatus", value: "ENDED" as ExpoStatus },
                    { op: "set", path: "/endedAt", value: now },
                ],
                context.userId!
            );

            const updated = { ...expo, expoStatus: "ENDED" as ExpoStatus, endedAt: now };
            broadcastExpo(context, updated);

            // Send summary email to vendor
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", args.vendorId, args.vendorId
            );
            if (vendor?.contact?.internal?.email) {
                await sendExpoEmail(context, "expo-summary", vendor.contact.internal.email, {
                    "expo.name": expo.expoName,
                    "expo.totalSales": String(expo.totalSales || 0),
                    "expo.totalRevenue": formatAmount(expo.totalRevenue || 0, vendor.currency || "AUD"),
                    "expo.totalItemsSold": String(expo.totalItemsSold || 0),
                });
            }

            return {
                code: "200",
                success: true,
                message: "Expo ended",
                expo: updated,
            };
        },

        addExpoItem: async (_: any, args: { input: any }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const { expoId, vendorId, itemSource, serviceId, itemName, itemDescription, itemImage, price, trackInventory, quantityBrought } = args.input;

            // Verify expo exists and is owned by vendor
            const expo = await getExpoWithAuth(context, expoId, vendorId);

            if (expo.expoStatus === "ENDED") {
                throw new GraphQLError("Cannot add items to an ended expo", { extensions: { code: "BAD_REQUEST" } });
            }

            // Get current item count for sort order
            const items = await context.dataSources.cosmos.run_query<expoItem_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT VALUE COUNT(1) FROM c WHERE c.partitionKey = @expoId AND c.docType = 'expo-item'",
                    parameters: [{ name: "@expoId", value: expoId }],
                },
                true
            );
            const sortOrder = (items[0] || 0) as number;

            // If SERVICE source, fetch service details
            let resolvedName = itemName;
            let resolvedServiceName: string | undefined;
            if (itemSource === "SERVICE" && serviceId) {
                const service = await context.dataSources.cosmos.get_record<any>(
                    "Main-Listing", serviceId, vendorId
                );
                if (service) {
                    resolvedServiceName = service.name;
                    if (!resolvedName) resolvedName = service.name;
                }
            }

            const now = DateTime.now().toISO()!;
            const itemId = uuidv4();

            const item: expoItem_type = {
                id: itemId,
                partitionKey: expoId,
                docType: DOC_TYPE_EXPO_ITEM,
                expoId,
                vendorId,
                itemSource,
                serviceId: itemSource === "SERVICE" ? serviceId : undefined,
                serviceName: resolvedServiceName,
                itemName: resolvedName.trim(),
                itemDescription: itemDescription?.trim() || undefined,
                itemImage: itemImage || undefined,
                price,
                trackInventory: trackInventory ?? false,
                quantityBrought: trackInventory ? quantityBrought : undefined,
                quantitySold: 0,
                sortOrder,
                isActive: true,
                createdAt: now,
            };

            await context.dataSources.cosmos.add_record(
                EXPO_MODE_CONTAINER, item, expoId, context.userId
            );

            broadcastExpoItem(context, expoId, item);

            return { code: "200", success: true, message: "Item added", item };
        },

        updateExpoItem: async (_: any, args: { input: any }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const { itemId, expoId, itemName, itemDescription, itemImage, price, quantityBrought, isActive } = args.input;

            const item = await context.dataSources.cosmos.get_record<expoItem_type>(
                EXPO_MODE_CONTAINER, itemId, expoId
            );
            if (!item || item.docType !== DOC_TYPE_EXPO_ITEM) {
                throw new GraphQLError("Item not found", { extensions: { code: "NOT_FOUND" } });
            }

            const patchOps: any[] = [];
            if (itemName != null) patchOps.push({ op: "set", path: "/itemName", value: itemName.trim() });
            if (itemDescription !== undefined) patchOps.push({ op: "set", path: "/itemDescription", value: itemDescription?.trim() || undefined });
            if (itemImage !== undefined) patchOps.push({ op: "set", path: "/itemImage", value: itemImage || undefined });
            if (price != null) patchOps.push({ op: "set", path: "/price", value: price });
            if (quantityBrought != null) patchOps.push({ op: "set", path: "/quantityBrought", value: quantityBrought });
            if (isActive != null) patchOps.push({ op: "set", path: "/isActive", value: isActive });

            if (patchOps.length > 0) {
                await context.dataSources.cosmos.patch_record(
                    EXPO_MODE_CONTAINER, itemId, expoId, patchOps, context.userId
                );
            }

            const updated: expoItem_type = {
                ...item,
                ...(itemName != null ? { itemName: itemName.trim() } : {}),
                ...(itemDescription !== undefined ? { itemDescription: itemDescription?.trim() || undefined } : {}),
                ...(itemImage !== undefined ? { itemImage: itemImage || undefined } : {}),
                ...(price != null ? { price } : {}),
                ...(quantityBrought != null ? { quantityBrought } : {}),
                ...(isActive != null ? { isActive } : {}),
            };

            broadcastExpoItem(context, expoId, updated);

            return { code: "200", success: true, message: "Item updated", item: updated };
        },

        removeExpoItem: async (_: any, args: { itemId: string; expoId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const item = await context.dataSources.cosmos.get_record<expoItem_type>(
                EXPO_MODE_CONTAINER, args.itemId, args.expoId
            );
            if (!item || item.docType !== DOC_TYPE_EXPO_ITEM) {
                throw new GraphQLError("Item not found", { extensions: { code: "NOT_FOUND" } });
            }

            // Soft-disable: set isActive = false
            await context.dataSources.cosmos.patch_record(
                EXPO_MODE_CONTAINER, args.itemId, args.expoId,
                [{ op: "set", path: "/isActive", value: false }],
                context.userId
            );

            const updated = { ...item, isActive: false };
            broadcastExpoItem(context, args.expoId, updated);

            return { code: "200", success: true, message: "Item removed", item: updated };
        },

        reorderExpoItems: async (_: any, args: { expoId: string; itemIds: string[] }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            for (let i = 0; i < args.itemIds.length; i++) {
                await context.dataSources.cosmos.patch_record(
                    EXPO_MODE_CONTAINER, args.itemIds[i], args.expoId,
                    [{ op: "set", path: "/sortOrder", value: i }],
                    context.userId
                );
            }

            return { code: "200", success: true, message: "Items reordered" };
        },

        logExpoSale: async (_: any, args: { input: any }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const { expoId, vendorId, items: saleItemInputs, paymentMethod, customerName, customerEmail } = args.input;

            const expo = await getExpoWithAuth(context, expoId, vendorId);

            if (expo.expoStatus === "ENDED") {
                throw new GraphQLError("Cannot log sales for an ended expo", { extensions: { code: "BAD_REQUEST" } });
            }

            // Resolve items
            const saleItems: expoSaleItem_type[] = [];
            let subtotalAmount = 0;
            let currency = "AUD";

            for (const input of saleItemInputs) {
                const item = await context.dataSources.cosmos.get_record<expoItem_type>(
                    EXPO_MODE_CONTAINER, input.itemId, expoId
                );
                if (!item || item.docType !== DOC_TYPE_EXPO_ITEM) {
                    throw new GraphQLError(`Item ${input.itemId} not found`, { extensions: { code: "NOT_FOUND" } });
                }

                // Check inventory
                if (item.trackInventory && item.quantityBrought != null) {
                    const available = item.quantityBrought - (item.quantitySold || 0);
                    if (input.quantity > available) {
                        throw new GraphQLError(`Not enough stock for ${item.itemName} (${available} available)`, {
                            extensions: { code: "BAD_REQUEST" },
                        });
                    }
                }

                const lineTotal = item.price.amount * input.quantity;
                currency = item.price.currency;

                saleItems.push({
                    itemId: item.id,
                    itemName: item.itemName,
                    quantity: input.quantity,
                    unitPrice: item.price,
                    lineTotal: { amount: lineTotal, currency },
                });

                subtotalAmount += lineTotal;
            }

            const now = DateTime.now().toISO()!;
            const saleId = uuidv4();
            const saleNumber = await getNextSaleNumber(context, expoId);

            const sale: expoSale_type = {
                id: saleId,
                partitionKey: expoId,
                docType: DOC_TYPE_EXPO_SALE,
                expoId,
                vendorId,
                customerName: customerName?.trim() || undefined,
                customerEmail: customerEmail?.trim() || undefined,
                saleChannel: "WALK_UP",
                paymentMethod: paymentMethod || "CASH",
                items: saleItems,
                subtotal: { amount: subtotalAmount, currency },
                saleStatus: "PAID",
                saleNumber,
                createdAt: now,
                paidAt: now,
            };

            await context.dataSources.cosmos.add_record(
                EXPO_MODE_CONTAINER, sale, expoId, context.userId
            );

            // Decrement inventory
            await decrementInventory(context, expoId, saleItems, context.userId);

            // Update expo stats
            await updateExpoStats(context, expoId, vendorId, sale, context.userId);

            // Broadcast
            broadcastExpoSale(context, expoId, sale);

            // Refresh and broadcast expo with updated stats
            const updatedExpo = await context.dataSources.cosmos.get_record<expo_type>(
                EXPO_MODE_CONTAINER, expoId, vendorId
            );
            if (updatedExpo) broadcastExpo(context, updatedExpo);

            return { code: "200", success: true, message: `Sale #${saleNumber} logged`, sale };
        },

        createExpoCheckout: async (_: any, args: { input: any }, context: serverContext) => {
            // Public — no auth required
            const { expoId, items: checkoutItems, customerName, customerEmail } = args.input;

            // Look up expo
            const expos = await context.dataSources.cosmos.run_query<expo_type>(
                EXPO_MODE_CONTAINER,
                {
                    query: "SELECT * FROM c WHERE c.id = @expoId AND c.docType = 'expo'",
                    parameters: [{ name: "@expoId", value: expoId }],
                },
                true
            );
            if (expos.length === 0) {
                throw new GraphQLError("Expo not found", { extensions: { code: "NOT_FOUND" } });
            }
            const expo = expos[0];

            if (expo.expoStatus !== "LIVE") {
                throw new GraphQLError(
                    expo.expoStatus === "PAUSED"
                        ? "This booth is on a break. Please try again shortly."
                        : "This expo has ended.",
                    { extensions: { code: "BAD_REQUEST" } }
                );
            }

            // Get vendor for Stripe
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor", expo.vendorId, expo.vendorId
            );
            if (!vendor?.stripe?.accountId) {
                throw new GraphQLError("Practitioner payment setup is incomplete", {
                    extensions: { code: "STRIPE_NOT_CONFIGURED" },
                });
            }

            // Resolve items and validate inventory
            const saleItems: expoSaleItem_type[] = [];
            let subtotalAmount = 0;
            let currency = "AUD";

            for (const input of checkoutItems) {
                const item = await context.dataSources.cosmos.get_record<expoItem_type>(
                    EXPO_MODE_CONTAINER, input.itemId, expoId
                );
                if (!item || item.docType !== DOC_TYPE_EXPO_ITEM || !item.isActive) {
                    throw new GraphQLError(`Item not available`, { extensions: { code: "BAD_REQUEST" } });
                }

                if (item.trackInventory && item.quantityBrought != null) {
                    const available = item.quantityBrought - (item.quantitySold || 0);
                    if (input.quantity > available) {
                        throw new GraphQLError(`${item.itemName} only has ${available} left in stock`, {
                            extensions: { code: "BAD_REQUEST" },
                        });
                    }
                }

                const lineTotal = item.price.amount * input.quantity;
                currency = item.price.currency;

                saleItems.push({
                    itemId: item.id,
                    itemName: item.itemName,
                    quantity: input.quantity,
                    unitPrice: item.price,
                    lineTotal: { amount: lineTotal, currency },
                });

                subtotalAmount += lineTotal;
            }

            if (subtotalAmount <= 0) {
                throw new GraphQLError("Cart is empty", { extensions: { code: "BAD_REQUEST" } });
            }

            // Calculate platform fee
            const feeConfig = await getSpiriverseFeeConfig({ cosmos: context.dataSources.cosmos });
            const targetFee = getTargetFeeConfig("service-booking", feeConfig);
            const applicationFeeAmount = Math.round(subtotalAmount * (targetFee.percent / 100)) + (targetFee.fixed || 0);

            // Create PaymentIntent on connected account
            const connectedStripe = context.dataSources.stripe.asConnectedAccount(vendor.stripe.accountId);

            const saleId = uuidv4();
            const saleNumber = await getNextSaleNumber(context, expoId);

            const paymentIntentResult = await connectedStripe.callApi("POST", "payment_intents", {
                amount: subtotalAmount,
                currency: currency.toLowerCase(),
                automatic_payment_methods: { enabled: true },
                application_fee_amount: applicationFeeAmount,
                metadata: {
                    type: "EXPO_SALE",
                    expoId,
                    saleId,
                    vendorId: expo.vendorId,
                },
            });

            if (paymentIntentResult.status !== 200) {
                throw new GraphQLError("Failed to create payment", {
                    extensions: { code: "STRIPE_ERROR" },
                });
            }

            const now = DateTime.now().toISO()!;

            const sale: expoSale_type = {
                id: saleId,
                partitionKey: expoId,
                docType: DOC_TYPE_EXPO_SALE,
                expoId,
                vendorId: expo.vendorId,
                customerName: customerName?.trim() || undefined,
                customerEmail: customerEmail?.trim() || undefined,
                saleChannel: "QR",
                paymentMethod: "STRIPE",
                items: saleItems,
                subtotal: { amount: subtotalAmount, currency },
                saleStatus: "PENDING",
                saleNumber,
                stripePaymentIntentId: paymentIntentResult.data.id,
                stripePaymentIntentSecret: paymentIntentResult.data.client_secret,
                createdAt: now,
            };

            await context.dataSources.cosmos.add_record(
                EXPO_MODE_CONTAINER, sale, expoId, "system"
            );

            return {
                code: "200",
                success: true,
                message: "Checkout created",
                sale,
                clientSecret: paymentIntentResult.data.client_secret,
            };
        },
    },
};

export { resolvers };
