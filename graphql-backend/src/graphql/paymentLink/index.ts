import { GraphQLError } from "graphql";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { serverContext } from "../../services/azFunction";
import { vendor_type, subscription_tier } from "../vendor/types";
import { user_type } from "../user/types";
import { paymentLink_type, paymentLinkItem_type, PaymentLinkStatus } from "./types";
import { getTierFeatures } from "../subscription/featureGates";
import { renderEmailTemplate } from "../email/utils";
import { sender_details } from "../../client/email_templates";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://spiriverse.com";

const VALID_EXPIRATION_HOURS = [24, 48, 168, 720]; // 1d, 2d, 7d, 30d
const DEFAULT_EXPIRATION_HOURS = 168; // 7 days

// ─── Helpers ────────────────────────────────────────────────────

async function getStripeAccountCountry(context: serverContext, accountId: string): Promise<string> {
    const account = await context.dataSources.stripe.callApi("GET", `accounts/${accountId}`);
    return account.data.country;
}

/**
 * Check if the authenticated user has any vendor profile whose tier grants hasPaymentLinks.
 * Returns the list of vendor profiles owned by the user.
 */
async function getUserVendorsWithPaymentLinks(
    context: serverContext
): Promise<{ hasAccess: boolean; vendors: vendor_type[] }> {
    if (!context.userId) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
    }

    const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", context.userId, context.userId);
    if (!user?.vendors || user.vendors.length === 0) {
        return { hasAccess: false, vendors: [] };
    }

    const vendors: vendor_type[] = [];
    let hasAccess = false;

    for (const vendorRef of user.vendors) {
        const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
            "Main-Vendor", (vendorRef as any).id, (vendorRef as any).id
        );
        if (!vendor) continue;
        vendors.push(vendor);

        const tier = vendor.subscription?.subscriptionTier as subscription_tier | undefined;
        if (tier) {
            const features = getTierFeatures(tier);
            if (features.hasPaymentLinks) {
                hasAccess = true;
            }
        }
    }

    return { hasAccess, vendors };
}

function isExpired(link: paymentLink_type): boolean {
    return DateTime.fromISO(link.expiresAt) < DateTime.now();
}

function formatAmount(amount: number, currency: string): string {
    return `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

// ─── Resolvers ──────────────────────────────────────────────────

const resolvers = {
    Query: {
        paymentLinks: async (_: any, args: { linkStatus?: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            let query = "SELECT * FROM c WHERE c.createdBy = @userId";
            const parameters: { name: string; value: any }[] = [
                { name: "@userId", value: context.userId },
            ];

            if (args.linkStatus) {
                query += " AND c.linkStatus = @linkStatus";
                parameters.push({ name: "@linkStatus", value: args.linkStatus });
            }

            query += " ORDER BY c.createdDate DESC";

            const links = await context.dataSources.cosmos.run_query<paymentLink_type>(
                "Main-PaymentLinks",
                { query, parameters },
                true // ignoreStatus since we don't use soft-delete status here
            );

            // Check expiration at query time
            return links.map((link) => {
                if (link.linkStatus === "SENT" && isExpired(link)) {
                    return { ...link, linkStatus: "EXPIRED" as PaymentLinkStatus };
                }
                if (link.linkStatus === "VIEWED" && isExpired(link)) {
                    return { ...link, linkStatus: "EXPIRED" as PaymentLinkStatus };
                }
                return link;
            });
        },

        paymentLinkCheckout: async (_: any, args: { linkId: string }, context: serverContext) => {
            // Public - no auth required
            const results = await context.dataSources.cosmos.run_query<paymentLink_type>(
                "Main-PaymentLinks",
                {
                    query: "SELECT * FROM c WHERE c.id = @id",
                    parameters: [{ name: "@id", value: args.linkId }],
                },
                true
            );

            if (results.length === 0) {
                throw new GraphQLError("Payment link not found", { extensions: { code: "NOT_FOUND" } });
            }

            const link = results[0];

            // Check if cancelled
            if (link.linkStatus === "CANCELLED") {
                throw new GraphQLError("This payment link has been cancelled", { extensions: { code: "CANCELLED" } });
            }

            // Check expiration
            if ((link.linkStatus === "SENT" || link.linkStatus === "VIEWED") && isExpired(link)) {
                return { ...link, linkStatus: "EXPIRED" as PaymentLinkStatus, vendorNames: [...new Set(link.items.map(i => i.vendorName))] };
            }

            // If already paid, return as-is
            if (link.linkStatus === "PAID") {
                return { ...link, vendorNames: [...new Set(link.items.map(i => i.vendorName))] };
            }

            // Mark as VIEWED on first access + create PaymentIntent lazily
            if (link.linkStatus === "SENT") {
                const now = DateTime.now().toISO();

                // Resolve or create Stripe customer from customerEmail
                const customer = await context.dataSources.stripe.resolveCustomer(link.customerEmail);

                // Build per-vendor breakdown for metadata
                const vendorBreakdown: Record<string, number> = {};
                for (const item of link.items) {
                    vendorBreakdown[item.vendorId] = (vendorBreakdown[item.vendorId] || 0) + item.amount.amount;
                }

                // Create a single PaymentIntent on the platform account
                const piResult = await context.dataSources.stripe.callApi("POST", "payment_intents", {
                    amount: link.totalAmount.amount,
                    currency: link.totalAmount.currency.toLowerCase(),
                    customer: customer.id,
                    metadata: {
                        paymentLinkId: link.id,
                        vendorBreakdown: JSON.stringify(vendorBreakdown),
                    },
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                if (piResult.status !== 200) {
                    throw new GraphQLError("Failed to create payment intent", { extensions: { code: "STRIPE_ERROR" } });
                }

                // Update the link document
                await context.dataSources.cosmos.patch_record(
                    "Main-PaymentLinks",
                    link.id,
                    link.createdBy,
                    [
                        { op: "set", path: "/linkStatus", value: "VIEWED" },
                        { op: "set", path: "/viewedAt", value: now },
                        { op: "set", path: "/stripePaymentIntentId", value: piResult.data.id },
                        { op: "set", path: "/stripePaymentIntentSecret", value: piResult.data.client_secret },
                    ],
                    "system"
                );

                return {
                    ...link,
                    linkStatus: "VIEWED" as PaymentLinkStatus,
                    viewedAt: now,
                    stripePaymentIntentSecret: piResult.data.client_secret,
                    vendorNames: [...new Set(link.items.map(i => i.vendorName))],
                };
            }

            // Already VIEWED - return existing client secret
            return {
                ...link,
                vendorNames: [...new Set(link.items.map(i => i.vendorName))],
            };
        },
    },

    Mutation: {
        createPaymentLink: async (_: any, args: { input: any }, context: serverContext) => {
            const { hasAccess, vendors } = await getUserVendorsWithPaymentLinks(context);
            if (!hasAccess) {
                throw new GraphQLError(
                    "Your current subscription does not include Payment Links. Please upgrade to Illuminate or higher.",
                    { extensions: { code: "FEATURE_GATED" } }
                );
            }

            const { customerEmail, customerName, items, expirationHours: inputExpHours } = args.input;

            if (!customerEmail || !items || items.length === 0) {
                throw new GraphQLError("Customer email and at least one item are required", { extensions: { code: "BAD_REQUEST" } });
            }

            const expirationHours = VALID_EXPIRATION_HOURS.includes(inputExpHours)
                ? inputExpHours
                : DEFAULT_EXPIRATION_HOURS;

            // Build item list with vendor names and validate ownership
            const vendorMap = new Map(vendors.map(v => [v.id, v]));
            const resolvedItems: paymentLinkItem_type[] = [];
            let totalAmount = 0;
            let currency = "";

            // If items span multiple vendors, validate all are in the same Stripe country
            const vendorIdsInItems = [...new Set(items.map((i: any) => i.vendorId))];
            if (vendorIdsInItems.length > 1) {
                const countries: string[] = [];
                for (const vid of vendorIdsInItems) {
                    const v = vendorMap.get(vid as string);
                    if (!v?.stripe?.accountId) {
                        throw new GraphQLError(`Vendor ${vid} does not have a Stripe account configured`, { extensions: { code: "STRIPE_NOT_CONFIGURED" } });
                    }
                    const country = await getStripeAccountCountry(context, v.stripe.accountId);
                    countries.push(country);
                }
                const uniqueCountries = [...new Set(countries)];
                if (uniqueCountries.length > 1) {
                    throw new GraphQLError(
                        `All vendor profiles must be in the same country for payment links. Found: ${uniqueCountries.join(", ")}`,
                        { extensions: { code: "REGION_MISMATCH" } }
                    );
                }
            }

            for (const item of items) {
                const vendor = vendorMap.get(item.vendorId);
                if (!vendor) {
                    throw new GraphQLError(`You do not own vendor profile ${item.vendorId}`, { extensions: { code: "FORBIDDEN" } });
                }

                const itemCurrency = item.amount.currency || "AUD";
                if (!currency) currency = itemCurrency;
                if (currency !== itemCurrency) {
                    throw new GraphQLError("All items must use the same currency", { extensions: { code: "BAD_REQUEST" } });
                }

                let sourceName: string | undefined;
                if (item.itemType === "SERVICE" && item.sourceId) {
                    const service = await context.dataSources.cosmos.get_record("Main-Listing", item.sourceId, item.vendorId);
                    sourceName = (service as any)?.name;
                } else if (item.itemType === "PRODUCT" && item.sourceId) {
                    const product = await context.dataSources.cosmos.get_record("Main-Listing", item.sourceId, item.vendorId);
                    sourceName = (product as any)?.name;
                }

                resolvedItems.push({
                    id: uuidv4(),
                    vendorId: item.vendorId,
                    vendorName: vendor.name,
                    itemType: item.itemType,
                    customDescription: item.customDescription,
                    sourceId: item.sourceId,
                    sourceName,
                    amount: { amount: item.amount.amount, currency: itemCurrency },
                });

                totalAmount += item.amount.amount;
            }

            const now = DateTime.now();
            const linkId = uuidv4();
            const expiresAt = now.plus({ hours: expirationHours }).toISO();

            const paymentLink: paymentLink_type = {
                id: linkId,
                createdBy: context.userId!,
                customerEmail,
                customerName,
                items: resolvedItems,
                totalAmount: { amount: totalAmount, currency },
                linkStatus: "SENT",
                expiresAt: expiresAt!,
                expirationHours,
                sentAt: now.toISO()!,
                createdDate: now.toISO()!,
            };

            await context.dataSources.cosmos.add_record("Main-PaymentLinks", paymentLink, context.userId!, context.userId!);

            // Build description for email
            const description = resolvedItems.map(i => {
                if (i.itemType === "CUSTOM") return i.customDescription || "Custom item";
                return i.sourceName || i.customDescription || i.itemType;
            }).join(", ");

            const paymentUrl = `${FRONTEND_URL}/pay/${linkId}`;

            // Send payment request email
            try {
                const emailContent = await renderEmailTemplate(context.dataSources, "payment-link-request", {
                    "vendor.name": resolvedItems[0].vendorName,
                    "customer.name": customerName ? ` ${customerName}` : "",
                    "payment.amount": formatAmount(totalAmount, currency),
                    "payment.description": description,
                    "payment.url": paymentUrl,
                    "payment.expiresAt": DateTime.fromISO(expiresAt!).toLocaleString(DateTime.DATETIME_FULL),
                });
                if (emailContent) {
                    await context.dataSources.email.sendRawHtmlEmail(
                        sender_details.from,
                        customerEmail,
                        emailContent.subject,
                        emailContent.html
                    );
                }
            } catch (emailError) {
                console.error("Failed to send payment link email:", emailError);
                // Don't fail the mutation - link is created
            }

            return {
                code: "200",
                success: true,
                message: "Payment link created and sent",
                paymentLink,
                paymentUrl,
            };
        },

        cancelPaymentLink: async (_: any, args: { linkId: string }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const link = await context.dataSources.cosmos.get_record<paymentLink_type>(
                "Main-PaymentLinks", args.linkId, context.userId
            );
            if (!link) {
                throw new GraphQLError("Payment link not found", { extensions: { code: "NOT_FOUND" } });
            }
            if (link.linkStatus === "PAID") {
                throw new GraphQLError("Cannot cancel a paid payment link", { extensions: { code: "BAD_REQUEST" } });
            }
            if (link.linkStatus === "CANCELLED") {
                return { code: "200", success: true, message: "Already cancelled", paymentLink: link };
            }

            // Cancel Stripe PaymentIntent if it exists
            if (link.stripePaymentIntentId) {
                try {
                    await context.dataSources.stripe.callApi("POST", `payment_intents/${link.stripePaymentIntentId}/cancel`, {});
                } catch (err) {
                    console.error("Failed to cancel Stripe PaymentIntent:", err);
                }
            }

            await context.dataSources.cosmos.patch_record(
                "Main-PaymentLinks",
                args.linkId,
                context.userId,
                [{ op: "set", path: "/linkStatus", value: "CANCELLED" }],
                context.userId
            );

            return {
                code: "200",
                success: true,
                message: "Payment link cancelled",
                paymentLink: { ...link, linkStatus: "CANCELLED" },
            };
        },

        resendPaymentLink: async (_: any, args: { linkId: string; resetExpiration?: boolean }, context: serverContext) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }

            const link = await context.dataSources.cosmos.get_record<paymentLink_type>(
                "Main-PaymentLinks", args.linkId, context.userId
            );
            if (!link) {
                throw new GraphQLError("Payment link not found", { extensions: { code: "NOT_FOUND" } });
            }
            if (link.linkStatus === "PAID" || link.linkStatus === "CANCELLED") {
                throw new GraphQLError(`Cannot resend a ${link.linkStatus.toLowerCase()} payment link`, { extensions: { code: "BAD_REQUEST" } });
            }

            const patchOps: any[] = [];
            let updatedLink = { ...link };

            if (args.resetExpiration) {
                const newExpiresAt = DateTime.now().plus({ hours: link.expirationHours }).toISO();
                patchOps.push({ op: "set", path: "/expiresAt", value: newExpiresAt });
                updatedLink.expiresAt = newExpiresAt!;
            }

            if (patchOps.length > 0) {
                await context.dataSources.cosmos.patch_record(
                    "Main-PaymentLinks",
                    args.linkId,
                    context.userId,
                    patchOps,
                    context.userId
                );
            }

            // Re-send the email
            const description = link.items.map(i => {
                if (i.itemType === "CUSTOM") return i.customDescription || "Custom item";
                return i.sourceName || i.customDescription || i.itemType;
            }).join(", ");

            const paymentUrl = `${FRONTEND_URL}/pay/${link.id}`;

            try {
                const emailContent = await renderEmailTemplate(context.dataSources, "payment-link-request", {
                    "vendor.name": link.items[0].vendorName,
                    "customer.name": link.customerName ? ` ${link.customerName}` : "",
                    "payment.amount": formatAmount(link.totalAmount.amount, link.totalAmount.currency),
                    "payment.description": description,
                    "payment.url": paymentUrl,
                    "payment.expiresAt": DateTime.fromISO(updatedLink.expiresAt).toLocaleString(DateTime.DATETIME_FULL),
                });
                if (emailContent) {
                    await context.dataSources.email.sendRawHtmlEmail(
                        sender_details.from,
                        link.customerEmail,
                        emailContent.subject,
                        emailContent.html
                    );
                }
            } catch (emailError) {
                console.error("Failed to resend payment link email:", emailError);
            }

            return {
                code: "200",
                success: true,
                message: "Payment link resent",
                paymentLink: updatedLink,
            };
        },
    },
};

export { resolvers };
