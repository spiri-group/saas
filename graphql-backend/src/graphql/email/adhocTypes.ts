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
    emailStatus: "SCHEDULED" | "SENT" | "FAILED" | "CANCELLED";
    scheduledFor?: string; // ISO timestamp
    sentAt?: string; // ISO timestamp
    createdAt: string;
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
