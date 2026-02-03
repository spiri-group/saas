import NodeCache from "node-cache";
import { InvocationContext, Timer, app } from "@azure/functions";
import { DateTime } from "luxon";
import { sender_details } from "../client/email_templates";
import { serviceBooking_type } from "../graphql/service/types";
import { user_type } from "../graphql/user/types";
import { vendor_type } from "../graphql/vendor/types";
import { CosmosDataSource } from "../utils/database";
import { AzureEmailDataSource } from "../services/azureEmail";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import { renderEmailTemplate } from "../graphql/email/utils";

const myCache = new NodeCache();

/**
 * Service Booking Reminder Email Scheduler
 *
 * Runs every 15 minutes to send reminder emails for upcoming scheduled service bookings:
 *
 * 1. 24-hour reminder: Sent 24-48 hours before session start
 * 2. 1-hour reminder: Sent 1-2 hours before session start
 *
 * Flow:
 * - Query confirmed bookings in the reminder windows
 * - Send reminder emails to both customer and practitioner
 * - Track remindersSent on the booking to avoid duplicates
 */
export async function bookingReminder(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Booking reminder cron job started at:', new Date().toISOString());

    try {
        const host = process.env.WEBSITE_HOSTNAME || 'localhost:7071';
        const logger = new LogManager(context);
        const keyVault = new vault(host, logger, myCache);

        const cosmos = new CosmosDataSource(logger, keyVault);
        const email = new AzureEmailDataSource(logger, keyVault);

        await cosmos.init(host);
        await email.init(host);

        // Set dataSources reference for email service (needed for Cosmos template lookups)
        email.setDataSources({ cosmos });

        const now = DateTime.now();

        // ========================================
        // Task 1: Send 24-hour reminders
        // ========================================
        await send24HourReminders(cosmos, email, now, context);

        // ========================================
        // Task 2: Send 1-hour reminders
        // ========================================
        await send1HourReminders(cosmos, email, now, context);

        // ========================================
        // Task 3: Expire unconfirmed bookings
        // ========================================
        await expireUnconfirmedBookings(cosmos, email, now, context);

        context.log('Booking reminder cron job completed successfully');
    } catch (error) {
        context.error('Booking reminder cron job failed:', error);
        throw error;
    }
}

/**
 * Send 24-hour reminder emails for bookings starting in 24-48 hours
 */
async function send24HourReminders(
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    now: DateTime,
    context: InvocationContext
): Promise<void> {
    context.log('Checking for 24-hour reminders...');

    // Find bookings starting between 24 and 48 hours from now
    const reminderWindowStart = now.plus({ hours: 24 });
    const reminderWindowEnd = now.plus({ hours: 48 });

    const bookings = await queryBookingsInWindow(
        cosmos,
        reminderWindowStart,
        reminderWindowEnd,
        '24h',
        context
    );

    context.log(`Found ${bookings.length} bookings needing 24-hour reminders`);

    for (const booking of bookings) {
        await sendReminderEmails(cosmos, email, booking, '24h', context);
    }
}

/**
 * Send 1-hour reminder emails for bookings starting in 1-2 hours
 */
async function send1HourReminders(
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    now: DateTime,
    context: InvocationContext
): Promise<void> {
    context.log('Checking for 1-hour reminders...');

    // Find bookings starting between 1 and 2 hours from now
    const reminderWindowStart = now.plus({ hours: 1 });
    const reminderWindowEnd = now.plus({ hours: 2 });

    const bookings = await queryBookingsInWindow(
        cosmos,
        reminderWindowStart,
        reminderWindowEnd,
        '1h',
        context
    );

    context.log(`Found ${bookings.length} bookings needing 1-hour reminders`);

    for (const booking of bookings) {
        await sendReminderEmails(cosmos, email, booking, '1h', context);
    }
}

/**
 * Expire bookings that haven't been confirmed within the deadline
 */
async function expireUnconfirmedBookings(
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    now: DateTime,
    context: InvocationContext
): Promise<void> {
    context.log('Checking for expired bookings...');

    // Find pending bookings past their confirmation deadline
    const querySpec = {
        query: `
            SELECT * FROM c
            WHERE c.confirmationStatus = 'PENDING_CONFIRMATION'
            AND c.confirmationDeadline < @now
            AND c.status = 'ACTIVE'
        `,
        parameters: [
            { name: "@now", value: now.toISO() }
        ]
    };

    const expiredBookings = await cosmos.run_query<serviceBooking_type>("Main-Bookings", querySpec, true);
    context.log(`Found ${expiredBookings.length} expired bookings`);

    for (const booking of expiredBookings) {
        try {
            // Update booking status to EXPIRED
            const updatedBooking: serviceBooking_type = {
                ...booking,
                confirmationStatus: "EXPIRED",
                orderStatus: "CANCELLED",
                expiredDate: now.toISO()
            };

            await cosmos.update_record(
                "Main-Bookings",
                booking.id,
                ["SERVICE", booking.customerId],
                updatedBooking,
                "system"
            );

            // Cancel the Stripe payment intent if exists
            // Note: This would need Stripe integration - skipping for now as auth expires automatically

            // Send expiration emails
            await sendExpirationEmails(cosmos, email, booking, context);

            context.log(`Expired booking ${booking.id}`);
        } catch (error) {
            context.error(`Failed to expire booking ${booking.id}:`, error);
        }
    }
}

/**
 * Query confirmed bookings in a time window that haven't received the specified reminder
 */
async function queryBookingsInWindow(
    cosmos: CosmosDataSource,
    windowStart: DateTime,
    windowEnd: DateTime,
    reminderType: '24h' | '1h',
    context: InvocationContext
): Promise<serviceBooking_type[]> {
    // Query bookings where:
    // - confirmationStatus = CONFIRMED
    // - scheduledDateTime is in the window
    // - remindersSent doesn't include this reminder type
    const reminderField = reminderType === '24h' ? 'reminder24hSent' : 'reminder1hSent';
    const querySpec = {
        query: `
            SELECT * FROM c
            WHERE c.confirmationStatus = 'CONFIRMED'
            AND c.scheduledDateTime.utcDateTime >= @windowStart
            AND c.scheduledDateTime.utcDateTime < @windowEnd
            AND (NOT IS_DEFINED(c.remindersSent.${reminderField})
                 OR c.remindersSent.${reminderField} = false)
            AND c.status = 'ACTIVE'
        `,
        parameters: [
            { name: "@windowStart", value: windowStart.toISO() },
            { name: "@windowEnd", value: windowEnd.toISO() }
        ]
    };

    return await cosmos.run_query<serviceBooking_type>("Main-Bookings", querySpec, true);
}

/**
 * Send reminder emails to both customer and practitioner
 */
async function sendReminderEmails(
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    booking: serviceBooking_type,
    reminderType: '24h' | '1h',
    context: InvocationContext
): Promise<void> {
    try {
        // Fetch customer and practitioner details
        const customer = await cosmos.get_record<user_type>("Main-User", booking.customerId, booking.customerId);
        const practitioner = await cosmos.get_record<vendor_type>("Main-Vendor", booking.vendorId, booking.vendorId);

        if (!customer || !practitioner) {
            context.warn(`Missing customer or practitioner for booking ${booking.id}`);
            return;
        }

        const customerName = `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Customer';
        const practitionerName = practitioner.name || 'Practitioner';
        const serviceName = booking.service?.name || 'Service';
        const bookingDate = DateTime.fromISO(booking.scheduledDateTime?.date || '').toFormat('EEEE, MMMM d, yyyy');
        const bookingTime = `${booking.scheduledDateTime?.time?.start || ''} - ${booking.scheduledDateTime?.time?.end || ''}`;
        const deliveryMethod = booking.deliveryMethod === 'ONLINE' ? 'Online Session' :
            booking.deliveryMethod === 'AT_PRACTITIONER' ? 'At Practitioner Location' :
            booking.deliveryMethod === 'MOBILE' ? 'Mobile Session' : booking.deliveryMethod;

        const templateName = reminderType === '24h' ? 'booking-reminder-24h' : 'booking-reminder-1h';

        // Mock dataSources object for renderEmailTemplate
        const mockDataSources = { cosmos } as any;

        // Send reminder to customer
        const customerEmailContent = await renderEmailTemplate(mockDataSources, templateName, {
            recipientName: customerName,
            recipientType: 'customer',
            practitionerName,
            customerName,
            serviceName,
            bookingDate,
            bookingTime,
            deliveryMethod,
            meetingLink: booking.meetingLink || '',
            meetingPasscode: booking.meetingPasscode || '',
            practitionerAddress: booking.practitionerAddress || '',
            reminderHours: reminderType === '24h' ? '24' : '1'
        });

        if (customerEmailContent && booking.customerEmail) {
            await email.sendRawHtmlEmail(
                sender_details.from,
                booking.customerEmail,
                customerEmailContent.subject,
                customerEmailContent.html
            );
            context.log(`Sent ${reminderType} reminder to customer ${booking.customerEmail}`);
        }

        // Send reminder to practitioner
        const practitionerEmailContent = await renderEmailTemplate(mockDataSources, templateName, {
            recipientName: practitionerName,
            recipientType: 'practitioner',
            practitionerName,
            customerName,
            customerEmail: booking.customerEmail,
            serviceName,
            bookingDate,
            bookingTime,
            deliveryMethod,
            customerAddress: booking.customerAddress?.formattedAddress || '',
            reminderHours: reminderType === '24h' ? '24' : '1'
        });

        const practitionerEmail = practitioner.contact?.internal?.email;
        if (practitionerEmailContent && practitionerEmail) {
            await email.sendRawHtmlEmail(
                sender_details.from,
                practitionerEmail,
                practitionerEmailContent.subject,
                practitionerEmailContent.html
            );
            context.log(`Sent ${reminderType} reminder to practitioner ${practitionerEmail}`);
        }

        // Update booking to mark reminder as sent
        const updatedRemindersSent = {
            ...booking.remindersSent,
            [reminderType === '24h' ? 'reminder24hSent' : 'reminder1hSent']: true,
            [reminderType === '24h' ? 'reminder24hSentAt' : 'reminder1hSentAt']: DateTime.now().toISO()
        };

        await cosmos.update_record(
            "Main-Bookings",
            booking.id,
            ["SERVICE", booking.customerId],
            { ...booking, remindersSent: updatedRemindersSent },
            "system"
        );

        context.log(`Marked ${reminderType} reminder as sent for booking ${booking.id}`);
    } catch (error) {
        context.error(`Failed to send ${reminderType} reminder for booking ${booking.id}:`, error);
    }
}

/**
 * Send expiration emails to both customer and practitioner
 */
async function sendExpirationEmails(
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    booking: serviceBooking_type,
    context: InvocationContext
): Promise<void> {
    try {
        const customer = await cosmos.get_record<user_type>("Main-User", booking.customerId, booking.customerId);
        const practitioner = await cosmos.get_record<vendor_type>("Main-Vendor", booking.vendorId, booking.vendorId);

        if (!customer || !practitioner) return;

        const customerName = `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Customer';
        const practitionerName = practitioner.name || 'Practitioner';
        const serviceName = booking.service?.name || 'Service';
        const bookingDate = DateTime.fromISO(booking.scheduledDateTime?.date || '').toFormat('EEEE, MMMM d, yyyy');
        const bookingTime = `${booking.scheduledDateTime?.time?.start || ''} - ${booking.scheduledDateTime?.time?.end || ''}`;
        const practitionerProfileUrl = practitioner.slug ? `https://spiriverse.com/p/${practitioner.slug}` : 'https://spiriverse.com';

        const mockDataSources = { cosmos } as any;

        // Send to customer
        const customerEmailContent = await renderEmailTemplate(mockDataSources, 'booking-expired-customer', {
            customerName,
            practitionerName,
            serviceName,
            bookingDate,
            bookingTime,
            practitionerProfileUrl
        });

        if (customerEmailContent && booking.customerEmail) {
            await email.sendRawHtmlEmail(
                sender_details.from,
                booking.customerEmail,
                customerEmailContent.subject,
                customerEmailContent.html
            );
        }

        // Send to practitioner
        const practitionerEmailContent = await renderEmailTemplate(mockDataSources, 'booking-expired-practitioner', {
            practitionerName,
            customerName,
            customerEmail: booking.customerEmail,
            serviceName,
            bookingDate,
            bookingTime
        });

        const practitionerEmail = practitioner.contact?.internal?.email;
        if (practitionerEmailContent && practitionerEmail) {
            await email.sendRawHtmlEmail(
                sender_details.from,
                practitionerEmail,
                practitionerEmailContent.subject,
                practitionerEmailContent.html
            );
        }

        context.log(`Sent expiration emails for booking ${booking.id}`);
    } catch (error) {
        context.error(`Failed to send expiration emails for booking ${booking.id}:`, error);
    }
}

// Register the timer function to run every 15 minutes
app.timer('bookingReminder', {
    schedule: '0 */15 * * * *', // Every 15 minutes
    handler: bookingReminder,
});
