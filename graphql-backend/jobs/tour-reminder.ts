/**
 * Container Job entry point for tour reminders.
 * Runs hourly via Azure Container Jobs scheduler.
 */
import { initServices } from "./shared/init-services";
import { runTourReminder } from "../src/functions/tour_reminder";

async function main() {
    const { cosmos, email, logger } = await initServices();
    await runTourReminder(cosmos, email, logger);
}

main()
    .then(() => {
        console.log("Tour reminder job completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Tour reminder job failed:", error);
        process.exit(1);
    });
