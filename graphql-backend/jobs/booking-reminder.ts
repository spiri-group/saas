/**
 * Container Job entry point for booking reminders.
 * Runs every 15 minutes via Azure Container Jobs scheduler.
 */
import { initServices } from "./shared/init-services";
import { runBookingReminder } from "../src/functions/booking_reminder";

async function main() {
    const { cosmos, email, logger } = await initServices();
    await runBookingReminder(cosmos, email, logger);
}

main()
    .then(() => {
        console.log("Booking reminder job completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Booking reminder job failed:", error);
        process.exit(1);
    });
