import { Migration } from "../types";

export const migration: Migration = {
    id: "064_tour_review_request_email",
    description: "Seeds post-tour review request email template",

    async up(context) {
        const now = new Date().toISOString();
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    docType: "email-template",
                    id: "tour-review-request",
                    name: "Tour Review Request",
                    subject: "How was {{tourName}}? We'd love your feedback",
                    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Share Your Experience</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px 8px 0 0; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 8px;">&#11088;</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">How was your experience?</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{customerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                We hope you enjoyed <strong>{{tourName}}</strong> on {{sessionDate}}. Your feedback helps other travellers find great experiences and helps the organiser improve.
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                It only takes a minute to leave a review:
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{reviewUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Leave a Review
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                                Thank you for being part of the SpiriVerse community.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                Booked via <a href="https://spiriverse.com" style="color: #7c3aed; text-decoration: none;">SpiriVerse</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                    variables: ["customerName", "tourName", "sessionDate", "reviewUrl"],
                    category: "tour-booking",
                    description: "Sent to customers after their tour to request a review",
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "migration",
                }
            ]
        });
    },
};
