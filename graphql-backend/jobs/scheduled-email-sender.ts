/**
 * Container Job entry point for scheduled email sending.
 * Runs every 5 minutes via Azure Container Jobs scheduler.
 */
import { initServices } from "./shared/init-services";
import { runScheduledEmailSender } from "../src/functions/scheduled_email_sender";

async function main() {
    const { tableStorage, email, logger } = await initServices();
    await runScheduledEmailSender(tableStorage, email, logger);
}

main()
    .then(() => {
        console.log("Scheduled email sender job completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Scheduled email sender job failed:", error);
        process.exit(1);
    });
