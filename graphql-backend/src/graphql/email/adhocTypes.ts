import { TableEntity } from "@azure/data-tables";

export interface SentEmailEntity extends TableEntity {
    partitionKey: string; // sentBy (admin userId)
    rowKey: string; // UUID
    sentByEmail: string;
    recipients: string; // JSON array of email strings
    cc: string; // JSON array
    bcc: string; // JSON array
    subject: string;
    bodyHtml: string; // Raw body HTML for cloning
    htmlSnapshot: string; // Full branded HTML as sent
    emailStatus: "DRAFT" | "SCHEDULED" | "SENT" | "FAILED" | "CANCELLED";
    scheduledFor?: string; // ISO timestamp
    sentAt?: string; // ISO timestamp
    createdAt: string;
    trackingHost?: string; // Function app host for building tracking pixel URLs
}

export interface EmailTrackingEntity extends TableEntity {
    partitionKey: string; // emailId (SentEmail rowKey)
    rowKey: string; // trackingId: {emailId}_{recipientIndex}
    recipient: string; // recipient email address
    sentBy: string; // admin userId
    openCount: number;
    firstOpenedAt?: string;
    lastOpenedAt?: string;
    createdAt: string;
}

export interface EmailTrackingInfo {
    recipient: string;
    openCount: number;
    firstOpenedAt?: string;
    lastOpenedAt?: string;
}

export interface SentEmail {
    id: string;
    sentBy: string;
    sentByEmail: string;
    recipients: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    bodyHtml: string;
    htmlSnapshot: string;
    emailStatus: string;
    scheduledFor?: string;
    sentAt?: string;
    createdAt: string;
}

export interface SendAdHocEmailInput {
    recipients: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml: string;
    scheduledFor?: string;
    draftId?: string;
}

export interface AiMessageInput {
    role: string;
    content: string;
}

export interface GeneratedEmail {
    subject: string;
    bodyHtml: string;
}

export const SENT_EMAILS_TABLE = "SentEmails";
export const EMAIL_TRACKING_TABLE = "EmailTracking";

/**
 * Build the tracking pixel URL for a given host and tracking ID.
 */
export function buildTrackingPixelUrl(host: string, trackingId: string): string {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}/api/email-track/${trackingId}`;
}

/**
 * Inject a tracking pixel into email HTML just before the closing </body> tag.
 */
export function injectTrackingPixel(html: string, pixelUrl: string): string {
    const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`;

    // Insert before </body> if present, otherwise append
    if (html.includes("</body>")) {
        return html.replace("</body>", `${pixel}</body>`);
    }
    return html + pixel;
}

export function entityToSentEmail(entity: SentEmailEntity): SentEmail {
    return {
        id: entity.rowKey,
        sentBy: entity.partitionKey,
        sentByEmail: entity.sentByEmail || "",
        recipients: safeJsonParse(entity.recipients, []),
        cc: safeJsonParse(entity.cc, []),
        bcc: safeJsonParse(entity.bcc, []),
        subject: entity.subject || "",
        bodyHtml: entity.bodyHtml || "",
        htmlSnapshot: entity.htmlSnapshot || "",
        emailStatus: entity.emailStatus || "SENT",
        scheduledFor: entity.scheduledFor || undefined,
        sentAt: entity.sentAt || undefined,
        createdAt: entity.createdAt || "",
    };
}

function safeJsonParse<T>(value: string | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}
