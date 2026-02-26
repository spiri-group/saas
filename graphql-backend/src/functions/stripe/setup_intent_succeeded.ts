import Stripe from "stripe";
import { groupBy, isNullOrUndefined, random_delay } from "../../utils/functions";
import { StripeHandler } from "./0_dependencies";
import { order_type, orderLine_type, refund_record_type } from "../../graphql/order/types";
import { merchant_card_status, plan_type, vendor_type } from "../../graphql/vendor/types";
import { user_type } from "../../graphql/user/types";
import { DateTime } from "luxon";
import { restore_price_on_lines } from "../../graphql/order";
import { calcStripeFees, deriveFees, deriveTax } from "../../graphql/0_shared";
import { PatchOperation } from "@azure/cosmos";
import { currency_amount_type } from "../../graphql/0_shared/types";
import { sender_details } from "../../client/email_templates";
import { v4 as uuidv4 } from "uuid";
import { billing_record_status } from "../../graphql/vendor/types";

const handler : StripeHandler = async (event, logger, services ) => {

    const { stripe, cosmos, exchangeRate_ds, email } = services;
    const setupIntent = event.data.object as Stripe.SetupIntent;
    const metadata = setupIntent.metadata as {
        orderId: string,
        customerEmail: string,
        merchantId: string,
        target: string,
        purpose?: string
    }

    let payment_method = setupIntent.payment_method

    logger.logMessage(`[setup_intent_succeeded] SetupIntent ID: ${setupIntent.id}`)
    logger.logMessage(`[setup_intent_succeeded] Payment method: ${payment_method}`)
    logger.logMessage(`[setup_intent_succeeded] SetupIntent customer: ${setupIntent.customer}`)
    logger.logMessage(`[setup_intent_succeeded] Metadata: ${JSON.stringify(metadata)}`)
    logger.logMessage(`Choosing path to take based on metadata target ${metadata.target}`)

    // Handle READING_REQUEST early - before fetching order (which won't exist for reading requests)
    if (metadata.target === "READING_REQUEST") {
        // Handle reading request payment method setup
        logger.logMessage("Handling reading request payment method setup");

        const readingRequestMetadata = setupIntent.metadata as {
            target: string,
            userId: string,
            spreadType: string,
            topic: string,
            customerEmail: string
        };

        // Find the reading request by setupIntentId
        const readingRequests = await cosmos.run_query<any>("Main-PersonalSpace", {
            query: `SELECT * FROM c WHERE c.stripe.setupIntentId = @setupIntentId AND c.docType = "READING_REQUEST"`,
            parameters: [{ name: "@setupIntentId", value: setupIntent.id }]
        }, true);

        if (readingRequests.length === 0) {
            throw new Error(`No reading request found with setupIntentId ${setupIntent.id}`);
        }

        const readingRequest = readingRequests[0];
        logger.logMessage(`Found reading request ${readingRequest.id} for user ${readingRequestMetadata.userId}`);

        // Save the payment method ID to the reading request and update status to AWAITING_CLAIM
        // Main-PersonalSpace partition key is /userId
        await cosmos.patch_record("Main-PersonalSpace", readingRequest.id, readingRequest.userId, [
            { op: "set", path: "/stripe/paymentMethodId", value: payment_method },
            { op: "set", path: "/requestStatus", value: "AWAITING_CLAIM" }
        ], "STRIPE");

        logger.logMessage(`Payment method ${payment_method} saved to reading request ${readingRequest.id}, status updated to AWAITING_CLAIM`);

        // Fetch the customer to save the card to their account
        const customerResp = await cosmos.run_query<user_type>("Main-User", {
            query: `SELECT VALUE c FROM c WHERE c.email = @email`,
            parameters: [{ name: "@email", value: readingRequestMetadata.customerEmail }]
        }, true);

        if (customerResp.length > 0) {
            const customerDB = customerResp[0];
            logger.logMessage(`Resolved customer DB Id ${customerDB.id} for card saving`);

            // Also save the card to the user's account for future use
            const paymentMethodDetails = await stripe.callApi("GET", `payment_methods/${payment_method}`);
            if (paymentMethodDetails.status === 200 && paymentMethodDetails.data.card) {
                const card = paymentMethodDetails.data.card;

                // Check if user already has this card saved (by last4 and brand)
                const existingCards = customerDB.cards || [];
                const cardExists = existingCards.some((c: any) =>
                    c.last4 === card.last4 && c.brand === card.brand
                );

                if (!cardExists) {
                    const newCard = {
                        id: `card_${Date.now()}`,
                        paymentMethodId: payment_method,
                        brand: card.brand,
                        last4: card.last4,
                        exp_month: card.exp_month,
                        exp_year: card.exp_year,
                        funding: card.funding,
                        country: card.country
                    };

                    // If user doesn't have cards array, use "set" to create it with the new card
                    // If they do have cards, use "add" to append to the array
                    if (!customerDB.cards || customerDB.cards.length === 0) {
                        await cosmos.patch_record("Main-User", customerDB.id, customerDB.id, [
                            { op: "set", path: "/cards", value: [newCard] }
                        ], "STRIPE");
                    } else {
                        await cosmos.patch_record("Main-User", customerDB.id, customerDB.id, [
                            { op: "add", path: "/cards/-", value: newCard }
                        ], "STRIPE");
                    }

                    logger.logMessage(`New card saved to user ${customerDB.id}`);
                } else {
                    logger.logMessage(`Card already exists for user ${customerDB.id}, skipping save`);
                }
            }
        } else {
            logger.logMessage(`Could not find customer with email ${readingRequestMetadata.customerEmail}, skipping card save`);
        }

        return; // Exit early, no need for order processing
    }

    // Handle merchant adding a payment method (for deferred subscription model)
    // When card is added: enable payouts, start subscription
    if (metadata.purpose === "merchant_payment_method") {
        logger.logMessage("[setup_intent_succeeded] Handling merchant payment method setup");

        const merchantId = metadata.merchantId;
        if (!merchantId) {
            throw new Error("merchantId is required for merchant_payment_method purpose");
        }

        const merchant = await cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
        if (!merchant) {
            throw new Error(`Merchant ${merchantId} not found`);
        }
        if (!merchant.stripe) {
            throw new Error(`Merchant ${merchantId} does not have a Stripe account`);
        }

        logger.logMessage(`[setup_intent_succeeded] Processing card setup for merchant ${merchantId}`);

        // 1. Mark card as saved and clear payouts_blocked flag
        await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
            { op: "set", path: "/subscription/card_status", value: merchant_card_status.saved },
            { op: "set", path: "/subscription/payouts_blocked", value: false }
        ], "STRIPE");
        logger.logMessage(`[setup_intent_succeeded] Card status marked as saved, payouts unblocked`);

        // 2. Enable automatic payouts on the connected account (switch from manual to daily)
        const connectedAccountId = merchant.stripe.accountId;
        const updatePayoutScheduleResp = await stripe.callApi("POST", `accounts/${connectedAccountId}`, {
            settings: {
                payouts: {
                    schedule: {
                        interval: "daily"
                    }
                }
            }
        });

        if (updatePayoutScheduleResp.status !== 200) {
            logger.logMessage(`[setup_intent_succeeded] Warning: Failed to update payout schedule: ${JSON.stringify(updatePayoutScheduleResp.data)}`);
        } else {
            logger.logMessage(`[setup_intent_succeeded] Payout schedule updated to daily for account ${connectedAccountId}`);
        }

        // 3. Save payment method to new stripePaymentMethodId field
        // Billing processor handles charging (no immediate charge at card save)
        logger.logMessage(`[setup_intent_succeeded] Saving payment method for merchant ${merchantId}`);

        await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
            { op: "set", path: "/subscription/stripePaymentMethodId", value: payment_method },
            // Legacy field kept for backward compatibility
            { op: "set", path: "/subscription/saved_payment_method", value: payment_method },
        ], "STRIPE");

        // For trial-model vendors, create a $5 auth hold to verify the card, then immediately release it
        if (merchant.subscription?.billingModel === 'trial') {
            logger.logMessage(`[setup_intent_succeeded] Trial model vendor — creating $5 auth hold for card verification`);
            try {
                const authHoldResult = await stripe.callApi("POST", "payment_intents", {
                    amount: 500, // $5 in cents
                    currency: merchant.currency || 'aud',
                    customer: merchant.stripe.customerId,
                    payment_method: payment_method,
                    capture_method: 'manual', // auth hold, not a charge
                    confirm: true,
                    description: 'SpiriVerse card verification hold — automatically released',
                });

                if (authHoldResult.status === 200 && authHoldResult.data?.id) {
                    // Immediately cancel/release the hold
                    await stripe.callApi("POST", `payment_intents/${authHoldResult.data.id}/cancel`);
                    logger.logMessage(`[setup_intent_succeeded] Auth hold ${authHoldResult.data.id} created and released`);

                    // Store reference on vendor subscription
                    await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                        { op: "set", path: "/subscription/trialAuthHoldPaymentIntentId", value: authHoldResult.data.id }
                    ], "STRIPE");
                } else {
                    logger.logMessage(`[setup_intent_succeeded] Auth hold failed: ${JSON.stringify(authHoldResult.data)}`);
                }
            } catch (authError) {
                // Non-fatal — card is still saved even if auth hold fails
                logger.logMessage(`[setup_intent_succeeded] Auth hold error (non-fatal): ${authError}`);
            }
        }

        // Billing processor will handle charging when trial expires (or when payout threshold is reached for legacy vendors)
        logger.logMessage(`[setup_intent_succeeded] Payment method saved. Billing processor will handle charging.`);

        // Keep the legacy block below but skip it since we no longer charge immediately
        if (false) {
            // Legacy: This block is kept for reference but no longer executes
            const hasExistingPayment = (merchant.subscription?.billing_history?.length ?? 0) > 0;
            if (!hasExistingPayment && merchant.subscription?.plans && merchant.subscription.plans.length > 0) {
                logger.logMessage(`[setup_intent_succeeded] Charging first month subscription for merchant ${merchantId}`);

                const totalAmount = merchant.subscription.plans.reduce((sum, plan) => sum + plan.price.amount, 0);
                const currency = merchant.subscription.plans[0].price.currency;
                const periodStart = DateTime.now().toISODate();
                const periodEnd = DateTime.now().plus({ months: 1 }).toISODate();
                const nextBillingDate = periodEnd;

                const paymentResult = await stripe.callApi("POST", "payment_intents", {
                    amount: totalAmount,
                    currency: currency,
                    customer: merchant.stripe.customerId,
                    payment_method: payment_method,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        merchantId,
                        billing_period_start: periodStart,
                        billing_period_end: periodEnd,
                        billing_type: "first_month"
                    }
                });

                if (paymentResult.status === 200 && paymentResult.data?.status === "succeeded") {
                    logger.logMessage(`[setup_intent_succeeded] First month payment succeeded: ${paymentResult.data.id}`);

                    const billingRecord = {
                        id: uuidv4(),
                        date: DateTime.now().toISO(),
                        amount: totalAmount,
                        currency: currency,
                        billingStatus: billing_record_status.success,
                        stripePaymentIntentId: paymentResult.data.id,
                        period_start: periodStart,
                        period_end: periodEnd
                    };

                    await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                        { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
                        { op: "set", path: "/subscription/payment_status", value: "success" },
                        { op: "set", path: "/subscription/payment_retry_count", value: 0 },
                        { op: "set", path: "/subscription/last_payment_date", value: DateTime.now().toISO() },
                        { op: "set", path: "/subscription/billing_history", value: [billingRecord] }
                    ], "STRIPE");
                } else {
                    logger.logMessage(`[setup_intent_succeeded] First month payment failed: ${JSON.stringify(paymentResult.data?.last_payment_error?.message || paymentResult.data)}`);

                    const billingRecord = {
                        id: uuidv4(),
                        date: DateTime.now().toISO(),
                        amount: totalAmount,
                        currency: currency,
                        billingStatus: billing_record_status.failed,
                        error: paymentResult.data?.last_payment_error?.message || "Payment failed",
                        period_start: periodStart,
                        period_end: periodEnd
                    };

                    await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                        { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
                        { op: "set", path: "/subscription/payment_status", value: "failed" },
                        { op: "set", path: "/subscription/billing_history", value: [billingRecord] }
                    ], "STRIPE");
                }
            } else {
                // No plans or already has a payment - just set the next billing date
                const nextBillingDate = DateTime.now().plus({ months: 1 }).toISO();
                await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                    { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
                    { op: "set", path: "/subscription/billing_history", value: merchant.subscription?.billing_history || [] }
                ], "STRIPE");
            }

            logger.logMessage(`[setup_intent_succeeded] Self-managed billing configured`);
        }

        // 5. Check if vendor meets all go-live requirements and auto-publish
        await checkAndPublishVendor(merchantId, cosmos, stripe, logger);

        logger.logMessage(`[setup_intent_succeeded] Merchant payment method setup complete`);
        return; // Exit early
    }

    // For all other targets (RETURN_SHIPPING, MERCHANT_SUBSCRIPTION, regular orders),
    // we need to fetch the order, stripe customer, and customer DB record
    let order = await cosmos.get_record<order_type>("Main-Orders", metadata.orderId, metadata.orderId)
    logger.logMessage(`[setup_intent_succeeded] Fetched order ${metadata.orderId}`)
    logger.logMessage(`[setup_intent_succeeded] Order target from DB: ${order?.target}`)
    logger.logMessage(`[setup_intent_succeeded] Order billing: ${JSON.stringify(order?.billing)}`)

    // Use the customer from the setup intent directly - this is the customer the PM is attached to
    // Don't use resolveCustomer() as it may return a different customer with the same email
    let stripeCustomerId: string;
    if (setupIntent.customer) {
        stripeCustomerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer.id;
        logger.logMessage(`[setup_intent_succeeded] Using customer from SetupIntent: ${stripeCustomerId}`)
    } else {
        // Fallback to resolving by email if setup intent doesn't have customer
        const resolved = await stripe.resolveCustomer(metadata.customerEmail)
        stripeCustomerId = resolved.id;
        logger.logMessage(`[setup_intent_succeeded] Resolved stripe customer by email: ${stripeCustomerId}`)
    }
    const stripeCustomer = { id: stripeCustomerId }

    const customerResp = await cosmos.run_query<user_type>("Main-User", {
        query: `SELECT VALUE c FROM c WHERE c.email = @email`,
        parameters: [{ name: "@email", value: metadata.customerEmail }]
    }, true);
    if (customerResp.length == 0) throw `Could not find customer with email ${metadata.customerEmail}`
    const customerDB = customerResp[0]
    logger.logMessage(`Resolved customer DB Id ${customerDB.id}`)

    if (metadata.target === "RETURN_SHIPPING") {

        logger.logMessage("Handling return shipping payment");

        // Find the refund document with return shipping estimate that needs payment
        const refunds = await cosmos.run_query<refund_record_type>("Main-Orders", {
            query: `
                SELECT * FROM c 
                WHERE c.docType = "REFUND" 
                AND c.orderId = @orderId 
                AND c.status = "ACTIVE"
                AND IS_DEFINED(c.returnShippingEstimate)
                AND c.returnShippingEstimate.status = "pending_payment"
            `,
            parameters: [
                { name: "@orderId", value: metadata.orderId }
            ]
        }, true);

        if (refunds.length === 0) {
            throw new Error("No refund with pending return shipping payment found");
        }

        const refundRequest = refunds[0];
        const estimate = refundRequest.returnShippingEstimate!;

        // Generate return shipping labels using ShipEngine
        const label = await services.shipEngine.createLabelFromRate({
            rate_id: estimate.rate_id
        });

        // Calculate auto-refund safety deadlines
        const paidAt = new Date().toISOString();
        const labelCostRefundDeadline = DateTime.fromISO(paidAt).plus({ days: 30 }).toISO();

        // Create return shipping labels in the format expected by label_info_type
        const returnShippingLabels = [{
            label_id: label.label_id,
            tracking_number: label.tracking_number,
            carrier_code: label.carrier_code || "unknown",
            service_code: label.service_code || "unknown",
            label_download: {
                pdf: label.label_download.pdf,
                png: label.label_download.png,
                zpl: label.label_download.zpl
            },
            // Auto-refund safety tracking
            paid_at: paidAt,
            label_cost_refund_deadline: labelCostRefundDeadline
        }];

        // Update the refund document with the generated labels and remove the estimate
        await cosmos.patch_record("Main-Orders", refundRequest.id, refundRequest.id, [
            { op: "set", path: "/returnShippingLabels", value: returnShippingLabels },
            { op: "remove", path: "/returnShippingEstimate" }
        ], "STRIPE");

        logger.logMessage(`Return shipping labels generated for refund ${refundRequest.id}`);

        // Send email notification to customer now that they've paid for the return label
        try {
            await email.sendEmail(
                sender_details.from,
                order.customerEmail,
                "PRODUCT_REFUND_REQUEST_MERCHANT",
                {
                    order: {
                        code: order.code
                    },
                    products: refundRequest.lines.map(line => ({
                        name: line.descriptor,
                        quantity: line.refund_quantity
                    }))
                }
            );
            logger.logMessage(`Refund request email sent to customer ${order.customerEmail}`);
        } catch (emailError) {
            logger.logMessage(`Failed to send refund notification email: ${emailError}`);
            // Don't throw - email failure shouldn't block the refund process
        }

    } else if (order.target == "MERCHANT_SUBSCRIPTION") {

        // we need to fetch the stripeCustomer of the merchant who we are wishing to activate the subscription for
        const merchant = await cosmos.get_record<vendor_type>("Main-Vendor", metadata.merchantId, metadata.merchantId)
        if (merchant.stripe == null) throw `Merchant ${metadata.merchantId} does not have a stripe account`

        logger.logMessage("Handling as saved card for merchant subscription (self-managed billing)");

        // Save card status and set up self-managed billing fields (no Stripe subscription)
        const nextBillingDate = DateTime.now().plus({ months: 1 }).toISO();

        await cosmos.patch_record("Main-Vendor", metadata.merchantId, metadata.merchantId, [
            { op: "set", path: "/subscription/card_status", value: merchant_card_status.saved },
            { op: "set", path: "/subscription/saved_payment_method", value: payment_method },
            { op: "set", path: "/subscription/next_billing_date", value: nextBillingDate },
            { op: "set", path: "/subscription/billing_interval", value: "monthly" },
            { op: "set", path: "/subscription/billing_history", value: [] }
        ], "STRIPE")

        logger.logMessage(`Self-managed billing configured for merchant ${metadata.merchantId}: next billing ${nextBillingDate}`)

    } else {

        logger.logMessage(`[setup_intent_succeeded] Processing normal order flow for order ${metadata.orderId}`)
        logger.logMessage(`[setup_intent_succeeded] Order target: ${order.target}`)
        logger.logMessage(`[setup_intent_succeeded] Order has ${order.lines?.length ?? 0} lines`)

        // Log each line's merchantId for debugging
        if (order.lines) {
            order.lines.forEach((line, idx) => {
                logger.logMessage(`[setup_intent_succeeded] Line ${idx}: merchantId=${line.merchantId}, descriptor=${line.descriptor}, forObject=${JSON.stringify(line.forObject)}`)
            })
        }

        // we need to patch all lines to add to the log of paid_status
        // - awaiting payment for paid_status
        await cosmos.patch_record("Main-Orders", metadata.orderId, metadata.orderId,
            order.lines.map((_, idx) => (
                { op: "set", path: `/lines/${idx}/paid_status_log`, value: [{ datetime: DateTime.now().toISO(), label: "AWAITING_CHARGE", triggeredBy: "STRIPE" }] }
            )), "STRIPE")

        // we need to restore the price on the lines
        restore_price_on_lines(order.lines)
        // now we can group the items by merchant
        const groupedByMerchant = groupBy<string, orderLine_type>(order.lines, (x => x.merchantId))

        logger.logMessage(`[setup_intent_succeeded] Grouped by merchant: ${JSON.stringify(Object.keys(groupedByMerchant))}`)

        // okay so we have the items grouped by merchant, now we need to create a payment intent for each merchant
        for (const merchantId in groupedByMerchant) {
            logger.logMessage(`Looping, processing merchant ${merchantId}`)

            // 2. calculate the total for the merchant
            const items = groupedByMerchant[merchantId]
            logger.logMessage(`Grouped ${items}`)

            var stripe_ds = stripe;
            if (merchantId !== "SPIRIVERSE") {

                const merchant = await cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId)

                if (merchant.stripe == null) throw `Merchant ${merchantId} does not have a stripe account`

                // Convert item prices to merchant's currency if needed
                for (const item of items) {
                    if (item.price.currency !== merchant.currency) {
                        logger.logMessage(`[setup_intent_succeeded] Converting item price from ${item.price.currency} to ${merchant.currency}`)
                        const convertedAmount = await exchangeRate_ds.convert(item.price.amount, item.price.currency, merchant.currency)
                        item.price.amount = convertedAmount
                        item.price.currency = merchant.currency
                        // Also update price_log for consistency
                        if (item.price_log && item.price_log[0]) {
                            const originalCurrency = item.price_log[0].price.currency || 'USD'
                            item.price_log[0].price.amount = await exchangeRate_ds.convert(item.price_log[0].price.amount, originalCurrency, merchant.currency)
                            item.price_log[0].price.currency = merchant.currency
                        }
                    }
                }

                // Calculate total AFTER currency conversion
                let total = items.reduce((acc, x) => acc + (x.price_log[0].price.quantity * x.price_log[0].price.amount), 0)
                logger.logMessage(`Total for merchant ${merchantId} is ${total} ${merchant.currency}`)

                logger.logMessage(`Obtained merchant ${merchantId} from cosmos successfully.`)

                const connected_account_stripe = stripe.asConnectedAccount(merchant.stripe.accountId)

                // For Stripe Connect, we need to:
                // 1. Find or create a customer on the connected account
                // 2. Clone the payment method to that customer

                // Step 1: Search for existing customer on connected account by email
                const connectedCustomerSearch = await connected_account_stripe.callApi("GET", `customers/search`, {
                    query: `email:'${metadata.customerEmail}'`
                })

                let connectedCustomerId: string;
                if (connectedCustomerSearch.data?.data?.length > 0) {
                    connectedCustomerId = connectedCustomerSearch.data.data[0].id;
                    logger.logMessage(`[setup_intent_succeeded] Found existing customer ${connectedCustomerId} on connected account`);
                } else {
                    // Create customer on connected account
                    const newConnectedCustomer = await connected_account_stripe.callApi("POST", `customers`, {
                        email: metadata.customerEmail,
                        name: customerDB.firstname ? `${customerDB.firstname} ${customerDB.lastname || ''}`.trim() : metadata.customerEmail,
                        metadata: {
                            platform_customer_id: stripeCustomer.id
                        }
                    });
                    connectedCustomerId = newConnectedCustomer.data.id;
                    logger.logMessage(`[setup_intent_succeeded] Created new customer ${connectedCustomerId} on connected account`);
                }

                // Step 2: Clone the payment method from platform to connected account
                // When the PM is attached to a platform customer, we must provide that customer ID
                // The call is made to the connected account (via Stripe-Account header) but references
                // the platform customer to authorize the clone
                const clonedPaymentMethod = await connected_account_stripe.callApi("POST", `payment_methods`, {
                    payment_method: payment_method,
                    customer: stripeCustomer.id  // Platform customer ID - required for security
                })

                const connectedPaymentMethodId = clonedPaymentMethod.data.id
                logger.logMessage(`[setup_intent_succeeded] Cloned payment method ${payment_method} to ${connectedPaymentMethodId} on connected account ${merchant.stripe.accountId}`)

                // Optionally attach to the connected account's customer for future use
                try {
                    await connected_account_stripe.callApi("POST", `payment_methods/${connectedPaymentMethodId}/attach`, {
                        customer: connectedCustomerId
                    })
                    logger.logMessage(`[setup_intent_succeeded] Attached cloned PM to connected customer ${connectedCustomerId}`)
                } catch (attachError) {
                    // Non-fatal - we can still use the PM for this payment
                    logger.logMessage(`[setup_intent_succeeded] Could not attach PM to connected customer (non-fatal): ${attachError}`)
                }
                
                restore_price_on_lines(items)
                const fees = await deriveFees(merchantId, items, cosmos)

                stripe_ds = stripe.asConnectedAccount(merchant.stripe.accountId)

                logger.logMessage(`Obtained payment method ${payment_method} for merchant ${merchantId} on their connected account.`)
                
                // 5. Add any tax that is required
                // billing details will be on the order
                if (isNullOrUndefined(order.billing)) throw `Order ${metadata.orderId} does not have billing details`

                // Check if Stripe Tax is enabled on the connected account before attempting calculation
                const taxSettings = await stripe_ds.callApi("GET", "tax/settings");
                const taxEnabled = taxSettings.data?.status === 'active';

                let tax: Awaited<ReturnType<typeof deriveTax>>;
                if (taxEnabled) {
                    tax = await deriveTax(
                        {
                            cosmos,
                            exchangeRate: exchangeRate_ds,
                            stripe: stripe_ds,
                        },
                        {
                            currency: customerDB.currency,
                            address: order.billing.addressComponents
                        }, items, "billing");
                } else {
                    logger.logMessage(`[setup_intent_succeeded] Stripe Tax not enabled for merchant ${merchantId}, skipping tax calculation`);
                    // Create a fallback tax result with 0 tax for all items
                    const line_tax_mapping: Record<string, currency_amount_type> = {};
                    for (const item of items) {
                        line_tax_mapping[item.id] = {
                            amount: 0,
                            currency: customerDB.currency
                        };
                    }
                    tax = {
                        calculation: null,
                        amount: { amount: 0, currency: customerDB.currency } as currency_amount_type,
                        breakdown: [],
                        line_tax_mapping
                    };
                }

                logger.logMessage(`Obtained tax amount of ${tax.amount.amount} for the customer to pay.`)
                
                if (isNullOrUndefined(tax.line_tax_mapping)) throw `Could not find tax mapping for lines`
                logger.logMessage(`Obtained tax mapping for items.`)

                //TODO: we need to update each of the lines to have the tax amount on the charge that we're applying
                var patchRecords = [] as PatchOperation[]
                for (var item of items) {
                    var tax_amount = tax.line_tax_mapping[item.id]
                    if (isNullOrUndefined(tax_amount)) throw `Could not find tax amount for line ${item.id}`
                    patchRecords.push({ op: "set", path: `/lines/${order.lines.findIndex(x => x.id == item.id)}/price_log/0/tax`, value: tax_amount })
                }
                if (patchRecords.length == 0) throw `No patching for tax amounts found. This shouldn't be the case.`
                await cosmos.patch_record("Main-Orders", metadata.orderId, metadata.orderId, patchRecords, "STRIPE")

                // we need to work out any shipping fees
                // Only do shipping fee logic if NOT digitalOnly
                const isDigitalOnly = (order as any).digitalOnly === true;
                let shipping_fee: { amount: currency_amount_type, tax: currency_amount_type } = { amount: { amount: 0, currency: customerDB.currency }, tax: { amount: 0, currency: customerDB.currency } };
                let shipping_grand_total = 0;
                if (!isDigitalOnly) {
                    const shipments_for_merchant = isNullOrUndefined(order.shipments) ? [] :
                        order.shipments.filter(s => s.sendFrom.vendorId == merchantId)
                    logger.logMessage(`Found ${shipments_for_merchant.length} shipments for merchant ${merchantId}`)
                    shipping_fee = shipments_for_merchant.reduce((acc, x) => {
                        acc.amount.amount += x.suggestedConfiguration.pricing.subtotal_amount.amount
                        acc.tax.amount += x.suggestedConfiguration.pricing.tax_amount.amount
                        return acc
                    }, {
                        amount: { amount: 0, currency: customerDB.currency },
                        tax: { amount: 0, currency: customerDB.currency }
                    })
                    const shipping_total = shipping_fee.amount.amount + shipping_fee.tax.amount
                    const shipping_stripe_fee = calcStripeFees(shipping_total, false)
                    shipping_grand_total = shipping_total + shipping_stripe_fee
                } else {
                    logger.logMessage('Order is digitalOnly, skipping shipping fee calculation.');
                }

                // 5. create the payment intent using the cloned payment method
                const paymentAmount = (fees.customer.charge + tax.amount.amount) + shipping_grand_total;
                logger.logMessage(`[setup_intent_succeeded] Creating payment intent for merchant ${merchantId}: amount=${paymentAmount}, currency=${merchant.currency}, paymentMethod=${connectedPaymentMethodId}, customer=${connectedCustomerId}`);

                const paymentIntentResult = await stripe_ds.callApi("POST", "payment_intents", {
                    amount: paymentAmount,
                    customer: connectedCustomerId,  // Required: the customer on the connected account that the PM is attached to
                    payment_method: connectedPaymentMethodId,
                    application_fee_amount: fees.spiriverse_takes,
                    confirm: true,
                    currency: merchant.currency,
                    metadata: {
                        ...metadata,
                        merchantId,
                        tax_amount: tax.amount.amount,
                        tax_currency: tax.amount.currency,
                        tax_calculation: tax.calculation?.id || '',
                        shipping_subtotal: isDigitalOnly ? 0 : shipping_fee.amount.amount,
                        shipping_tax: isDigitalOnly ? 0 : shipping_fee.tax.amount,
                        shipping_fee: isDigitalOnly ? 0 : calcStripeFees(shipping_fee.amount.amount + shipping_fee.tax.amount, false),
                        shipping_currency: isDigitalOnly ? merchant.currency : shipping_fee.amount.currency,
                    }
                });

                logger.logMessage(`[setup_intent_succeeded] Payment intent created: status=${paymentIntentResult.status}, id=${paymentIntentResult.data?.id}`);

            } else {
                logger.logMessage(`Treating this as a charge for Spiriverse`);

                // Calculate total for SPIRIVERSE items
                let total = items.reduce((acc, x) => acc + (x.price_log[0].price.quantity * x.price_log[0].price.amount), 0)
                logger.logMessage(`Total for SPIRIVERSE is ${total}`)

                // no need to put an application fee but we also need to tell the customer
                await stripe_ds.callApi("POST", "payment_intents", {
                    customer: stripeCustomer.id,
                    amount: total,
                    payment_method: payment_method,
                    confirm: true,
                    currency: "aud", // TODO: Needs to work out the correct currency
                    metadata: {
                        ...metadata,
                        merchantId,
                    }
                })

            } 
            
            // 5. delay between each merchant to avoid rate limiting
            if (Object.keys(groupedByMerchant).length > 1) await random_delay(1000, 2000)
            
        } 
    }  
}

/**
 * Checks if a vendor has met all go-live requirements and publishes them if so.
 * Only requirement: Stripe Connect onboarding complete (charges_enabled).
 * Payment card is optional — vendors start with a 14-day free trial.
 */
async function checkAndPublishVendor(
    merchantId: string,
    cosmos: import("../../utils/database").CosmosDataSource,
    stripe: import("../../services/stripe").StripeDataSource,
    logger: import("../../utils/functions").LogManager
): Promise<void> {
    // Re-fetch the latest vendor state
    const vendor = await cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
    if (!vendor) return;

    // Already published
    if (vendor.publishedAt) {
        logger.logMessage(`[checkAndPublishVendor] Vendor ${merchantId} already published`);
        return;
    }

    // Only requirement: Stripe Connect onboarding complete
    let hasStripeOnboarding = false;
    if (vendor.stripe?.accountId) {
        const accountResp = await stripe.callApi("GET", `accounts/${vendor.stripe.accountId}`);
        hasStripeOnboarding = accountResp.data?.charges_enabled === true;
    }
    if (!hasStripeOnboarding) {
        logger.logMessage(`[checkAndPublishVendor] Vendor ${merchantId} missing Stripe onboarding`);
        return;
    }

    // All requirements met - publish the vendor
    const now = DateTime.now().toISO();
    await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
        { op: "set", path: "/publishedAt", value: now }
    ], "SYSTEM_AUTO_PUBLISH");

    logger.logMessage(`[checkAndPublishVendor] Vendor ${merchantId} published at ${now}`);
}

export { checkAndPublishVendor };

export default handler;