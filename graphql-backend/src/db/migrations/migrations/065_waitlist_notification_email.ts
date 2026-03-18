import { Migration } from "../types";

export const migration: Migration = {
    id: "065_waitlist_notification_email",
    description: "Seeds waitlist spot available notification email template",

    async up(context) {
        const now = new Date().toISOString();
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    docType: "email-template",
                    id: "tour-waitlist-spot-available",
                    name: "Tour Waitlist - Spot Available",
                    subject: "A spot just opened up for {{tourName}}!",
                    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spot Available</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px 8px 0 0; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 8px;">&#127881;</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">A spot just opened up!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Great news! A spot has become available for <strong>{{tourName}}</strong> on <strong>{{sessionDate}}</strong>.
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                You were on the waitlist for this session, and now it&rsquo;s your turn to book.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 4px; color: #92400e; font-size: 14px; font-weight: 600;">Book within {{expiryHours}} hours</p>
                                        <p style="margin: 0; color: #78350f; font-size: 13px;">After that, the spot will be offered to the next person in line</p>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{bookingUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Book Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                                If you no longer need this spot, no action is needed &mdash; it will automatically be offered to the next person.
                            </p>
                        </td>
                    </tr>
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
                    variables: ["tourName", "sessionDate", "expiryHours", "bookingUrl"],
                    category: "tour-booking",
                    description: "Sent to waitlisted customers when a spot opens up",
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "migration",
                }
            ]
        });
    },
};
