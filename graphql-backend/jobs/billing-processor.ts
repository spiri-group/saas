/**
 * Container Job entry point for billing processor.
 * Runs at 7am and 3pm UTC via Azure Container Jobs scheduler.
 */
import { initServices } from "./shared/init-services";
import { runBillingProcessor } from "../src/functions/billing_processor";

async function main() {
    const { cosmos, stripe, email, logger } = await initServices();
    await runBillingProcessor(cosmos, stripe, email, logger);
}

main()
    .then(() => {
        console.log("Billing processor job completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Billing processor job failed:", error);
        process.exit(1);
    });
