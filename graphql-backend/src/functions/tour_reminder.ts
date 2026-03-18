import { DateTime } from "luxon";
import { sender_details } from "../client/email_templates";
import { booking_type, session_type, tour_type } from "../graphql/eventandtour/types";
import { vendor_type } from "../graphql/vendor/types";
import { CosmosDataSource } from "../utils/database";
import { AzureEmailDataSource } from "../services/azureEmail";
import { LogManager } from "../utils/functions";
import { renderEmailTemplate } from "../graphql/email/utils";

/**
 * Extracted core logic for tour reminders.
 * Can be called from Azure Functions timer trigger or Container Job entry point.
 */
export async function runTourReminder(
  cosmos: CosmosDataSource,
  email: AzureEmailDataSource,
  logger: LogManager
): Promise<void> {
  logger.logMessage('Tour reminder started at: ' + new Date().toISOString());

  const now = DateTime.now();

  await send24HourReminders(cosmos, email, now, logger);
  await send2HourReminders(cosmos, email, now, logger);
  await sendPostTourReviewRequests(cosmos, email, now, logger);

  logger.logMessage('Tour reminder completed successfully');
}

/**
 * Send 24-hour reminder emails for sessions starting in 24-48 hours
 */
async function send24HourReminders(
  cosmos: CosmosDataSource,
  email: AzureEmailDataSource,
  now: DateTime,
  logger: LogManager
): Promise<void> {
  logger.logMessage('Checking for 24-hour reminders...');

  // Find sessions starting between 24 and 48 hours from now
  const reminderWindowStart = now.plus({ hours: 24 });
  const reminderWindowEnd = now.plus({ hours: 48 });

  // Query sessions in the 24-48 hour window
  const upcomingSessions = await queryUpcomingSessions(
    cosmos,
    reminderWindowStart,
    reminderWindowEnd,
    logger
  );

  logger.logMessage(`Found ${upcomingSessions.length} sessions in 24-48 hour window`);

  for (const session of upcomingSessions) {
    await processSessionReminders(
      cosmos,
      email,
      session,
      '24H',
      'tour-reminder-24h',
      logger
    );
  }
}

/**
 * Send 2-hour reminder emails for sessions starting in 2-4 hours
 */
async function send2HourReminders(
  cosmos: CosmosDataSource,
  email: AzureEmailDataSource,
  now: DateTime,
  logger: LogManager
): Promise<void> {
  logger.logMessage('Checking for 2-hour reminders...');

  // Find sessions starting between 2 and 4 hours from now
  const reminderWindowStart = now.plus({ hours: 2 });
  const reminderWindowEnd = now.plus({ hours: 4 });

  // Query sessions in the 2-4 hour window
  const upcomingSessions = await queryUpcomingSessions(
    cosmos,
    reminderWindowStart,
    reminderWindowEnd,
    logger
  );

  logger.logMessage(`Found ${upcomingSessions.length} sessions in 2-4 hour window`);

  for (const session of upcomingSessions) {
    await processSessionReminders(
      cosmos,
      email,
      session,
      '2H',
      'tour-reminder-2h',
      logger
    );
  }
}

/**
 * Query upcoming sessions within a time window
 */
async function queryUpcomingSessions(
  cosmos: CosmosDataSource,
  windowStart: DateTime,
  windowEnd: DateTime,
  logger: LogManager
): Promise<session_type[]> {
  // Query sessions by date range
  // Sessions have date (YYYY-MM-DD) and time.start (HH:mm) fields
  const startDate = windowStart.toISODate();
  const endDate = windowEnd.toISODate();

  const sessions = await cosmos.run_query<session_type>("Tour-Session", {
    query: `
      SELECT * FROM c
      WHERE c.date >= @startDate
      AND c.date <= @endDate
      AND c.status = "ACTIVE"
    `,
    parameters: [
      { name: "@startDate", value: startDate },
      { name: "@endDate", value: endDate }
    ]
  }, true);

  // Filter sessions more precisely by combining date and time
  return sessions.filter(session => {
    const sessionDateTime = DateTime.fromISO(`${session.date}T${session.time.start}`);
    return sessionDateTime >= windowStart && sessionDateTime <= windowEnd;
  });
}

/**
 * Process reminders for a specific session
 */
async function processSessionReminders(
  cosmos: CosmosDataSource,
  email: AzureEmailDataSource,
  session: session_type,
  reminderType: '24H' | '2H',
  templateId: string,
  logger: LogManager
): Promise<void> {
  try {
    // Get the tour for this session
    const tour = await cosmos.get_record<tour_type>(
      session.forObject.container || "Main-Listing",
      session.forObject.id,
      session.forObject.partition
    );

    // Find all confirmed bookings for this session that haven't received this reminder type
    const bookings = await getBookingsForSession(cosmos, session, reminderType, logger);

    logger.logMessage(`Found ${bookings.length} bookings to remind for session ${session.id}`);

    for (const booking of bookings) {
      try {
        // Get vendor slug for booking URL
        let vendorSlug = '';
        try {
          const vendor = await cosmos.get_record<vendor_type>("Main-Vendor", session.forObject.partition[0] || '', session.forObject.partition[0] || '');
          vendorSlug = vendor?.slug || '';
        } catch { /* vendor slug is optional for the URL */ }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spiriverse.com';

        // Render email from Cosmos template
        const mockDataSources = { cosmos } as any;
        const emailContent = await renderEmailTemplate(mockDataSources, templateId, {
          tourName: tour.name,
          sessionDate: formatDate(session.date),
          sessionTime: formatTime(session.time.start),
          bookingCode: booking.code,
          customerName: booking.user?.name || booking.customerEmail.split('@')[0],
          bookingUrl: vendorSlug ? `${baseUrl}/booking/${vendorSlug}/${booking.code}` : ''
        });

        if (emailContent) {
          await email.sendRawHtmlEmail(
            sender_details.from,
            booking.customerEmail,
            emailContent.subject,
            emailContent.html
          );
        }

        // Update booking to mark reminder as sent
        const now = DateTime.now().toISO();
        await cosmos.patch_record(
          "Main-Bookings",
          booking.id,
          booking.ref.partition,
          [
            {
              op: "set",
              path: "/reminderSent",
              value: { datetime: now, type: reminderType }
            }
          ],
          "tour-reminder-cron"
        );

        logger.logMessage(`Sent ${reminderType} reminder to ${booking.customerEmail} for booking ${booking.id}`);
      } catch (bookingError) {
        logger.error(`Failed to send reminder for booking ${booking.id}:`, bookingError);
        // Continue with next booking
      }
    }
  } catch (sessionError) {
    logger.error(`Failed to process session ${session.id}:`, sessionError);
    // Continue with next session
  }
}

/**
 * Get confirmed bookings for a session that haven't received a specific reminder type
 *
 * A booking is considered "confirmed" if any of its tickets have been paid.
 * Payment is tracked via status_log with label "PAID" on individual tickets.
 */
async function getBookingsForSession(
  cosmos: CosmosDataSource,
  session: session_type,
  reminderType: '24H' | '2H',
  logger: LogManager
): Promise<booking_type[]> {
  // Query bookings that reference this session
  // Bookings have sessions[].ref pointing to session
  // A booking is paid when its tickets have status_log with "PAID"

  // For 24H reminder: no reminderSent at all
  // For 2H reminder: either no reminderSent, or reminderSent.type is '24H'

  let reminderCondition: string;
  if (reminderType === '24H') {
    // For 24H: booking should not have any reminderSent
    reminderCondition = 'AND NOT IS_DEFINED(c.reminderSent)';
  } else {
    // For 2H: booking should not have 2H reminder sent
    reminderCondition = 'AND (NOT IS_DEFINED(c.reminderSent) OR c.reminderSent.type = "24H")';
  }

  // Query all bookings for this session that are active
  const allBookings = await cosmos.run_query<booking_type>("Main-Bookings", {
    query: `
      SELECT * FROM c
      WHERE EXISTS(
        SELECT VALUE s
        FROM s IN c.sessions
        WHERE s.ref.id = @sessionId
      )
      AND c.status = "ACTIVE"
      ${reminderCondition}
    `,
    parameters: [
      { name: "@sessionId", value: session.id }
    ]
  }, true);

  // Filter to only include bookings that have been paid
  // A booking is considered paid if any of its session tickets have status_log with "PAID"
  const paidBookings = allBookings.filter(booking => {
    return isBookingPaid(booking);
  });

  return paidBookings;
}

/**
 * Check if a booking has been paid
 * A booking is paid if any of its tickets have a status_log entry with label "PAID"
 */
function isBookingPaid(booking: booking_type): boolean {
  for (const session of booking.sessions) {
    for (const ticket of session.tickets) {
      // Check if ticket has status_log with PAID
      const ticketAny = ticket as any;
      if (ticketAny.status_log && Array.isArray(ticketAny.status_log)) {
        const hasPaid = ticketAny.status_log.some(
          (entry: { label: string }) => entry.label === 'PAID'
        );
        if (hasPaid) {
          return true;
        }
      }
    }
  }

  // Also check if the booking itself has a paid status
  if (booking.paid?.datetime) {
    return true;
  }

  return false;
}

/**
 * Get total number of tickets in a booking
 */
function getTotalTickets(booking: booking_type): number {
  return booking.sessions.reduce((total, session) => {
    return total + session.tickets.reduce((ticketTotal, ticket) => {
      return ticketTotal + ticket.quantity;
    }, 0);
  }, 0);
}

/**
 * Format date for display in email
 */
function formatDate(isoDate: string): string {
  const dt = DateTime.fromISO(isoDate);
  return dt.toFormat('EEEE, MMMM d, yyyy'); // e.g., "Saturday, January 15, 2025"
}

/**
 * Format time for display in email
 */
function formatTime(time: string): string {
  // time is in HH:mm format
  const [hours, minutes] = time.split(':').map(Number);
  const dt = DateTime.fromObject({ hour: hours, minute: minutes });
  return dt.toFormat('h:mm a'); // e.g., "2:30 PM"
}

/**
 * Send review request emails for sessions that ended 2-48 hours ago
 */
async function sendPostTourReviewRequests(
  cosmos: CosmosDataSource,
  email: AzureEmailDataSource,
  now: DateTime,
  logger: LogManager
): Promise<void> {
  logger.logMessage('Checking for post-tour review requests...');

  // Find sessions that ended 2-48 hours ago (give people time to get home, but not too long)
  const windowStart = now.minus({ hours: 48 });
  const windowEnd = now.minus({ hours: 2 });

  const startDate = windowStart.toISODate();
  const endDate = windowEnd.toISODate();

  const completedSessions = await cosmos.run_query<session_type>("Tour-Session", {
    query: `
      SELECT * FROM c
      WHERE c.date >= @startDate
      AND c.date <= @endDate
      AND c.status = "ACTIVE"
    `,
    parameters: [
      { name: "@startDate", value: startDate },
      { name: "@endDate", value: endDate }
    ]
  }, true);

  // Filter to sessions that have actually ended
  const endedSessions = completedSessions.filter(session => {
    const sessionEnd = DateTime.fromISO(`${session.date}T${session.time.end}`);
    return sessionEnd >= windowStart && sessionEnd <= windowEnd;
  });

  logger.logMessage(`Found ${endedSessions.length} completed sessions for review requests`);

  for (const session of endedSessions) {
    try {
      const tour = await cosmos.get_record<tour_type>(
        session.forObject.container || "Main-Listing",
        session.forObject.id,
        session.forObject.partition
      );

      // Get vendor slug for review URL
      let vendorSlug = '';
      try {
        const vendor = await cosmos.get_record<vendor_type>("Main-Vendor", session.forObject.partition[0] || '', session.forObject.partition[0] || '');
        vendorSlug = vendor?.slug || '';
      } catch { /* optional */ }

      // Find bookings that checked in and haven't received a review request
      const bookings = await cosmos.run_query<booking_type>("Main-Bookings", {
        query: `
          SELECT * FROM c
          WHERE EXISTS(
            SELECT VALUE s FROM s IN c.sessions WHERE s.ref.id = @sessionId
          )
          AND c.status = "ACTIVE"
          AND IS_DEFINED(c.checkedIn)
          AND (NOT IS_DEFINED(c.reviewRequestSent) OR c.reviewRequestSent = false)
        `,
        parameters: [
          { name: "@sessionId", value: session.id }
        ]
      }, true);

      logger.logMessage(`Found ${bookings.length} checked-in bookings to request reviews for session ${session.id}`);

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spiriverse.com';
      const mockDataSources = { cosmos } as any;

      for (const booking of bookings) {
        try {
          const emailContent = await renderEmailTemplate(mockDataSources, 'tour-review-request', {
            customerName: booking.user?.name || booking.customerEmail.split('@')[0],
            tourName: tour.name,
            sessionDate: formatDate(session.date),
            reviewUrl: vendorSlug ? `${baseUrl}/m/${vendorSlug}/tour/${tour.id}` : `${baseUrl}`
          });

          if (emailContent) {
            await email.sendRawHtmlEmail(
              sender_details.from,
              booking.customerEmail,
              emailContent.subject,
              emailContent.html
            );

            // Mark review request as sent
            await cosmos.patch_record(
              "Main-Bookings",
              booking.id,
              booking.ref.partition,
              [{ op: "set", path: "/reviewRequestSent", value: true }],
              "tour-reminder-cron"
            );

            logger.logMessage(`Sent review request to ${booking.customerEmail} for session ${session.id}`);
          }
        } catch (err) {
          logger.error(`Failed to send review request for booking ${booking.id}: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`Failed to process review requests for session ${session.id}: ${err}`);
    }
  }
}

