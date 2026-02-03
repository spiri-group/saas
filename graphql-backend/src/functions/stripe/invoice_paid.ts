import Stripe from "stripe";
import { StripeHandler } from "./0_dependencies";
import { merchant_subscription_payment_status } from "../../graphql/vendor/types";
import { DateTime } from "luxon";

const handler: StripeHandler = async (event, logger, services) => {
    const { cosmos } = services;

    let invoice = event.data.object as Stripe.Invoice
    
    if (invoice != null) {

        const subscription_details = invoice.parent.subscription_details;
        const metadata = subscription_details.metadata as {
            merchantId: string;
        }

        logger.logMessage(`Processing invoice paid for subscription ${subscription_details.subscription}`)

        const merchantId = metadata.merchantId
        if (merchantId != null) {
            // now we can patch the merchant to indicate that we are waiting on payment
            await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                { op: "set", path: "/subscription/payment_status", value: merchant_subscription_payment_status.success },
                { op: "set", path: "/subscription/last_payment_date", value: DateTime.now().toISO() },
                { op: "set", path: "/subscription/payment_retry_count", value: 0 }
            ], "STRIPE")
        }

    }

    logger.logMessage(`Processed invoice paid successfully`)
}

export default handler;