/**
 * Booking Email Templates Seed Script
 *
 * Run with: npx ts-node src/scripts/seed-booking-email-templates.ts
 *
 * This script populates the System-Settings container with booking email templates.
 */

import { CosmosDataSource } from "../utils/database";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import NodeCache from "node-cache";

const myCache = new NodeCache();

const CONTAINER = "System-Settings";
const PARTITION = "email-templates";

interface EmailTemplate {
    docType: "email-template";
    id: string;
    name: string;
    subject: string;
    html: string;
    variables: string[];
    category: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
}

// Booking email templates
const bookingEmailTemplates: Omit<EmailTemplate, "docType" | "createdAt" | "updatedAt" | "updatedBy">[] = [
    {
        id: "booking-pending-practitioner",
        name: "Booking Pending - Practitioner Notification",
        subject: "New Booking Request: {{serviceName}} from {{customerName}}",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">New Booking Request</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{practitionerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                You have a new booking request that requires your confirmation.
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">{{serviceName}}</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Customer:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{customerName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{customerEmail}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Session Type:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{deliveryMethod}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                                                <td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: 600; text-align: right;">{{amount}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Deadline Warning -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                                            ⏰ <strong>Please confirm or decline by {{confirmationDeadline}}</strong><br>
                                            Payment has been authorized but will not be captured until you confirm.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            View Booking Request
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["practitionerName", "serviceName", "customerName", "customerEmail", "bookingDate", "bookingTime", "deliveryMethod", "amount", "confirmationDeadline", "dashboardUrl"],
        category: "booking",
        description: "Sent to practitioner when a customer books a scheduled service and is awaiting confirmation",
        isActive: true
    },
    {
        id: "booking-confirmed-customer",
        name: "Booking Confirmed - Customer Notification",
        subject: "Your Session is Confirmed! {{serviceName}} on {{bookingDate}}",
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
                            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
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
                                Great news! {{practitionerName}} has confirmed your booking. Your payment has been processed and your session is scheduled.
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">{{serviceName}}</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Practitioner:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{practitionerName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Session Type:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{deliveryMethod}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Meeting Details (conditional) -->
                            {{#if meetingLink}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">📹 Meeting Details</h3>
                                        <p style="margin: 0 0 8px; color: #374151; font-size: 14px;">
                                            <strong>Join Link:</strong> <a href="{{meetingLink}}" style="color: #2563eb;">{{meetingLink}}</a>
                                        </p>
                                        {{#if meetingPasscode}}
                                        <p style="margin: 0; color: #374151; font-size: 14px;">
                                            <strong>Passcode:</strong> {{meetingPasscode}}
                                        </p>
                                        {{/if}}
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <!-- Location Details (for in-person) -->
                            {{#if practitionerAddress}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">📍 Session Location</h3>
                                        <p style="margin: 0; color: #374151; font-size: 14px;">
                                            {{practitionerAddress}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                We hope you have a wonderful session! If you need to make any changes, please contact the practitioner directly.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["customerName", "practitionerName", "serviceName", "bookingDate", "bookingTime", "deliveryMethod", "meetingLink", "meetingPasscode", "practitionerAddress"],
        category: "booking",
        description: "Sent to customer when practitioner confirms their booking",
        isActive: true
    },
    {
        id: "booking-rejected-customer",
        name: "Booking Rejected - Customer Notification",
        subject: "Update on Your Booking Request for {{serviceName}}",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #fef2f2; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #991b1b; font-size: 24px; font-weight: 600;">Booking Could Not Be Confirmed</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{customerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Unfortunately, {{practitionerName}} was unable to confirm your booking request for <strong>{{serviceName}}</strong> on <strong>{{bookingDate}}</strong> at <strong>{{bookingTime}}</strong>.
                            </p>

                            <!-- Reason Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 8px; color: #991b1b; font-size: 14px; font-weight: 600;">Reason provided:</h3>
                                        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                                            {{rejectionReason}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Refund Notice -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <p style="margin: 0; color: #166534; font-size: 14px;">
                                            ✅ <strong>No charges were made.</strong> Your payment authorization has been released.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                We encourage you to try booking a different time slot or explore other practitioners on SpiriVerse.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0;">
                                        <a href="{{practitionerProfileUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            View Other Available Times
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["customerName", "practitionerName", "serviceName", "bookingDate", "bookingTime", "rejectionReason", "practitionerProfileUrl"],
        category: "booking",
        description: "Sent to customer when practitioner rejects their booking request",
        isActive: true
    },
    {
        id: "booking-reminder-24h",
        name: "Booking Reminder - 24 Hours",
        subject: "Reminder: Your session with {{practitionerName}} is tomorrow!",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px 8px 0 0; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Session Tomorrow!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{recipientName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                This is a friendly reminder that your session is scheduled for tomorrow.
                            </p>

                            <!-- Session Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #7c3aed; font-size: 18px; font-weight: 600;">{{serviceName}}</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">⏰ Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📍 Type:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{deliveryMethod}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Meeting Link (if online) -->
                            {{#if meetingLink}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">📹 Join Online</h3>
                                        <a href="{{meetingLink}}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px;">
                                            Join Meeting
                                        </a>
                                        {{#if meetingPasscode}}
                                        <p style="margin: 12px 0 0; color: #374151; font-size: 14px;">
                                            Passcode: <strong>{{meetingPasscode}}</strong>
                                        </p>
                                        {{/if}}
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <!-- Location (if in-person) -->
                            {{#if sessionAddress}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">📍 Location</h3>
                                        <p style="margin: 0; color: #374151; font-size: 14px;">
                                            {{sessionAddress}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Looking forward to the session! 🌟
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["recipientName", "serviceName", "bookingDate", "bookingTime", "deliveryMethod", "meetingLink", "meetingPasscode", "sessionAddress"],
        category: "booking",
        description: "Sent to both practitioner and customer 24 hours before a confirmed session",
        isActive: true
    },
    {
        id: "booking-reminder-1h",
        name: "Booking Reminder - 1 Hour",
        subject: "Starting Soon: Your session in 1 hour!",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Starting Soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); border-radius: 8px 8px 0 0; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Session in 1 Hour!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{recipientName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your session is starting in about 1 hour. Please make sure you're ready!
                            </p>

                            <!-- Session Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #c2410c; font-size: 18px; font-weight: 600;">{{serviceName}}</h2>
                                        <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 500;">
                                            Today at {{bookingTime}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Quick Join (if online) -->
                            {{#if meetingLink}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0;">
                                        <a href="{{meetingLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 8px;">
                                            📹 Join Meeting Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            {{#if meetingPasscode}}
                            <p style="margin: 16px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                                Meeting Passcode: <strong>{{meetingPasscode}}</strong>
                            </p>
                            {{/if}}
                            {{/if}}

                            <!-- Location reminder (if in-person) -->
                            {{#if sessionAddress}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 24px; text-align: center;">
                                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">📍 Session Location</h3>
                                        <p style="margin: 0; color: #374151; font-size: 14px;">
                                            {{sessionAddress}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["recipientName", "serviceName", "bookingTime", "meetingLink", "meetingPasscode", "sessionAddress"],
        category: "booking",
        description: "Sent to both practitioner and customer 1 hour before a confirmed session",
        isActive: true
    },
    {
        id: "booking-confirmed-practitioner",
        name: "Booking Confirmed - Practitioner Receipt",
        subject: "Confirmed: {{serviceName}} with {{customerName}} on {{bookingDate}}",
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
                            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Booking Confirmed</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{practitionerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                You have successfully confirmed the booking. The payment of <strong>{{amount}}</strong> has been captured and the customer has been notified.
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">{{serviceName}}</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Customer:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{customerName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{customerEmail}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Session Type:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{deliveryMethod}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment:</td>
                                                <td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: 600; text-align: right;">{{amount}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            {{#if customerAddress}}
                            <!-- Customer Location (for mobile sessions) -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">📍 Customer Location</h3>
                                        <p style="margin: 0; color: #374151; font-size: 14px;">
                                            {{customerAddress}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                We'll send you a reminder 24 hours and 1 hour before the session.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["practitionerName", "customerName", "customerEmail", "serviceName", "bookingDate", "bookingTime", "deliveryMethod", "amount", "customerAddress"],
        category: "booking",
        description: "Sent to practitioner as confirmation after they confirm a booking",
        isActive: true
    },
    {
        id: "booking-expired-customer",
        name: "Booking Expired - Customer Notification",
        subject: "Your Booking Request for {{serviceName}} Has Expired",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Expired</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #fef3c7; border-radius: 8px 8px 0 0;">
                            <div style="font-size: 48px; margin-bottom: 16px; text-align: center;">⏱️</div>
                            <h1 style="margin: 0; color: #92400e; font-size: 24px; font-weight: 600; text-align: center;">Booking Request Expired</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{customerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Unfortunately, your booking request for <strong>{{serviceName}}</strong> on <strong>{{bookingDate}}</strong> at <strong>{{bookingTime}}</strong> has expired because the practitioner did not respond within the confirmation window.
                            </p>

                            <!-- Refund Notice -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <p style="margin: 0; color: #166534; font-size: 14px;">
                                            ✅ <strong>No charges were made.</strong> Your payment authorization has been automatically released.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                We apologize for any inconvenience. You can try booking a different time slot or explore other practitioners.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0;">
                                        <a href="{{practitionerProfileUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            Try Another Time
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["customerName", "serviceName", "bookingDate", "bookingTime", "practitionerProfileUrl"],
        category: "booking",
        description: "Sent to customer when their booking expires because practitioner did not respond",
        isActive: true
    },
    {
        id: "booking-expired-practitioner",
        name: "Booking Expired - Practitioner Notification",
        subject: "Missed Booking: {{serviceName}} request from {{customerName}} expired",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Expired</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #fef3c7; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #92400e; font-size: 24px; font-weight: 600;">Booking Request Expired</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{practitionerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                A booking request has expired because it was not confirmed within the required timeframe.
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #92400e; font-size: 18px; font-weight: 600;">{{serviceName}}</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Customer:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{customerName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Potential Revenue:</td>
                                                <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 500; text-align: right;">{{amount}} (lost)</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                The customer's payment authorization has been released. To avoid missing future bookings, please try to respond to booking requests promptly.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            View Your Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["practitionerName", "customerName", "serviceName", "bookingDate", "bookingTime", "amount", "dashboardUrl"],
        category: "booking",
        description: "Sent to practitioner when a booking request expires due to no response",
        isActive: true
    },
    {
        id: "booking-cancelled-customer",
        name: "Booking Cancelled - Customer Confirmation",
        subject: "Booking Cancelled: {{serviceName}} on {{bookingDate}}",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #f3f4f6; border-radius: 8px 8px 0 0; text-align: center;">
                            <h1 style="margin: 0; color: #374151; font-size: 24px; font-weight: 600;">Booking Cancelled</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{customerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your booking has been cancelled as requested. Here are the details:
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #6b7280; font-size: 18px; font-weight: 600; text-decoration: line-through;">{{serviceName}}</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Practitioner:</td>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; text-align: right;">{{practitionerName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Refund Notice -->
                            {{#if refundAmount}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <p style="margin: 0; color: #166534; font-size: 14px;">
                                            💰 <strong>Refund:</strong> {{refundAmount}} will be returned to your original payment method within 5-10 business days.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            {{#if noCharge}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <p style="margin: 0; color: #166534; font-size: 14px;">
                                            ✅ <strong>No charges were made.</strong> Your payment authorization has been released.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                We hope to see you again soon. Feel free to book another session whenever you're ready.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["customerName", "practitionerName", "serviceName", "bookingDate", "bookingTime", "refundAmount", "noCharge"],
        category: "booking",
        description: "Sent to customer as confirmation when they cancel a booking",
        isActive: true
    },
    {
        id: "booking-cancelled-practitioner",
        name: "Booking Cancelled - Practitioner Notification",
        subject: "Booking Cancelled: {{customerName}} cancelled {{serviceName}} on {{bookingDate}}",
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #fef2f2; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #991b1b; font-size: 24px; font-weight: 600;">Booking Cancelled</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hi {{practitionerName}},
                            </p>
                            <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                                {{customerName}} has cancelled their booking. The time slot is now available for other customers.
                            </p>

                            <!-- Booking Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #991b1b; font-size: 18px; font-weight: 600;">Cancelled Session</h2>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; text-align: right;">{{serviceName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Customer:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{customerName}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{bookingDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                                                <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{{bookingTime}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            {{#if cancellationReason}}
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <p style="margin: 0; color: #374151; font-size: 14px;">
                                            <strong>Reason:</strong> {{cancellationReason}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            View Your Schedule
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                SpiriVerse - Connecting spiritual practitioners with seekers
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        variables: ["practitionerName", "customerName", "serviceName", "bookingDate", "bookingTime", "cancellationReason", "dashboardUrl"],
        category: "booking",
        description: "Sent to practitioner when a customer cancels their booking",
        isActive: true
    }
];

async function seedBookingEmailTemplates() {
    console.log("📧 Starting Booking Email Templates Seed...\n");

    const host = "https://localhost";
    const logger = new LogManager();
    const keyVault = new vault(host, logger, myCache);
    const cosmos = new CosmosDataSource(logger, keyVault);

    await cosmos.init(host);

    const now = new Date().toISOString();
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    console.log(`Found ${bookingEmailTemplates.length} templates to import\n`);

    for (const templateInput of bookingEmailTemplates) {
        try {
            // Check if template already exists
            try {
                const existing = await cosmos.get_record(
                    CONTAINER,
                    templateInput.id,
                    PARTITION
                );
                if (existing) {
                    console.log(`⏭️  Skipped: ${templateInput.name} (already exists)`);
                    skipped++;
                    continue;
                }
            } catch {
                // Template doesn't exist, we can create it
            }

            const template: EmailTemplate = {
                docType: "email-template",
                ...templateInput,
                createdAt: now,
                updatedAt: now,
                updatedBy: "SYSTEM-SEED"
            };

            await cosmos.add_record(
                CONTAINER,
                template,
                PARTITION,
                "SYSTEM"
            );

            console.log(`✅ Imported: ${templateInput.name}`);
            imported++;
        } catch (error) {
            console.error(`❌ Failed: ${templateInput.name} - ${error}`);
            failed++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📧 Email Templates Seed Complete!");
    console.log("=".repeat(50));
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped:  ${skipped}`);
    console.log(`❌ Failed:   ${failed}`);
    console.log(`📊 Total:    ${bookingEmailTemplates.length}`);
    console.log("=".repeat(50) + "\n");
}

// Run the seed
seedBookingEmailTemplates()
    .then(() => {
        console.log("Done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    });
