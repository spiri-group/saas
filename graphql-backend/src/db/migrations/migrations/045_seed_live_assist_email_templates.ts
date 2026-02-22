/**
 * Migration: 045_seed_live_assist_email_templates
 *
 * Seeds three email templates for the Live Assist feature:
 *   - live-assist-confirmation: Sent to viewer after joining queue
 *   - live-assist-reading-complete: Sent to viewer after reading done + payment captured
 *   - live-assist-released: Sent to viewer if session ends without their reading
 */

import { Migration } from "../types";
import { v4 as uuid } from "uuid";

const now = new Date().toISOString();

const BRAND_PALETTE = [
    { id: "brand-purple", label: "Brand Purple", color: "#6b21a8" },
    { id: "brand-white", label: "White", color: "#ffffff" },
    { id: "brand-dark", label: "Dark", color: "#1e293b" },
    { id: "brand-success", label: "Success Green", color: "#16a34a" },
    { id: "brand-info", label: "Info Blue", color: "#2563eb" },
    { id: "brand-warning", label: "Warm Amber", color: "#d97706" },
    { id: "brand-light-bg", label: "Light Background", color: "#f8fafc" },
    { id: "brand-border", label: "Border Gray", color: "#e2e8f0" },
];

const baseDefaults = {
    titleAlign: "left" as const,
    titleSize: "large" as const,
    subtitleAlign: "left" as const,
    subtitleSize: "medium" as const,
    descriptionAlign: "justify" as const,
    isQuote: false,
    socialIconSize: 32,
    socialAlign: "center" as const,
};

const p = (text: string) =>
    `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${text}</span></p>`;

function makeTemplate(
    id: string,
    subject: string,
    category: string,
    blocks: any[],
    variables: { key: string; label: string }[] = []
) {
    return {
        id,
        docType: "email-template",
        subject,
        category,
        blocks,
        palette: BRAND_PALETTE,
        variables,
        headerId: "default-header",
        footerId: "default-footer",
        createdAt: now,
        updatedAt: now,
    };
}

const LIVE_ASSIST_TEMPLATES = [
    // 1. Confirmation — sent to viewer after joining queue
    makeTemplate(
        "live-assist-confirmation",
        "You're in the queue \u2014 {{ practitioner.name }}",
        "live-assist",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "You\u2019re In the Queue!", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ customer.name }},",
                    "You\u2019ve joined {{ practitioner.name }}\u2019s live reading session. Your position in the queue is #{{ queue.position }}.",
                    "Your card has been authorized for {{ payment.amount }}. You will only be charged if your reading is completed.",
                    "Stay on the page to see real-time updates on your position. We\u2019ll notify you when it\u2019s your turn!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "practitioner.name", label: "Practitioner Name" },
            { key: "customer.name", label: "Customer Name" },
            { key: "queue.position", label: "Queue Position" },
            { key: "payment.amount", label: "Authorized Amount" },
        ]
    ),

    // 2. Reading complete — sent after reading done + payment captured
    makeTemplate(
        "live-assist-reading-complete",
        "Your reading with {{ practitioner.name }} is complete",
        "live-assist",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Reading Complete", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ customer.name }},",
                    "Your reading with {{ practitioner.name }} has been completed.",
                    "{{ payment.amount }} has been charged to your card.",
                    "Thank you for joining the live session. We hope your reading was meaningful!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "practitioner.name", label: "Practitioner Name" },
            { key: "customer.name", label: "Customer Name" },
            { key: "payment.amount", label: "Charged Amount" },
        ]
    ),

    // 3. Released — sent if session ends or practitioner skips
    makeTemplate(
        "live-assist-released",
        "Session update \u2014 {{ practitioner.name }}",
        "live-assist",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Card Authorization Released", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ customer.name }},",
                    "{{ release.reason }}",
                    "Your card authorization of {{ payment.amount }} has been released \u2014 you have not been charged.",
                    "We hope to see you at a future session!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "practitioner.name", label: "Practitioner Name" },
            { key: "customer.name", label: "Customer Name" },
            { key: "payment.amount", label: "Released Amount" },
            { key: "release.reason", label: "Release Reason" },
        ]
    ),
];

export const migration: Migration = {
    id: "045_seed_live_assist_email_templates",
    description: "Seeds email templates for Live Assist: confirmation, reading complete, and released",

    async up(context) {
        context.log("Seeding Live Assist email templates...");
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: LIVE_ASSIST_TEMPLATES,
            upsert: false,
        });
        context.log("Migration 045 complete");
    },
};
