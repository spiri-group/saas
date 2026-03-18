import { Migration } from "../types";

const tourBookingConfirmationTemplate = {
    docType: "email-template",
    id: "tour-booking-confirmed-customer",
    name: "Tour Booking Confirmed - Customer",
    subject: "Your booking for {{tourName}} is confirmed!",
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 8px 8px 0 0; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 8px;">&#10003;</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Booking Confirmed!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{customerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your booking for <strong>{{tourName}}</strong> has been confirmed. Here are your details:
                            </p>

                            <!-- Booking Code -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Booking Code</p>
                                        <p style="margin: 0; color: #059669; font-size: 32px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 4px;">{{bookingCode}}</p>
                                        <p style="margin: 8px 0 0; color: #6b7280; font-size: 12px;">Show this code at check-in</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Booking Details -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">{{tourName}}</h2>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{sessionDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{sessionTime}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tickets:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{ticketSummary}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Total Paid:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700; text-align: right; border-top: 1px solid #e5e7eb;">{{totalAmount}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Manage Booking Link -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{bookingUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            View Booking Details
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                                Need to cancel or change your booking? Use the link above to manage your reservation.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                Booked via <a href="https://spiriverse.com" style="color: #f59e0b; text-decoration: none;">SpiriVerse</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
    variables: ["customerName", "tourName", "bookingCode", "sessionDate", "sessionTime", "ticketSummary", "totalAmount", "bookingUrl"],
    category: "tour-booking",
    description: "Sent to customers after their tour booking is confirmed and paid",
    isActive: true,
};

export const migration: Migration = {
    id: "063_tour_booking_email_templates",
    description: "Seeds tour booking confirmation email template",

    async up(context) {
        const now = new Date().toISOString();
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    ...tourBookingConfirmationTemplate,
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "migration",
                }
            ]
        });
    },
};
