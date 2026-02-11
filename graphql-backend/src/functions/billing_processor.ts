import NodeCache from "node-cache";
import { InvocationContext, Timer, app } from "@azure/functions";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { vendor_type, billing_record_status, plan_type } from "../graphql/vendor/types";
import { CosmosDataSource } from "../utils/database";
import { StripeDataSource } from "../services/stripe";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";

const myCache = new NodeCache();

/**
 * Normalizes a plan name to a fee config key.
 * e.g. "SpiriVerse Core" -> "subscription-spiriverse-core"
 */
function planNameToFeeKey(name: string): string {
    return "subscription-" + name.toLowerCase().replace(/\s+/g, "-");
}

type FeeConfigEntry = { percent: number; fixed: number; currency: string };

/**
 * Looks up the current price for a plan from the fee config.
 * Returns the fee config fixed amount if found, otherwise falls back to the vendor's stored price.
 */
function getPlanAmount(plan: plan_type, feeConfig: Record<string, FeeConfigEntry> | null): number {
    if (feeConfig) {
        const key = planNameToFeeKey(plan.name);
        const entry = feeConfig[key];
        if (entry && typeof entry.fixed === "number" && entry.fixed > 0) {
            return entry.fixed;
        }
    }
    return plan.price.amount;
}

/**
 * Self-Managed Billing Processor
 *
 * Runs daily at 6am AEST (8pm UTC) to charge merchants via PaymentIntents.
 *
 * Two query passes:
 * 1. Due billings: card_status = "saved", next_billing_date <= today, no stripeSubscriptionId
 * 2. Retries: payment_status = "failed", payment_retry_count < 3
 *
 * Per vendor:
 * - Sum plan amounts
 * - Create PaymentIntent (off_session, confirm) with idempotency key
 * - Success: advance next_billing_date, reset retry count, append to billing_history
 * - Failure: increment retry count, set next_billing_date = now + 3 days
 * - 3rd failure: set payouts_blocked = true, switch connected account to manual payouts
 */
export async function billingProcessor(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Billing processor started at:', new Date().toISOString());

    try {
        const host = process.env.WEBSITE_HOSTNAME || 'localhost:7071';
        const logger = new LogManager(context);
        const keyVault = new vault(host, logger, myCache);

        const cosmos = new CosmosDataSource(logger, keyVault);
        const stripe = new StripeDataSource(logger, keyVault);

        await cosmos.init(host);
        await stripe.init();

        const today = DateTime.now().toISODate();

        // Load fee config for current subscription plan prices
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
                context.log("Loaded fee config for subscription pricing");
            } else {
                context.log("Fee config not found – using vendor-stored prices");
            }
        } catch (error) {
            context.log("Failed to load fee config – using vendor-stored prices");
        }

        // ========================================
        // Pass 1: Due billings (new charges)
        // ========================================
        context.log('Querying for due billings...');

        const dueBillings = await cosmos.run_query<vendor_type>("Main-Vendor", {
            query: `
                SELECT * FROM c
                WHERE c.subscription.card_status = "saved"
                AND c.subscription.next_billing_date <= @today
                AND (c.subscription.payment_status != "failed" OR NOT IS_DEFINED(c.subscription.payment_status))
                AND NOT IS_DEFINED(c.subscription.stripeSubscriptionId)
                AND IS_DEFINED(c.subscription.saved_payment_method)
            `,
            parameters: [
                { name: "@today", value: today }
            ]
        }, true);

        context.log(`Found ${dueBillings.length} merchants with due billings`);

        for (const vendor of dueBillings) {
            try {
                await processVendorBilling(vendor, cosmos, stripe, logger, context, feeConfig);
            } catch (error) {
                context.error(`Failed to process billing for vendor ${vendor.id}:`, error);
            }
        }

        // ========================================
        // Pass 2: Retries (failed payments)
        // ========================================
        context.log('Querying for billing retries...');

        const retryBillings = await cosmos.run_query<vendor_type>("Main-Vendor", {
            query: `
                SELECT * FROM c
                WHERE c.subscription.card_status = "saved"
                AND c.subscription.next_billing_date <= @today
                AND c.subscription.payment_status = "failed"
                AND c.subscription.payment_retry_count < 3
                AND NOT IS_DEFINED(c.subscription.stripeSubscriptionId)
                AND IS_DEFINED(c.subscription.saved_payment_method)
            `,
            parameters: [
                { name: "@today", value: today }
            ]
        }, true);

        context.log(`Found ${retryBillings.length} merchants with billing retries`);

        for (const vendor of retryBillings) {
            try {
                await processVendorBilling(vendor, cosmos, stripe, logger, context, feeConfig);
            } catch (error) {
                context.error(`Failed to process billing retry for vendor ${vendor.id}:`, error);
            }
        }

        context.log('Billing processor completed at:', new Date().toISOString());
    } catch (error) {
        context.error('Billing processor failed:', error);
        throw error;
    }
}

async function processVendorBilling(
    vendor: vendor_type,
    cosmos: CosmosDataSource,
    stripe: StripeDataSource,
    logger: LogManager,
    context: InvocationContext,
    feeConfig: Record<string, FeeConfigEntry> | null
): Promise<void> {
    const subscription = vendor.subscription;
    if (!subscription || !subscription.plans || subscription.plans.length === 0) {
        context.log(`Vendor ${vendor.id} has no plans - skipping`);
        return;
    }

    if (!vendor.stripe?.customerId) {
        context.log(`Vendor ${vendor.id} has no Stripe customer - skipping`);
        return;
    }

    const periodStart = subscription.next_billing_date || DateTime.now().toISODate();
    const interval = subscription.billing_interval || "monthly";
    const periodEnd = DateTime.fromISO(periodStart)
        .plus(interval === "yearly" ? { years: 1 } : { months: 1 })
        .toISODate();

    // Check waiver override
    if (subscription.waived) {
        const waiverExpired = subscription.waivedUntil && DateTime.fromISO(subscription.waivedUntil) < DateTime.now();

        if (waiverExpired) {
            // Waiver has expired - clear waiver fields and proceed to billing
            context.log(`Waiver expired for vendor ${vendor.id} - clearing and proceeding to billing`);
            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "remove", path: "/subscription/waived" },
                { op: "remove", path: "/subscription/waivedUntil" },
            ], "BILLING_PROCESSOR");
        } else {
            // Waiver still active - advance billing date without charging
            const nextBillingDate = DateTime.fromISO(periodStart)
                .plus(interval === "yearly" ? { years: 1 } : { months: 1 })
                .toISODate();

            context.log(`Vendor ${vendor.id} is waived - advancing billing date to ${nextBillingDate} without charging`);

            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
                { op: "set", path: "/subscription/payment_status", value: "success" },
                { op: "set", path: "/subscription/payment_retry_count", value: 0 },
                { op: "set", path: "/subscription/last_payment_date", value: DateTime.now().toISO() },
            ], "BILLING_PROCESSOR");
            return;
        }
    }

    // Sum plan amounts (use fee config prices when available, fallback to vendor-stored prices)
    const rawAmount = subscription.plans.reduce((sum, plan) => sum + getPlanAmount(plan, feeConfig), 0);
    const currency = subscription.plans[0].price.currency;

    // Apply discount override
    const discountMultiplier = 1 - (subscription.discountPercent || 0) / 100;
    const totalAmount = Math.round(rawAmount * discountMultiplier);

    if (totalAmount <= 0) {
        // Discount results in zero charge - treat same as waived
        const nextBillingDate = DateTime.fromISO(periodStart)
            .plus(interval === "yearly" ? { years: 1 } : { months: 1 })
            .toISODate();

        context.log(`Vendor ${vendor.id} has zero total after discount - advancing billing date to ${nextBillingDate}`);

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
            { op: "set", path: "/subscription/payment_status", value: "success" },
            { op: "set", path: "/subscription/payment_retry_count", value: 0 },
            { op: "set", path: "/subscription/last_payment_date", value: DateTime.now().toISO() },
        ], "BILLING_PROCESSOR");
        return;
    }

    const idempotencyKey = `billing_${vendor.id}_${periodStart}`;

    context.log(`Processing billing for vendor ${vendor.id}: ${totalAmount} ${currency}, period ${periodStart} to ${periodEnd}`);

    // Create PaymentIntent (off_session, confirm)
    const paymentResult = await stripe.callApi("POST", "payment_intents", {
        amount: totalAmount,
        currency: currency,
        customer: vendor.stripe.customerId,
        payment_method: subscription.saved_payment_method,
        off_session: true,
        confirm: true,
        metadata: {
            merchantId: vendor.id,
            billing_period_start: periodStart,
            billing_period_end: periodEnd,
            billing_type: "self_managed"
        }
    }, idempotencyKey);

    const billingRecord = {
        id: uuidv4(),
        date: DateTime.now().toISO(),
        amount: totalAmount,
        currency: currency,
        period_start: periodStart,
        period_end: periodEnd
    };

    if (paymentResult.status === 200 && paymentResult.data?.status === "succeeded") {
        // ========== SUCCESS ==========
        context.log(`Payment succeeded for vendor ${vendor.id}: ${paymentResult.data.id}`);

        const nextBillingDate = DateTime.fromISO(periodStart)
            .plus(interval === "yearly" ? { years: 1 } : { months: 1 })
            .toISODate();

        const successRecord = {
            ...billingRecord,
            billingStatus: billing_record_status.success,
            stripePaymentIntentId: paymentResult.data.id
        };

        const historyPatch = (!subscription.billing_history || subscription.billing_history.length === 0)
            ? { op: "set" as const, path: "/subscription/billing_history", value: [successRecord] }
            : { op: "add" as const, path: "/subscription/billing_history/-", value: successRecord };

        await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
            { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
            { op: "set", path: "/subscription/payment_status", value: "success" },
            { op: "set", path: "/subscription/payment_retry_count", value: 0 },
            { op: "set", path: "/subscription/last_payment_date", value: DateTime.now().toISO() },
            historyPatch
        ], "BILLING_PROCESSOR");

    } else {
        // ========== FAILURE ==========
        const currentRetryCount = subscription.payment_retry_count || 0;
        const newRetryCount = currentRetryCount + 1;
        const errorMessage = paymentResult.data?.last_payment_error?.message
            || paymentResult.data?.error?.message
            || `Payment failed with status ${paymentResult.status}`;

        context.log(`Payment failed for vendor ${vendor.id} (attempt ${newRetryCount}): ${errorMessage}`);

        const failureRecord = {
            ...billingRecord,
            billingStatus: billing_record_status.failed,
            stripePaymentIntentId: paymentResult.data?.id,
            error: errorMessage
        };

        const historyPatch = (!subscription.billing_history || subscription.billing_history.length === 0)
            ? { op: "set" as const, path: "/subscription/billing_history", value: [failureRecord] }
            : { op: "add" as const, path: "/subscription/billing_history/-", value: failureRecord };

        if (newRetryCount >= 3) {
            // ========== 3RD FAILURE - BLOCK PAYOUTS ==========
            context.log(`3rd failure for vendor ${vendor.id} - blocking payouts`);

            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "set", path: "/subscription/payment_status", value: "failed" },
                { op: "set", path: "/subscription/payment_retry_count", value: newRetryCount },
                { op: "set", path: "/subscription/payouts_blocked", value: true },
                historyPatch
            ], "BILLING_PROCESSOR");

            // Switch connected account to manual payouts
            if (vendor.stripe?.accountId) {
                try {
                    await stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                        settings: {
                            payouts: {
                                schedule: {
                                    interval: "manual"
                                }
                            }
                        }
                    });
                    context.log(`Switched vendor ${vendor.id} to manual payouts`);
                } catch (payoutError) {
                    context.error(`Failed to switch vendor ${vendor.id} to manual payouts:`, payoutError);
                }
            }
        } else {
            // Schedule retry in 3 days
            const retryDate = DateTime.now().plus({ days: 3 }).toISODate();
            context.log(`Scheduling retry for vendor ${vendor.id} on ${retryDate}`);

            await cosmos.patch_record("Main-Vendor", vendor.id, vendor.id, [
                { op: "set", path: "/subscription/payment_status", value: "failed" },
                { op: "set", path: "/subscription/payment_retry_count", value: newRetryCount },
                { op: "set", path: "/subscription/next_billing_date", value: retryDate },
                historyPatch
            ], "BILLING_PROCESSOR");
        }
    }
}

// Register the timer function - runs daily at 6am AEST (8pm UTC)
app.timer('billingProcessor', {
    schedule: '0 0 20 * * *',
    handler: billingProcessor,
});
