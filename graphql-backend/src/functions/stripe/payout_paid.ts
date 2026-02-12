import Stripe from "stripe";
import { StripeHandler } from "./0_dependencies";
import { merchant_card_status, vendor_type } from "../../graphql/vendor/types";

/**
 * Handles payout.paid webhook for connected accounts.
 *
 * Flow:
 * 1. Add payout amount to vendor's subscription.cumulativePayouts
 * 2. If first payout ever: switch to manual payouts, block until card added
 * 3. Billing processor picks up vendors who reach cumulative threshold
 */
const handler: StripeHandler = async (event, logger, services) => {
    const { stripe, cosmos } = services;

    const payout = event.data.object as Stripe.Payout;

    // Get the connected account ID from the event
    const connectedAccountId = (event as any).account as string;

    if (!connectedAccountId) {
        logger.logMessage(`[payout_paid] No connected account ID found in event - skipping`);
        return;
    }

    logger.logMessage(`[payout_paid] Processing payout ${payout.id} for account ${connectedAccountId}`);
    logger.logMessage(`[payout_paid] Payout amount: ${payout.amount} ${payout.currency}`);

    // Find the merchant by their Stripe connected account ID
    const merchants = await cosmos.run_query<vendor_type>("Main-Vendor", {
        query: `SELECT * FROM c WHERE c.stripe.accountId = @accountId`,
        parameters: [{ name: "@accountId", value: connectedAccountId }]
    }, true);

    if (merchants.length === 0) {
        logger.logMessage(`[payout_paid] No merchant found for account ${connectedAccountId} - skipping`);
        return;
    }

    const merchant = merchants[0];
    logger.logMessage(`[payout_paid] Found merchant ${merchant.id} (${merchant.name})`);

    // Add payout amount to cumulative payouts
    const currentCumulative = merchant.subscription?.cumulativePayouts || 0;
    const newCumulative = currentCumulative + payout.amount;

    logger.logMessage(`[payout_paid] Cumulative payouts: ${currentCumulative} + ${payout.amount} = ${newCumulative}`);

    await cosmos.patch_record("Main-Vendor", merchant.id, merchant.id, [
        { op: "set", path: "/subscription/cumulativePayouts", value: newCumulative },
    ], "STRIPE");

    // If merchant already has a card, nothing more to do
    // The billing processor will pick up vendors who have reached the threshold
    if (merchant.subscription?.card_status === merchant_card_status.saved) {
        logger.logMessage(`[payout_paid] Merchant already has card on file - cumulative payouts updated`);
        return;
    }

    // Check if this is the first payout
    const firstPayoutReceived = merchant.subscription?.first_payout_received || false;

    if (!firstPayoutReceived) {
        // This is the first payout - let it through, then block future payouts
        logger.logMessage(`[payout_paid] First payout for merchant ${merchant.id} - blocking future payouts until card added`);

        // Switch payout schedule to manual (blocks future automatic payouts)
        const updateResp = await stripe.callApi("POST", `accounts/${connectedAccountId}`, {
            settings: {
                payouts: {
                    schedule: {
                        interval: "manual"
                    }
                }
            }
        });

        if (updateResp.status !== 200) {
            logger.logMessage(`[payout_paid] Warning: Failed to set manual payouts: ${JSON.stringify(updateResp.data)}`);
        } else {
            logger.logMessage(`[payout_paid] Payout schedule set to manual for account ${connectedAccountId}`);
        }

        // Mark first payout received and payouts blocked
        await cosmos.patch_record("Main-Vendor", merchant.id, merchant.id, [
            { op: "set", path: "/subscription/first_payout_received", value: true },
            { op: "set", path: "/subscription/payouts_blocked", value: true }
        ], "STRIPE");

        logger.logMessage(`[payout_paid] Merchant ${merchant.id} needs to add card for future payouts`);
    } else {
        // Shouldn't happen - payouts should be blocked after first payout
        logger.logMessage(`[payout_paid] Unexpected: Payout received after first payout but no card on file`);
    }
};

export default handler;
