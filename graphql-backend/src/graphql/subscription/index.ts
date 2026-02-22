import { GraphQLError } from "graphql";
import { HTTPMethod, PatchOperation } from "@azure/cosmos";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { serverContext } from "../../services/azFunction";
import {
    vendor_type,
    subscription_tier,
    billing_status,
    billing_interval,
    billing_record_status,
    merchant_card_status,
} from "../vendor/types";
import {
    getTierFeatures,
    getTierPrice,
    getTierFeeKey,
    canUpgrade,
    canDowngrade,
    TierFeatures,
} from "./featureGates";

const VALID_TIERS: subscription_tier[] = ["awaken", "illuminate", "manifest", "transcend"];
const VALID_INTERVALS: billing_interval[] = [billing_interval.monthly, billing_interval.annual];

async function loadFeeConfig(context: serverContext): Promise<Record<string, any> | null> {
    const results = await context.dataSources.cosmos.run_query<any>("System-Settings", {
        query: `SELECT * FROM c WHERE c.id = @id AND c.docType = @docType`,
        parameters: [
            { name: "@id", value: "spiriverse" },
            { name: "@docType", value: "fees-config" },
        ],
    });
    return results.length > 0 ? results[0] : null;
}

async function loadTierDefinitions(context: serverContext): Promise<any | null> {
    const results = await context.dataSources.cosmos.run_query<any>("System-Settings", {
        query: `SELECT * FROM c WHERE c.id = @id AND c.docType = @docType`,
        parameters: [
            { name: "@id", value: "subscription-tier-definitions" },
            { name: "@docType", value: "subscription-config" },
        ],
    });
    return results.length > 0 ? results[0] : null;
}

const resolvers = {
    Query: {
        vendorSubscription: async (_: any, args: { vendorId: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.vendorId, args.vendorId);
            if (!vendor) throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });

            const sub = vendor.subscription;
            if (!sub) throw new GraphQLError("Vendor has no subscription", { extensions: { code: "NOT_FOUND" } });

            const tier = sub.subscriptionTier || "manifest";
            const tierFeatures = getTierFeatures(tier as subscription_tier);

            return {
                subscriptionTier: tier,
                billingInterval: sub.billingInterval || "monthly",
                billingStatus: sub.billingStatus || "pendingFirstBilling",
                cumulativePayouts: sub.cumulativePayouts || 0,
                subscriptionCostThreshold: sub.subscriptionCostThreshold || 0,
                firstBillingTriggeredAt: sub.firstBillingTriggeredAt,
                lastBilledAt: sub.lastBilledAt,
                subscriptionExpiresAt: sub.subscriptionExpiresAt,
                failedPaymentAttempts: sub.failedPaymentAttempts || 0,
                nextRetryAt: sub.nextRetryAt,
                lastPaymentAttemptAt: sub.lastPaymentAttemptAt,
                pendingDowngradeTo: sub.pendingDowngradeTo,
                downgradeEffectiveAt: sub.downgradeEffectiveAt,
                cardStatus: sub.card_status,
                paymentStatus: sub.payment_status,
                billingHistory: sub.billing_history || [],
                firstPayoutReceived: sub.first_payout_received,
                payoutsBlocked: sub.payouts_blocked,
                stripePaymentMethodId: sub.stripePaymentMethodId,
                tierFeatures,
                discountPercent: sub.discountPercent,
                waived: sub.waived,
                waivedUntil: sub.waivedUntil,
                overrideNotes: sub.overrideNotes,
            };
        },

        subscriptionTiers: async (_: any, args: { profileType?: string }, context: serverContext) => {
            const feeConfig = await loadFeeConfig(context);
            const tierDefs = await loadTierDefinitions(context);
            if (!tierDefs) throw new GraphQLError("Tier definitions not found", { extensions: { code: "NOT_FOUND" } });

            const result = [];
            for (const [tierKey, tierDef] of Object.entries(tierDefs.tiers) as [string, any][]) {
                if (args.profileType && tierDef.profileType !== args.profileType) continue;

                result.push({
                    tier: tierKey,
                    name: tierDef.name,
                    description: tierDef.description,
                    profileType: tierDef.profileType,
                    features: tierDef.features,
                    monthlyPrice: getTierPrice(tierKey as subscription_tier, "monthly", feeConfig),
                    annualPrice: getTierPrice(tierKey as subscription_tier, "annual", feeConfig),
                    currency: "AUD",
                });
            }

            return result;
        },

        subscriptionProration: async (_: any, args: { vendorId: string; targetTier: string; targetInterval?: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.vendorId, args.vendorId);
            if (!vendor?.subscription) throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });

            const sub = vendor.subscription;
            const currentTier = sub.subscriptionTier as subscription_tier;
            const targetTier = args.targetTier as subscription_tier;
            const currentInterval = (sub.billingInterval || "monthly") as billing_interval;
            const targetInterval = (args.targetInterval || currentInterval) as billing_interval;

            if (!VALID_TIERS.includes(targetTier)) {
                throw new GraphQLError("Invalid target tier", { extensions: { code: "BAD_REQUEST" } });
            }

            const feeConfig = await loadFeeConfig(context);
            const currentPrice = getTierPrice(currentTier, currentInterval || "monthly", feeConfig);
            const newPrice = getTierPrice(targetTier, targetInterval || "monthly", feeConfig);

            // Calculate proration based on remaining days in current period
            const now = DateTime.now();
            const expiresAt = sub.subscriptionExpiresAt ? DateTime.fromISO(sub.subscriptionExpiresAt) : now;
            const daysRemaining = Math.max(0, Math.ceil(expiresAt.diff(now, "days").days));

            const totalDaysInPeriod = currentInterval === "annual" ? 365 : 30;
            const dailyRate = currentPrice / totalDaysInPeriod;
            const credit = Math.round(dailyRate * daysRemaining);
            const prorationAmount = Math.max(0, newPrice - credit);

            return {
                currentTier,
                targetTier,
                currentInterval,
                targetInterval,
                daysRemaining,
                totalDaysInPeriod,
                currentPeriodCredit: credit,
                newPeriodCost: newPrice,
                prorationAmount,
                currency: "AUD",
            };
        },
    },

    Mutation: {
        selectVendorSubscriptionTier: async (_: any, args: { vendorId: string; tier: string; billingInterval: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const tier = args.tier as subscription_tier;
            const interval = args.billingInterval as billing_interval;
            if (!VALID_TIERS.includes(tier)) throw new GraphQLError("Invalid tier", { extensions: { code: "BAD_REQUEST" } });
            if (!VALID_INTERVALS.includes(interval)) throw new GraphQLError("Invalid billing interval", { extensions: { code: "BAD_REQUEST" } });

            const feeConfig = await loadFeeConfig(context);
            const monthlyPrice = getTierPrice(tier, "monthly", feeConfig);

            await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, [
                { op: "set", path: "/subscription/subscriptionTier", value: tier },
                { op: "set", path: "/subscription/billingInterval", value: interval },
                { op: "set", path: "/subscription/billingStatus", value: "pendingFirstBilling" as billing_status },
                { op: "set", path: "/subscription/cumulativePayouts", value: 0 },
                { op: "set", path: "/subscription/subscriptionCostThreshold", value: monthlyPrice },
                { op: "set", path: "/subscription/failedPaymentAttempts", value: 0 },
            ], context.userId);

            return { code: "200", success: true, message: `Subscription tier set to ${tier}` };
        },

        upgradeVendorSubscription: async (_: any, args: { vendorId: string; targetTier: string; targetInterval?: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.vendorId, args.vendorId);
            if (!vendor?.subscription) throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });

            const sub = vendor.subscription;
            const currentTier = sub.subscriptionTier as subscription_tier;
            const targetTier = args.targetTier as subscription_tier;
            if (!VALID_TIERS.includes(targetTier)) throw new GraphQLError("Invalid target tier", { extensions: { code: "BAD_REQUEST" } });
            if (!canUpgrade(currentTier, targetTier)) throw new GraphQLError("Cannot upgrade to a lower or equal tier", { extensions: { code: "BAD_REQUEST" } });

            const targetInterval = (args.targetInterval || sub.billingInterval || "monthly") as billing_interval;
            const feeConfig = await loadFeeConfig(context);

            // Calculate proration
            const now = DateTime.now();
            const currentInterval = (sub.billingInterval || "monthly") as billing_interval;
            const currentPrice = getTierPrice(currentTier, currentInterval || "monthly", feeConfig);
            const newPrice = getTierPrice(targetTier, targetInterval || "monthly", feeConfig);

            const expiresAt = sub.subscriptionExpiresAt ? DateTime.fromISO(sub.subscriptionExpiresAt) : now;
            const daysRemaining = Math.max(0, Math.ceil(expiresAt.diff(now, "days").days));
            const totalDaysInPeriod = currentInterval === "annual" ? 365 : 30;
            const dailyRate = currentPrice / totalDaysInPeriod;
            const credit = Math.round(dailyRate * daysRemaining);

            // Apply discount if applicable
            const discountMultiplier = 1 - (sub.discountPercent || 0) / 100;
            const rawProration = Math.max(0, newPrice - credit);
            const prorationAmount = Math.round(rawProration * discountMultiplier);

            // Charge proration if billing is active and vendor has a payment method
            if (prorationAmount > 0 && sub.billingStatus === "active" && sub.stripePaymentMethodId && vendor.stripe?.customerId) {
                const idempotencyKey = `upgrade_${args.vendorId}_${now.toISO()}`;
                const newPeriodEnd = now.plus(targetInterval === "annual" ? { years: 1 } : { months: 1 });

                const paymentResult = await context.dataSources.stripe.callApi("POST", "payment_intents", {
                    amount: prorationAmount,
                    currency: "aud",
                    customer: vendor.stripe.customerId,
                    payment_method: sub.stripePaymentMethodId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        merchantId: args.vendorId,
                        billing_type: "upgrade_proration",
                        from_tier: currentTier,
                        to_tier: targetTier,
                    },
                }, idempotencyKey);

                if (paymentResult.status !== 200 || paymentResult.data?.status !== "succeeded") {
                    throw new GraphQLError("Payment failed for upgrade proration", { extensions: { code: "PAYMENT_FAILED" } });
                }

                const billingRecord = {
                    id: uuidv4(),
                    date: now.toISO(),
                    amount: prorationAmount,
                    currency: "aud",
                    billingStatus: billing_record_status.success,
                    stripePaymentIntentId: paymentResult.data.id,
                    period_start: now.toISODate(),
                    period_end: newPeriodEnd.toISODate(),
                };

                const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
                    ? { op: "set" as const, path: "/subscription/billing_history", value: [billingRecord] }
                    : { op: "add" as const, path: "/subscription/billing_history/-", value: billingRecord };

                await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, [
                    { op: "set", path: "/subscription/subscriptionTier", value: targetTier },
                    { op: "set", path: "/subscription/billingInterval", value: targetInterval },
                    { op: "set", path: "/subscription/subscriptionExpiresAt", value: newPeriodEnd.toISO() },
                    { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
                    { op: "set", path: "/subscription/subscriptionCostThreshold", value: getTierPrice(targetTier, "monthly", feeConfig) },
                    { op: "set", path: "/subscription/pendingDowngradeTo", value: null },
                    { op: "set", path: "/subscription/downgradeEffectiveAt", value: null },
                    historyPatch,
                ], context.userId);

                return { code: "200", success: true, message: `Upgraded to ${targetTier}`, prorationCharged: prorationAmount, newTier: targetTier };
            }

            // If not yet billing-active, just update the tier
            await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, [
                { op: "set", path: "/subscription/subscriptionTier", value: targetTier },
                { op: "set", path: "/subscription/billingInterval", value: targetInterval },
                { op: "set", path: "/subscription/subscriptionCostThreshold", value: getTierPrice(targetTier, "monthly", feeConfig) },
                { op: "set", path: "/subscription/pendingDowngradeTo", value: null },
                { op: "set", path: "/subscription/downgradeEffectiveAt", value: null },
            ], context.userId);

            return { code: "200", success: true, message: `Upgraded to ${targetTier}`, prorationCharged: 0, newTier: targetTier };
        },

        requestVendorDowngrade: async (_: any, args: { vendorId: string; targetTier: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.vendorId, args.vendorId);
            if (!vendor?.subscription) throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });

            const currentTier = vendor.subscription.subscriptionTier as subscription_tier;
            const targetTier = args.targetTier as subscription_tier;
            if (!VALID_TIERS.includes(targetTier)) throw new GraphQLError("Invalid target tier", { extensions: { code: "BAD_REQUEST" } });
            if (!canDowngrade(currentTier, targetTier)) throw new GraphQLError("Cannot downgrade to a higher or equal tier", { extensions: { code: "BAD_REQUEST" } });

            // If Manifest target, check product count (max 15 on Manifest)
            if (targetTier === "manifest") {
                const productCount = await context.dataSources.cosmos.run_query<any>("Main-Products", {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.vendorId = @vendorId`,
                    parameters: [{ name: "@vendorId", value: args.vendorId }],
                });
                const count = productCount[0] || 0;
                if (count > 15) {
                    throw new GraphQLError(`Cannot downgrade to Manifest: you have ${count} products (max 15). Remove products before downgrading.`, {
                        extensions: { code: "BAD_REQUEST" },
                    });
                }
            }

            // Downgrade takes effect at end of current billing period
            const effectiveAt = vendor.subscription.subscriptionExpiresAt || DateTime.now().toISO();

            await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, [
                { op: "set", path: "/subscription/pendingDowngradeTo", value: targetTier },
                { op: "set", path: "/subscription/downgradeEffectiveAt", value: effectiveAt },
            ], context.userId);

            return { code: "200", success: true, message: `Downgrade to ${targetTier} scheduled`, effectiveAt };
        },

        cancelVendorDowngrade: async (_: any, args: { vendorId: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, [
                { op: "set", path: "/subscription/pendingDowngradeTo", value: null },
                { op: "set", path: "/subscription/downgradeEffectiveAt", value: null },
            ], context.userId);

            return { code: "200", success: true, message: "Pending downgrade cancelled" };
        },

        retryVendorPayment: async (_: any, args: { vendorId: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.vendorId, args.vendorId);
            if (!vendor?.subscription) throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });

            const sub = vendor.subscription;
            if (!sub.stripePaymentMethodId || !vendor.stripe?.customerId) {
                throw new GraphQLError("No payment method on file", { extensions: { code: "BAD_REQUEST" } });
            }

            // Safety: don't retry if last attempt was less than 1 hour ago
            if (sub.lastPaymentAttemptAt) {
                const lastAttempt = DateTime.fromISO(sub.lastPaymentAttemptAt);
                if (DateTime.now().diff(lastAttempt, "hours").hours < 1) {
                    throw new GraphQLError("Please wait at least 1 hour between payment attempts", { extensions: { code: "BAD_REQUEST" } });
                }
            }

            const feeConfig = await loadFeeConfig(context);
            const tier = sub.subscriptionTier as subscription_tier;
            const interval = (sub.billingInterval || "monthly") as billing_interval;
            const rawAmount = getTierPrice(tier, interval || "monthly", feeConfig);
            const discountMultiplier = 1 - (sub.discountPercent || 0) / 100;
            const amount = Math.round(rawAmount * discountMultiplier);

            if (amount <= 0) {
                throw new GraphQLError("Calculated amount is zero", { extensions: { code: "BAD_REQUEST" } });
            }

            const now = DateTime.now();
            const periodStart = now.toISODate();
            const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 }).toISODate();
            const idempotencyKey = `retry_${args.vendorId}_${periodStart}_${now.toMillis()}`;

            const paymentResult = await context.dataSources.stripe.callApi("POST", "payment_intents", {
                amount,
                currency: "aud",
                customer: vendor.stripe.customerId,
                payment_method: sub.stripePaymentMethodId,
                off_session: true,
                confirm: true,
                metadata: {
                    merchantId: args.vendorId,
                    billing_type: "manual_retry",
                    billing_period_start: periodStart,
                    billing_period_end: periodEnd,
                },
            }, idempotencyKey);

            const billingRecord = {
                id: uuidv4(),
                date: now.toISO(),
                amount,
                currency: "aud",
                period_start: periodStart,
                period_end: periodEnd,
            };

            if (paymentResult.status === 200 && paymentResult.data?.status === "succeeded") {
                const successRecord = {
                    ...billingRecord,
                    billingStatus: billing_record_status.success,
                    stripePaymentIntentId: paymentResult.data.id,
                };

                const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
                    ? { op: "set" as const, path: "/subscription/billing_history", value: [successRecord] }
                    : { op: "add" as const, path: "/subscription/billing_history/-", value: successRecord };

                const patches: PatchOperation[] = [
                    { op: "set", path: "/subscription/billingStatus", value: "active" as billing_status },
                    { op: "set", path: "/subscription/failedPaymentAttempts", value: 0 },
                    { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
                    { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
                    { op: "set", path: "/subscription/subscriptionExpiresAt", value: DateTime.fromISO(periodEnd).toISO() },
                    { op: "set", path: "/subscription/payouts_blocked", value: false },
                    historyPatch,
                ];

                await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, patches, context.userId);

                // Re-enable automatic payouts
                if (vendor.stripe?.accountId) {
                    await context.dataSources.stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                        settings: { payouts: { schedule: { interval: "daily" } } },
                    });
                }

                return { code: "200", success: true, message: "Payment successful", paymentSucceeded: true };
            } else {
                const errorMessage = paymentResult.data?.last_payment_error?.message || "Payment failed";
                const failureRecord = {
                    ...billingRecord,
                    billingStatus: billing_record_status.failed,
                    stripePaymentIntentId: paymentResult.data?.id,
                    error: errorMessage,
                };

                const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
                    ? { op: "set" as const, path: "/subscription/billing_history", value: [failureRecord] }
                    : { op: "add" as const, path: "/subscription/billing_history/-", value: failureRecord };

                await context.dataSources.cosmos.patch_record("Main-Vendor", args.vendorId, args.vendorId, [
                    { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
                    historyPatch,
                ], context.userId);

                return { code: "400", success: false, message: errorMessage, paymentSucceeded: false };
            }
        },

        createVendorSubscriptionSetupIntent: async (_: any, args: { vendorId: string }, context: serverContext) => {
            if (!context.userId) throw new GraphQLError("User must be authenticated", { extensions: { code: "UNAUTHENTICATED" } });

            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.vendorId, args.vendorId);
            if (!vendor) throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } });
            if (!vendor.stripe?.customerId) throw new GraphQLError("Vendor has no Stripe customer", { extensions: { code: "BAD_REQUEST" } });

            const setupIntentResp = await context.dataSources.stripe.callApi(HTTPMethod.post, "setup_intents", {
                customer: vendor.stripe.customerId,
                payment_method_types: ["card"],
                usage: "off_session",
                metadata: {
                    merchantId: args.vendorId,
                    purpose: "merchant_payment_method",
                },
            });

            if (setupIntentResp.status !== 200) {
                throw new GraphQLError("Failed to create setup intent", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
            }

            return {
                code: "200",
                success: true,
                message: "Setup intent created",
                clientSecret: setupIntentResp.data.client_secret,
            };
        },
    },
};

export { resolvers };
