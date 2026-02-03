import Stripe from "stripe"
import { StripeHandler } from "./0_dependencies"
import { merchant_subscription_payment_status, vendor_type } from "../../graphql/vendor/types"
import { DateTime } from "luxon"

const handler: StripeHandler = async (event, logger, services) => {
    const invoice = event.data.object as Stripe.Invoice
    const { cosmos } = services
    const metadata = invoice.metadata as {
        merchantId: string;
    }
    
    if (invoice != null) {
        const subscription_details = invoice.parent.subscription_details;
        const metadata = subscription_details.metadata as {
            merchantId: string;
        }

        logger.logMessage(`Processing invoice created for subscription ${subscription_details.subscription}`)

        const merchantId = metadata.merchantId

        if (merchantId != null) {
            // we need to get the current retry count
            const resp = await cosmos.run_query<vendor_type>("Main-Vendor", {
                query: `
                    SELECT c.subscription FROM c WHERE c.id=@id
                `,
                parameters: [
                    { name: "@id", value: merchantId }
                ]
            }, true)

            if (resp.length == 0) throw `Could not find merchant with id ${merchantId}`
            const { subscription } = resp[0]

            // now we can patch the merchant to indicate that we are waiting on payment
            await cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                { op: "set", path: "/subscription/payment_status", value: merchant_subscription_payment_status.failed },
                { op: "set", path: "/subscription/last_payment_date", value: DateTime.now().toISO() },
                { op: "set", path: "/subscription/payment_retry_count", value: subscription.payment_retry_count + 1 }
            ], "STRIPE")
        }

    }
    
    logger.logMessage(`Processed invoice created successfully`)
}

export default handler;