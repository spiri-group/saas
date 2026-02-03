import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { waitlist_entry_type, waitlist_ticket_preference_type, session_type, tour_type } from "../types";
import { recordref_type } from "../../0_shared/types";
import { RecordStatus } from "../../../utils/database";

const WAITLIST_CONTAINER = "Tour-Waitlist";
const NOTIFICATION_EXPIRY_HOURS = 24;

/**
 * Add a customer to the waitlist for a session
 */
export const add_to_waitlist = async (
    context: serverContext,
    sessionRef: recordref_type,
    tourRef: recordref_type,
    vendorId: string,
    customerEmail: string,
    ticketPreferences: waitlist_ticket_preference_type[],
    sessionDate: string,
    sessionTime: string,
    tourName: string
): Promise<waitlist_entry_type> => {
    // Check if customer is already on waitlist for this session
    const existingEntry = await context.dataSources.cosmos.run_query<waitlist_entry_type>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT * FROM c
                    WHERE c.sessionRef.id = @sessionId
                    AND c.customerEmail = @email
                    AND c.status = "ACTIVE"`,
            parameters: [
                { name: "@sessionId", value: sessionRef.id },
                { name: "@email", value: customerEmail }
            ]
        }
    );

    if (existingEntry && existingEntry.length > 0) {
        throw new Error("You are already on the waitlist for this session");
    }

    // Get current queue count to determine position
    const queueCount = await get_waitlist_count(context, sessionRef);
    const priority = Date.now(); // Timestamp-based priority for FIFO

    const entryId = uuidv4();
    const entry: waitlist_entry_type = {
        id: entryId,
        sessionRef,
        tourRef,
        customerEmail,
        vendorId,
        sessionDate,
        sessionTime,
        tourName,
        positionInQueue: queueCount + 1,
        dateJoined: DateTime.now().toISO() ?? '',
        ticketPreferences,
        notificationStatus: 'PENDING',
        notificationAttempts: 0,
        priority,
        // status field is set automatically by database layer to "ACTIVE"
        ref: {
            id: entryId,
            partition: [sessionRef.id, vendorId],
            container: WAITLIST_CONTAINER
        }
    };

    await context.dataSources.cosmos.add_record(
        WAITLIST_CONTAINER,
        entry,
        `${sessionRef.id}|${vendorId}`, // Composite partition key
        context.userId ?? "GUEST"
    );

    return entry;
};

/**
 * Get the count of active waitlist entries for a session
 */
export const get_waitlist_count = async (
    context: serverContext,
    sessionRef: recordref_type
): Promise<number> => {
    const result = await context.dataSources.cosmos.run_query<number>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT VALUE COUNT(1) FROM c
                    WHERE c.sessionRef.id = @sessionId
                    AND c.status = "ACTIVE"
                    AND c.notificationStatus IN ("PENDING", "NOTIFIED")`,
            parameters: [{ name: "@sessionId", value: sessionRef.id }]
        }
    );
    return (result && result.length > 0) ? result[0] : 0;
};

/**
 * Get a customer's position in the waitlist
 */
export const get_queue_position = async (
    context: serverContext,
    sessionRef: recordref_type,
    customerEmail: string
): Promise<number | null> => {
    // First, get the customer's priority
    const entries = await context.dataSources.cosmos.run_query<waitlist_entry_type>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT * FROM c
                    WHERE c.sessionRef.id = @sessionId
                    AND c.customerEmail = @email
                    AND c.status = "ACTIVE"`,
            parameters: [
                { name: "@sessionId", value: sessionRef.id },
                { name: "@email", value: customerEmail }
            ]
        }
    );

    if (!entries || entries.length === 0) {
        return null;
    }

    const customerPriority = entries[0].priority;

    // Count how many people are ahead
    const ahead = await context.dataSources.cosmos.run_query<number>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT VALUE COUNT(1) FROM c
                    WHERE c.sessionRef.id = @sessionId
                    AND c.status = "ACTIVE"
                    AND c.notificationStatus IN ("PENDING", "NOTIFIED")
                    AND c.priority < @priority`,
            parameters: [
                { name: "@sessionId", value: sessionRef.id },
                { name: "@priority", value: customerPriority }
            ]
        }
    );

    const aheadCount = (ahead && ahead.length > 0) ? ahead[0] : 0;
    return aheadCount + 1;
};

/**
 * Get waitlist status for a session
 */
export const get_waitlist_status = async (
    context: serverContext,
    sessionRef: recordref_type,
    customerEmail?: string
): Promise<{
    totalInWaitlist: number;
    yourPosition: number | null;
    isInWaitlist: boolean;
}> => {
    const totalInWaitlist = await get_waitlist_count(context, sessionRef);

    let yourPosition: number | null = null;
    let isInWaitlist = false;

    if (customerEmail) {
        yourPosition = await get_queue_position(context, sessionRef, customerEmail);
        isInWaitlist = yourPosition !== null;
    }

    return {
        totalInWaitlist,
        yourPosition,
        isInWaitlist
    };
};

/**
 * Get next customer to notify when a slot opens
 */
export const get_next_to_notify = async (
    context: serverContext,
    sessionRef: recordref_type
): Promise<waitlist_entry_type | null> => {
    const entries = await context.dataSources.cosmos.run_query<waitlist_entry_type>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT TOP 1 * FROM c
                    WHERE c.sessionRef.id = @sessionId
                    AND c.status = "ACTIVE"
                    AND c.notificationStatus = "PENDING"
                    ORDER BY c.priority ASC`,
            parameters: [{ name: "@sessionId", value: sessionRef.id }]
        }
    );

    return entries && entries.length > 0 ? entries[0] : null;
};

/**
 * Mark a waitlist entry as notified
 */
export const mark_as_notified = async (
    context: serverContext,
    entry: waitlist_entry_type
): Promise<void> => {
    const expiryTime = DateTime.now().plus({ hours: NOTIFICATION_EXPIRY_HOURS }).toISO();

    await context.dataSources.cosmos.patch_record(
        WAITLIST_CONTAINER,
        entry.id,
        `${entry.sessionRef.id}|${entry.vendorId}`,
        [
            { op: "set", path: "/notificationStatus", value: "NOTIFIED" },
            { op: "set", path: "/lastNotificationAttempt", value: DateTime.now().toISO() },
            { op: "set", path: "/notificationExpiry", value: expiryTime },
            { op: "incr", path: "/notificationAttempts", value: 1 }
        ],
        context.userId
    );
};

/**
 * Mark a waitlist entry as expired (didn't book within time limit)
 */
export const mark_as_expired = async (
    context: serverContext,
    entry: waitlist_entry_type
): Promise<void> => {
    await context.dataSources.cosmos.patch_record(
        WAITLIST_CONTAINER,
        entry.id,
        `${entry.sessionRef.id}|${entry.vendorId}`,
        [
            { op: "set", path: "/notificationStatus", value: "EXPIRED" }
        ],
        context.userId
    );
};

/**
 * Mark a waitlist entry as converted to a booking
 */
export const mark_as_converted = async (
    context: serverContext,
    entry: waitlist_entry_type,
    bookingId: string
): Promise<void> => {
    await context.dataSources.cosmos.patch_record(
        WAITLIST_CONTAINER,
        entry.id,
        `${entry.sessionRef.id}|${entry.vendorId}`,
        [
            { op: "set", path: "/notificationStatus", value: "CONVERTED" },
            { op: "set", path: "/convertedToBookingId", value: bookingId }
        ],
        context.userId
    );
};

/**
 * Cancel a waitlist entry
 */
export const cancel_waitlist_entry = async (
    context: serverContext,
    entryId: string,
    sessionId: string,
    vendorId: string
): Promise<void> => {
    await context.dataSources.cosmos.patch_record(
        WAITLIST_CONTAINER,
        entryId,
        `${sessionId}|${vendorId}`,
        [
            { op: "set", path: "/notificationStatus", value: "CANCELLED" },
            { op: "set", path: "/cancelledAt", value: DateTime.now().toISO() },
            { op: "set", path: "/status", value: RecordStatus.INACTIVE }
        ],
        context.userId
    );
};

/**
 * Process waitlist when a slot opens up (called after booking cancellation)
 * Returns the entries that were notified
 */
export const process_waitlist_on_slot_open = async (
    context: serverContext,
    sessionRef: recordref_type,
    slotsAvailable: number = 1
): Promise<waitlist_entry_type[]> => {
    const notifiedEntries: waitlist_entry_type[] = [];

    for (let i = 0; i < slotsAvailable; i++) {
        const nextEntry = await get_next_to_notify(context, sessionRef);

        if (!nextEntry) {
            break;
        }

        // Mark as notified
        await mark_as_notified(context, nextEntry);

        // Send notification email
        try {
            await context.dataSources.email.sendEmail(
                "noreply@spiriverse.com",
                nextEntry.customerEmail,
                "TOUR_WAITLIST_SPOT_AVAILABLE",
                {
                    tourName: nextEntry.tourName,
                    sessionDate: nextEntry.sessionDate,
                    sessionTime: nextEntry.sessionTime,
                    expiryHours: NOTIFICATION_EXPIRY_HOURS,
                    ticketPreferences: nextEntry.ticketPreferences
                }
            );
        } catch (emailError) {
            console.error("Failed to send waitlist notification email:", emailError);
        }

        notifiedEntries.push(nextEntry);
    }

    return notifiedEntries;
};

/**
 * Check and expire old notifications (should be called periodically)
 */
export const expire_old_notifications = async (
    context: serverContext,
    sessionRef: recordref_type
): Promise<number> => {
    const now = DateTime.now().toISO();

    const expiredEntries = await context.dataSources.cosmos.run_query<waitlist_entry_type>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT * FROM c
                    WHERE c.sessionRef.id = @sessionId
                    AND c.status = "ACTIVE"
                    AND c.notificationStatus = "NOTIFIED"
                    AND c.notificationExpiry < @now`,
            parameters: [
                { name: "@sessionId", value: sessionRef.id },
                { name: "@now", value: now }
            ]
        }
    );

    for (const entry of expiredEntries) {
        await mark_as_expired(context, entry);
    }

    return expiredEntries.length;
};

/**
 * Get customer's waitlist entries across all sessions for a vendor
 */
export const get_customer_waitlist_entries = async (
    context: serverContext,
    customerEmail: string,
    vendorId: string
): Promise<waitlist_entry_type[]> => {
    const entries = await context.dataSources.cosmos.run_query<waitlist_entry_type>(
        WAITLIST_CONTAINER,
        {
            query: `SELECT * FROM c
                    WHERE c.customerEmail = @email
                    AND c.vendorId = @vendorId
                    AND c.status = "ACTIVE"
                    ORDER BY c.dateJoined DESC`,
            parameters: [
                { name: "@email", value: customerEmail },
                { name: "@vendorId", value: vendorId }
            ]
        }
    );

    return entries || [];
};
