import NodeCache from "node-cache";
import { InvocationContext, Timer, app } from "@azure/functions";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { vendor_type, billing_record_status, subscription_tier, billing_status } from "../graphql/vendor/types";
import { CosmosDataSource } from "../utils/database";
import { StripeDataSource } from "../services/stripe";
import { AzureEmailDataSource } from "../services/azureEmail";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import { sender_details } from "../client/email_templates";
import { getTierFeeKey } from "../graphql/subscription/featureGates";

const myCache = new NodeCache();

type FeeConfigEntry = { percent: number; fixed: number; currency: string };

function getTierAmount(
    tier: subscription_tier,
    interval: 'monthly' | 'annual',
    feeConfig: Record<string, FeeConfigEntry> | null
): number {
    if (!feeConfig) return 0;
    const key = getTierFeeKey(tier, interval);
    const entry = feeConfig[key];
    return entry?.fixed ?? 0;
}

/**
 * Tier-Based Billing Processor
 *
 * Runs twice daily (7am UTC & 3pm UTC) with four passes:
 * 1. First-billing trigger: pendingFirstBilling vendors whose cumulative payouts >= threshold
 * 2. Due renewals: active subscriptions nearing expiry (within 3 days)
 * 3. Retries: failed payments with retry scheduled
 * 4. Pending downgrades: apply tier changes whose effective date has passed
 */
export async function billingProcessor(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Billing processor started at:', new Date().toISOString());

    try {
        const host = process.env.WEBSITE_HOSTNAME || 'localhost:7071';
        const logger = new LogManager(context);
        const keyVault = new vault(host, logger, myCache);

        const cosmos = new CosmosDataSource(logger, keyVault);
        const stripe = new StripeDataSource(logger, keyVault);
        const email = new AzureEmailDataSource(logger, keyVault);

        await cosmos.init(host);
        await stripe.init();
        await email.init(host);
        email.setDataSources({ cosmos });

        const now = DateTime.now();
        const nowISO = now.toISO();
        const todayISO = now.toISODate();

        // Load fee config
        let feeConfig: Record<string, FeeConfigEntry> | null = null;
        try {
            const feeResults = await cosmos.run_query<any>("System-Settings", {
                query: `SELECT * FROM c WHERE c.id = @id AND c.docType = @docType`,
                parameters: [
                    { name: "@id", value: "spiriverse" },
                    { name: "@docType", value: "fees-config" },
                ]
            });
            if (feeResults.length > 0) {
                feeConfig = feeResults[0];
                context.log("Loaded fee config");
            }
        } catch (error) {
            context.log("Failed to load fee config");
        }

        // ========================================
        // Pass 1: First-billing trigger
        // Vendors in pendingFirstBilling whose cumulative payouts >= threshold and have a payment method
        // ========================================
        context.log('Pass 1: Querying for first-billing triggers...');

        const firstBillingVendors = await cosmos.run_query<vendor_type>("Main-Vendor", {
            query: `
                SELECT * FROM c
                WHERE c.subscription.billingStatus = "pendingFirstBilling"
                AND c.subscription.cumulativePayouts >= c.subscription.subscriptionCostThreshold
                AND IS_DEFINED(c.subscription.stripePaymentMethodId)
                AND c.subscription.stripePaymentMethodId != null
            `,
            parameters: []
        }, true);

        context.log(`Pass 1: Found ${firstBillingVendors.length} vendors ready for first billing`);

        for (const vendor of firstBillingVendors) {
            try {
                await processFirstBilling(vendor, cosmos, stripe, email, context, feeConfig, now);
            } catch (error) {
                context.error(`Pass 1: Failed for vendor ${vendor.id}:`, error);
            }
        }

        // ========================================
        // Pass 2: Due renewals
        // Active subscriptions whose subscriptionExpiresAt is within 3 days
        // ========================================
        context.log('Pass 2: Querying for due renewals...');

        const threeDaysFromNow = now.plus({ days: 3 }).toISO();

        const dueRenewals = await cosmos.run_query<vendor_type>("Main-Vendor", {
            query: `
                SELECT * FROM c
                WHERE c.subscription.billingStatus = "active"
                AND c.subscription.subscriptionExpiresAt <= @cutoff
                AND c.subscription.failedPaymentAttempts = 0
                AND IS_DEFINED(c.subscription.stripePaymentMethodId)
            `,
            parameters: [
                { name: "@cutoff", value: threeDaysFromNow }
            ]
        }, true);

        context.log(`Pass 2: Found ${dueRenewals.length} vendors with due renewals`);

        for (const vendor of dueRenewals) {
            try {
                await processRenewal(vendor, cosmos, stripe, email, context, feeConfig, now);
            } catch (error) {
                context.error(`Pass 2: Failed for vendor ${vendor.id}:`, error);
            }
        }

        // ========================================
        // Pass 3: Retries
        // Failed payments with nextRetryAt <= now and failedPaymentAttempts < 3
        // ========================================
        context.log('Pass 3: Querying for payment retries...');

        const retryVendors = await cosmos.run_query<vendor_type>("Main-Vendor", {
            query: `
                SELECT * FROM c
                WHERE c.subscription.failedPaymentAttempts > 0
                AND c.subscription.failedPaymentAttempts < 3
                AND c.subscription.nextRetryAt <= @now
                AND IS_DEFINED(c.subscription.stripePaymentMethodId)
            `,
            parameters: [
                { name: "@now", value: nowISO }
            ]
        }, true);

        context.log(`Pass 3: Found ${retryVendors.length} vendors with pending retries`);

        for (const vendor of retryVendors) {
            try {
                await processRetry(vendor, cosmos, stripe, email, context, feeConfig, now);
            } catch (error) {
                context.error(`Pass 3: Failed for vendor ${vendor.id}:`, error);
            }
        }

        // ========================================
        // Pass 4: Pending downgrades
        // Vendors with a pending downgrade whose effective date has passed
        // ========================================
        context.log('Pass 4: Querying for pending downgrades...');

        const pendingDowngrades = await cosmos.run_query<vendor_type>("Main-Vendor", {
            query: `
                SELECT * FROM c
                WHERE IS_DEFINED(c.subscription.pendingDowngradeTo)
                AND c.subscription.pendingDowngradeTo != null
                AND c.subscription.downgradeEffectiveAt <= @now
            `,
            parameters: [
                { name: "@now", value: nowISO }
            ]
        }, true);

        context.log(`Pass 4: Found ${pendingDowngrades.length} vendors with pending downgrades`);

        for (const vendor of pendingDowngrades) {
            try {
                await applyDowngrade(vendor, cosmos, email, context, feeConfig);
            } catch (error) {
                context.error(`Pass 4: Failed for vendor ${vendor.id}:`, error);
            }
        }

        context.log('Billing processor completed at:', new Date().toISOString());
    } catch (error) {
        context.error('Billing processor failed:', error);
        throw error;
    }
}

// ─── Pass 1: First Billing ──────────────────────────────────────

async function processFirstBilling(
    vendor: vendor_type,
    cosmos: CosmosDataSource,
    stripe: StripeDataSource,
    email: AzureEmailDataSource,
    context: InvocationContext,
    feeConfig: Record<string, FeeConfigEntry> | null,
    now: DateTime
): Promise<void> {
    const sub = vendor.subscription;
    if (!sub?.stripePaymentMethodId || !vendor.stripe?.customerId) return;

    const tier = sub.subscriptionTier as subscription_tier;
    const interval = (sub.billingInterval || "monthly") as 'monthly' | 'annual';

    // Check waiver
    if (sub.waived) {
        if (sub.waivedUntil && DateTime.fromISO(sub.waivedUntil) < now) {
            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "remove", path: "/subscription/waived" },
                { op: "remove", path: "/subscription/waivedUntil" },
            ], "BILLING_PROCESSOR");
        } else {
            context.log(`Vendor ${vendor.id} is waived - activating without charge`);
            const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "set", path: "/subscription/billingStatus", value: "active" as billing_status },
                { op: "set", path: "/subscription/firstBillingTriggeredAt", value: now.toISO() },
                { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
                { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
            ], "BILLING_PROCESSOR");
            return;
        }
    }

    const rawAmount = getTierAmount(tier, interval, feeConfig);
    const discountMultiplier = 1 - (sub.discountPercent || 0) / 100;
    const amount = Math.round(rawAmount * discountMultiplier);

    if (amount <= 0) {
        const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/billingStatus", value: "active" as billing_status },
            { op: "set", path: "/subscription/firstBillingTriggeredAt", value: now.toISO() },
            { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
            { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
        ], "BILLING_PROCESSOR");
        return;
    }

    // Safety: don't charge if last attempt was < 1 hour ago
    if (sub.lastPaymentAttemptAt && now.diff(DateTime.fromISO(sub.lastPaymentAttemptAt), "hours").hours < 1) {
        context.log(`Vendor ${vendor.id} last attempt too recent - skipping`);
        return;
    }

    const periodStart = now.toISODate();
    const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
    const idempotencyKey = `first_billing_${vendor.id}_${periodStart}`;

    context.log(`First billing for vendor ${vendor.id}: ${amount} AUD`);

    const paymentResult = await stripe.callApi("POST", "payment_intents", {
        amount,
        currency: "aud",
        customer: vendor.stripe.customerId,
        payment_method: sub.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
            merchantId: vendor.id,
            billing_period_start: periodStart,
            billing_period_end: periodEnd.toISODate(),
            billing_type: "first_billing",
        }
    }, idempotencyKey);

    const billingRecord = {
        id: uuidv4(),
        date: now.toISO(),
        amount,
        currency: "aud",
        period_start: periodStart,
        period_end: periodEnd.toISODate(),
    };

    if (paymentResult.status === 200 && paymentResult.data?.status === "succeeded") {
        context.log(`First billing succeeded for vendor ${vendor.id}`);

        const successRecord = {
            ...billingRecord,
            billingStatus: billing_record_status.success,
            stripePaymentIntentId: paymentResult.data.id,
        };

        const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
            ? { op: "set" as const, path: "/subscription/billing_history", value: [successRecord] }
            : { op: "add" as const, path: "/subscription/billing_history/-", value: successRecord };

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/billingStatus", value: "active" as billing_status },
            { op: "set", path: "/subscription/firstBillingTriggeredAt", value: now.toISO() },
            { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
            { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
            { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
            { op: "set", path: "/subscription/failedPaymentAttempts", value: 0 },
            { op: "set", path: "/subscription/payment_status", value: "success" },
            historyPatch,
        ], "BILLING_PROCESSOR");

        await sendBillingEmail(email, vendor, "subscription-payment-succeeded", {
            "payment.amount": formatCurrency(amount),
            "payment.nextBillingDate": periodEnd.toFormat("dd MMMM yyyy"),
        }, context);
    } else {
        await handlePaymentFailure(vendor, sub, cosmos, stripe, email, context, now, billingRecord, paymentResult);
    }
}

// ─── Pass 2: Renewal ────────────────────────────────────────────

async function processRenewal(
    vendor: vendor_type,
    cosmos: CosmosDataSource,
    stripe: StripeDataSource,
    email: AzureEmailDataSource,
    context: InvocationContext,
    feeConfig: Record<string, FeeConfigEntry> | null,
    now: DateTime
): Promise<void> {
    const sub = vendor.subscription;
    if (!sub?.stripePaymentMethodId || !vendor.stripe?.customerId) return;

    const tier = sub.subscriptionTier as subscription_tier;
    const interval = (sub.billingInterval || "monthly") as 'monthly' | 'annual';

    // Check waiver
    if (sub.waived) {
        if (sub.waivedUntil && DateTime.fromISO(sub.waivedUntil) < now) {
            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "remove", path: "/subscription/waived" },
                { op: "remove", path: "/subscription/waivedUntil" },
            ], "BILLING_PROCESSOR");
        } else {
            const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
            context.log(`Vendor ${vendor.id} is waived - extending period to ${periodEnd.toISO()}`);
            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
                { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
                { op: "set", path: "/subscription/payment_status", value: "success" },
            ], "BILLING_PROCESSOR");
            return;
        }
    }

    const rawAmount = getTierAmount(tier, interval, feeConfig);
    const discountMultiplier = 1 - (sub.discountPercent || 0) / 100;
    const amount = Math.round(rawAmount * discountMultiplier);

    if (amount <= 0) {
        const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
            { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
            { op: "set", path: "/subscription/payment_status", value: "success" },
        ], "BILLING_PROCESSOR");
        return;
    }

    if (sub.lastPaymentAttemptAt && now.diff(DateTime.fromISO(sub.lastPaymentAttemptAt), "hours").hours < 1) {
        context.log(`Vendor ${vendor.id} last attempt too recent - skipping`);
        return;
    }

    const periodStart = now.toISODate();
    const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
    const idempotencyKey = `renewal_${vendor.id}_${periodStart}`;

    context.log(`Renewal for vendor ${vendor.id}: ${amount} AUD`);

    const paymentResult = await stripe.callApi("POST", "payment_intents", {
        amount,
        currency: "aud",
        customer: vendor.stripe.customerId,
        payment_method: sub.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
            merchantId: vendor.id,
            billing_period_start: periodStart,
            billing_period_end: periodEnd.toISODate(),
            billing_type: "renewal",
        }
    }, idempotencyKey);

    const billingRecord = {
        id: uuidv4(),
        date: now.toISO(),
        amount,
        currency: "aud",
        period_start: periodStart,
        period_end: periodEnd.toISODate(),
    };

    if (paymentResult.status === 200 && paymentResult.data?.status === "succeeded") {
        context.log(`Renewal succeeded for vendor ${vendor.id}`);

        const successRecord = {
            ...billingRecord,
            billingStatus: billing_record_status.success,
            stripePaymentIntentId: paymentResult.data.id,
        };

        const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
            ? { op: "set" as const, path: "/subscription/billing_history", value: [successRecord] }
            : { op: "add" as const, path: "/subscription/billing_history/-", value: successRecord };

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
            { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
            { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
            { op: "set", path: "/subscription/failedPaymentAttempts", value: 0 },
            { op: "set", path: "/subscription/payment_status", value: "success" },
            historyPatch,
        ], "BILLING_PROCESSOR");

        await sendBillingEmail(email, vendor, "subscription-payment-succeeded", {
            "payment.amount": formatCurrency(amount),
            "payment.nextBillingDate": periodEnd.toFormat("dd MMMM yyyy"),
        }, context);
    } else {
        await handlePaymentFailure(vendor, sub, cosmos, stripe, email, context, now, billingRecord, paymentResult);
    }
}

// ─── Pass 3: Retry ──────────────────────────────────────────────

async function processRetry(
    vendor: vendor_type,
    cosmos: CosmosDataSource,
    stripe: StripeDataSource,
    email: AzureEmailDataSource,
    context: InvocationContext,
    feeConfig: Record<string, FeeConfigEntry> | null,
    now: DateTime
): Promise<void> {
    const sub = vendor.subscription;
    if (!sub?.stripePaymentMethodId || !vendor.stripe?.customerId) return;

    const tier = sub.subscriptionTier as subscription_tier;
    const interval = (sub.billingInterval || "monthly") as 'monthly' | 'annual';

    const rawAmount = getTierAmount(tier, interval, feeConfig);
    const discountMultiplier = 1 - (sub.discountPercent || 0) / 100;
    const amount = Math.round(rawAmount * discountMultiplier);

    if (amount <= 0) return;

    if (sub.lastPaymentAttemptAt && now.diff(DateTime.fromISO(sub.lastPaymentAttemptAt), "hours").hours < 1) {
        context.log(`Vendor ${vendor.id} last attempt too recent - skipping retry`);
        return;
    }

    const periodStart = now.toISODate();
    const periodEnd = now.plus(interval === "annual" ? { years: 1 } : { months: 1 });
    const idempotencyKey = `retry_${vendor.id}_${periodStart}_${now.toMillis()}`;

    context.log(`Retry (attempt ${(sub.failedPaymentAttempts || 0) + 1}) for vendor ${vendor.id}: ${amount} AUD`);

    const paymentResult = await stripe.callApi("POST", "payment_intents", {
        amount,
        currency: "aud",
        customer: vendor.stripe.customerId,
        payment_method: sub.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
            merchantId: vendor.id,
            billing_period_start: periodStart,
            billing_period_end: periodEnd.toISODate(),
            billing_type: "retry",
        }
    }, idempotencyKey);

    const billingRecord = {
        id: uuidv4(),
        date: now.toISO(),
        amount,
        currency: "aud",
        period_start: periodStart,
        period_end: periodEnd.toISODate(),
    };

    if (paymentResult.status === 200 && paymentResult.data?.status === "succeeded") {
        context.log(`Retry succeeded for vendor ${vendor.id}`);

        const successRecord = {
            ...billingRecord,
            billingStatus: billing_record_status.success,
            stripePaymentIntentId: paymentResult.data.id,
        };

        const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
            ? { op: "set" as const, path: "/subscription/billing_history", value: [successRecord] }
            : { op: "add" as const, path: "/subscription/billing_history/-", value: successRecord };

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/billingStatus", value: "active" as billing_status },
            { op: "set", path: "/subscription/subscriptionExpiresAt", value: periodEnd.toISO() },
            { op: "set", path: "/subscription/lastBilledAt", value: now.toISO() },
            { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
            { op: "set", path: "/subscription/failedPaymentAttempts", value: 0 },
            { op: "set", path: "/subscription/payment_status", value: "success" },
            { op: "set", path: "/subscription/payouts_blocked", value: false },
            { op: "set", path: "/subscription/nextRetryAt", value: null },
            historyPatch,
        ], "BILLING_PROCESSOR");

        // Re-enable automatic payouts
        if (vendor.stripe?.accountId) {
            try {
                await stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                    settings: { payouts: { schedule: { interval: "daily" } } },
                });
            } catch (e) {
                context.error(`Failed to re-enable payouts for vendor ${vendor.id}:`, e);
            }
        }

        await sendBillingEmail(email, vendor, "subscription-payment-succeeded", {
            "payment.amount": formatCurrency(amount),
            "payment.nextBillingDate": periodEnd.toFormat("dd MMMM yyyy"),
        }, context);
    } else {
        await handlePaymentFailure(vendor, sub, cosmos, stripe, email, context, now, billingRecord, paymentResult);
    }
}

// ─── Pass 4: Downgrade ──────────────────────────────────────────

async function applyDowngrade(
    vendor: vendor_type,
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    context: InvocationContext,
    feeConfig: Record<string, FeeConfigEntry> | null
): Promise<void> {
    const sub = vendor.subscription;
    if (!sub?.pendingDowngradeTo) return;

    const fromTier = sub.subscriptionTier;
    const toTier = sub.pendingDowngradeTo as subscription_tier;
    const interval = (sub.billingInterval || "monthly") as 'monthly' | 'annual';
    const newThreshold = getTierAmount(toTier, "monthly", feeConfig);

    context.log(`Applying downgrade for vendor ${vendor.id}: ${fromTier} -> ${toTier}`);

    await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
        { op: "set", path: "/subscription/subscriptionTier", value: toTier },
        { op: "set", path: "/subscription/subscriptionCostThreshold", value: newThreshold },
        { op: "set", path: "/subscription/pendingDowngradeTo", value: null },
        { op: "set", path: "/subscription/downgradeEffectiveAt", value: null },
    ], "BILLING_PROCESSOR");

    await sendBillingEmail(email, vendor, "subscription-downgrade-effective", {
        "downgrade.fromTier": capitalize(fromTier),
        "downgrade.toTier": capitalize(toTier),
        "subscription.interval": interval,
        "subscription.price": formatCurrency(getTierAmount(toTier, interval, feeConfig)),
    }, context);
}

// ─── Shared: Payment Failure Handler ────────────────────────────

async function handlePaymentFailure(
    vendor: vendor_type,
    sub: vendor_type['subscription'],
    cosmos: CosmosDataSource,
    stripe: StripeDataSource,
    email: AzureEmailDataSource,
    context: InvocationContext,
    now: DateTime,
    billingRecord: any,
    paymentResult: any
): Promise<void> {
    const currentAttempts = sub.failedPaymentAttempts || 0;
    const newAttempts = currentAttempts + 1;
    const errorMessage = paymentResult.data?.last_payment_error?.message
        || paymentResult.data?.error?.message
        || `Payment failed with status ${paymentResult.status}`;

    context.log(`Payment failed for vendor ${vendor.id} (attempt ${newAttempts}): ${errorMessage}`);

    const failureRecord = {
        ...billingRecord,
        billingStatus: billing_record_status.failed,
        stripePaymentIntentId: paymentResult.data?.id,
        error: errorMessage,
    };

    const historyPatch = (!sub.billing_history || sub.billing_history.length === 0)
        ? { op: "set" as const, path: "/subscription/billing_history", value: [failureRecord] }
        : { op: "add" as const, path: "/subscription/billing_history/-", value: failureRecord };

    if (newAttempts >= 3) {
        // 3rd failure - suspend account
        context.log(`3rd failure for vendor ${vendor.id} - suspending`);

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/billingStatus", value: "suspended" as billing_status },
            { op: "set", path: "/subscription/failedPaymentAttempts", value: newAttempts },
            { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
            { op: "set", path: "/subscription/payment_status", value: "failed" },
            { op: "set", path: "/subscription/payouts_blocked", value: true },
            { op: "set", path: "/subscription/nextRetryAt", value: null },
            historyPatch,
        ], "BILLING_PROCESSOR");

        // Switch to manual payouts
        if (vendor.stripe?.accountId) {
            try {
                await stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                    settings: { payouts: { schedule: { interval: "manual" } } },
                });
                context.log(`Switched vendor ${vendor.id} to manual payouts`);
            } catch (e) {
                context.error(`Failed to switch vendor ${vendor.id} to manual payouts:`, e);
            }
        }

        await sendBillingEmail(email, vendor, "subscription-payment-failed-final", {}, context);
        await sendBillingEmail(email, vendor, "subscription-account-suspended", {}, context);
    } else {
        // Smart retry schedule
        let nextRetry: DateTime;
        let emailTemplate: string;

        if (newAttempts === 1) {
            // 1st fail: retry same day afternoon or next morning
            const currentHour = now.hour;
            if (currentHour < 12) {
                nextRetry = now.set({ hour: 15, minute: 0, second: 0 }); // afternoon today
            } else {
                nextRetry = now.plus({ days: 1 }).set({ hour: 7, minute: 0, second: 0 }); // next morning
            }
            emailTemplate = "subscription-payment-failed-first";
        } else {
            // 2nd fail: retry 3 days later at 7am
            nextRetry = now.plus({ days: 3 }).set({ hour: 7, minute: 0, second: 0 });
            emailTemplate = "subscription-payment-failed-second";
        }

        context.log(`Scheduling retry for vendor ${vendor.id} at ${nextRetry.toISO()}`);

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/failedPaymentAttempts", value: newAttempts },
            { op: "set", path: "/subscription/lastPaymentAttemptAt", value: now.toISO() },
            { op: "set", path: "/subscription/payment_status", value: "failed" },
            { op: "set", path: "/subscription/nextRetryAt", value: nextRetry.toISO() },
            historyPatch,
        ], "BILLING_PROCESSOR");

        const tier = sub.subscriptionTier as subscription_tier;
        const interval = (sub.billingInterval || "monthly") as 'monthly' | 'annual';
        await sendBillingEmail(email, vendor, emailTemplate, {
            "payment.amount": formatCurrency(billingRecord.amount),
        }, context);
    }
}

// ─── Helpers ────────────────────────────────────────────────────

async function sendBillingEmail(
    email: AzureEmailDataSource,
    vendor: vendor_type,
    templateId: string,
    extraVars: Record<string, string>,
    context: InvocationContext
): Promise<void> {
    const recipientEmail = vendor.contact?.internal?.email || vendor.contact?.public?.email;
    if (!recipientEmail) {
        context.log(`No email for vendor ${vendor.id} - skipping email`);
        return;
    }

    try {
        await email.sendEmail(
            sender_details.from,
            recipientEmail,
            templateId,
            {
                "vendor.name": vendor.name,
                "vendor.contactName": vendor.name,
                "dashboardUrl": `https://www.spiriverse.com/m/${vendor.slug}/manage`,
                ...extraVars,
            }
        );
    } catch (e) {
        context.log(`Failed to send ${templateId} email for vendor ${vendor.id}: ${e}`);
    }
}

function formatCurrency(amountCents: number): string {
    return `$${(amountCents / 100).toFixed(2)} AUD`;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Register two timer functions for twice-daily billing
app.timer('billingProcessorMorning', {
    schedule: '0 0 7 * * *',  // 7am UTC
    handler: billingProcessor,
});

app.timer('billingProcessorAfternoon', {
    schedule: '0 0 15 * * *', // 3pm UTC
    handler: billingProcessor,
});
