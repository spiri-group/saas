/**
 * Container Job entry point for refund protection.
 * Runs daily at 2am UTC via Azure Container Jobs scheduler.
 */
import { initServices } from "./shared/init-services";
import { runRefundProtection } from "../src/functions/refund_protection";

async function main() {
    const { cosmos, stripe, email, logger } = await initServices();
    await runRefundProtection(cosmos, stripe, email, logger);
}

main()
    .then(() => {
        console.log("Refund protection job completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Refund protection job failed:", error);
        process.exit(1);
    });
