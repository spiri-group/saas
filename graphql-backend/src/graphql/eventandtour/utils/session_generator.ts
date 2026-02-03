import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { rrulestr, RRule } from "rrule";
import { session_type, tour_type } from "../types";
import { CosmosDataSource } from "../../../utils/database";

interface ListingSchedule {
    id: string;
    vendorId: string;
    listingId: string;
    name: string;
    recurrenceRule?: string;
    dates?: string[];
    capacity: number;
    fromTime: string;
    toTime: string;
    activityListId: string;
    ticketListId?: string;
}

/**
 * Generate session documents from schedules for a date range
 * Returns sessions that were created (doesn't include already-existing ones)
 */
export const generate_sessions_from_schedules = async (
    schedules: ListingSchedule[],
    tour: tour_type,
    fromDate: DateTime,
    toDate: DateTime,
    cosmos: CosmosDataSource,
    userId: string,
    ttlSeconds: number = 604800 // 7 days default
): Promise<session_type[]> => {
    const generatedSessions: session_type[] = [];

    for (const schedule of schedules) {
        // Get dates for this schedule within the range
        const dates = get_dates_from_schedule(schedule, fromDate, toDate);

        for (const date of dates) {
            const dateStr = date.toISODate();

            // Check if session already exists for this date/schedule
            const existingQuery = `
                SELECT * FROM c
                WHERE c.date = @date
                AND c.scheduleId = @scheduleId
                AND c.forObject.id = @listingId
            `;

            const existing = await cosmos.run_query<session_type>("Tour-Session", {
                query: existingQuery,
                parameters: [
                    { name: "@date", value: dateStr },
                    { name: "@scheduleId", value: schedule.id },
                    { name: "@listingId", value: schedule.listingId }
                ]
            });

            // Skip if session already exists
            if (existing.length > 0) {
                continue;
            }

            // Create new temporary session
            const sessionId = uuidv4();
            const session: session_type = {
                id: sessionId,
                code: Math.floor(100000 + Math.random() * 900000).toString(),
                sessionTitle: schedule.name || tour.name,
                date: dateStr,
                time: {
                    start: schedule.fromTime,
                    end: schedule.toTime,
                    duration_ms: DateTime.fromISO(schedule.toTime).diff(DateTime.fromISO(schedule.fromTime)).toMillis()
                },
                activityListId: schedule.activityListId,
                capacity: {
                    max: schedule.capacity,
                    current: 0,
                    remaining: schedule.capacity,
                    mode: 'PER_PERSON' // Default, can be configured
                },
                forObject: {
                    id: schedule.listingId,
                    partition: [schedule.vendorId],
                    container: "Main-Listing"
                },
                ref: {
                    id: sessionId,
                    partition: [schedule.listingId, schedule.vendorId],
                    container: "Tour-Session"
                },
                bookings: [],
                announcements: []
            };

            // Create session in Cosmos
            try {
                await cosmos.upsert_record(
                    "Tour-Session",
                    session.id,
                    session,
                    [schedule.vendorId, schedule.listingId]
                );
                generatedSessions.push(session);
            } catch (error) {
                // Session might have been created by concurrent request - skip
                console.warn(`Failed to create session for ${dateStr}: ${error.message}`);
            }
        }
    }

    return generatedSessions;
};

/**
 * Get dates from schedule within a date range
 */
function get_dates_from_schedule(
    schedule: ListingSchedule,
    fromDate: DateTime,
    toDate: DateTime
): DateTime[] {
    const dates: DateTime[] = [];

    // If schedule has explicit dates array
    if (schedule.dates && schedule.dates.length > 0) {
        for (const dateStr of schedule.dates) {
            const date = DateTime.fromISO(dateStr);
            if (date >= fromDate && date <= toDate) {
                dates.push(date);
            }
        }
        return dates;
    }

    // If schedule has recurrence rule
    if (schedule.recurrenceRule) {
        try {
            const rule = rrulestr(schedule.recurrenceRule);
            const jsDatesBetween = rule.between(
                fromDate.toJSDate(),
                toDate.toJSDate(),
                true // inclusive
            );

            for (const jsDate of jsDatesBetween) {
                dates.push(DateTime.fromJSDate(jsDate));
            }
        } catch (error) {
            console.error(`Failed to parse recurrence rule: ${schedule.recurrenceRule}`, error);
        }
    }

    return dates;
}

/**
 * Get all schedules for a listing
 */
export const get_schedules_for_listing = async (
    cosmos: CosmosDataSource,
    vendorId: string,
    listingId: string
): Promise<ListingSchedule[]> => {
    const query = `
        SELECT * FROM c
        WHERE c.vendorId = @vendorId
        AND c.listingId = @listingId
        AND c.docType = 'schedule'
    `;

    return await cosmos.run_query<ListingSchedule>("Main-Listing", {
        query,
        parameters: [
            { name: "@vendorId", value: vendorId },
            { name: "@listingId", value: listingId }
        ]
    });
};

/**
 * Check if sessions need to be generated for a date range
 * Returns true if there are gaps in coverage
 */
export const needs_session_generation = async (
    cosmos: CosmosDataSource,
    listingId: string,
    fromDate: DateTime,
    toDate: DateTime
): Promise<boolean> => {
    // Get count of existing sessions
    const query = `
        SELECT VALUE COUNT(1) FROM c
        WHERE c.forObject.id = @listingId
        AND c.date >= @from
        AND c.date <= @to
    `;

    const result = await cosmos.run_query<number>("Tour-Session", {
        query,
        parameters: [
            { name: "@listingId", value: listingId },
            { name: "@from", value: fromDate.toISODate() },
            { name: "@to", value: toDate.toISODate() }
        ]
    });

    const existingCount = result[0] || 0;

    // If no sessions exist, we definitely need generation
    if (existingCount === 0) {
        return true;
    }

    // Could add more sophisticated checks here
    // For now, assume if any sessions exist, we're covered
    return false;
};
