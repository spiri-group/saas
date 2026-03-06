/**
 * Migration: 052_reseed_payment_link_email_template
 *
 * Re-seeds the payment-link-request email template that went missing from
 * System-Settings. Uses upsert to ensure it exists even if already present.
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

export const migration: Migration = {
    id: "052_reseed_payment_link_email_template",
    description: "Re-seeds missing payment-link-request email template",

    async up(context) {
        context.log("Re-seeding payment-link-request email template...");

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    id: "payment-link-request",
                    docType: "email-template",
                    subject: "{{ vendor.name }} has sent you a payment request",
                    category: "payment-link",
                    blocks: [
                        {
                            id: uuid(), blockType: "text", ...baseDefaults,
                            label: "Heading", title: "Payment Request", titleAlign: "center", titleSize: "xlarge",
                        },
                        {
                            id: uuid(), blockType: "text", ...baseDefaults,
                            label: "Body",
                            description: [
                                "Hi {{ customer.name }},",
                                "{{ vendor.name }} has requested a payment of {{ payment.amount }} for the following:",
                                "{{ payment.description }}",
                                "This payment link will expire {{ payment.expiresAt }}. Please complete your payment before then.",
                            ].map(p).join(""),
                        },
                        {
                            id: uuid(), blockType: "button", ...baseDefaults,
                            label: "CTA", title: "Pay Now",
                            url: "{{ payment.url }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
                        },
                        {
                            id: uuid(), blockType: "text", ...baseDefaults,
                            label: "Footer Note",
                            description: [
                                "This payment is processed securely through Stripe. If you did not expect this request, please disregard this email.",
                            ].map(p).join(""),
                        },
                    ],
                    palette: BRAND_PALETTE,
                    variables: [
                        { key: "vendor.name", label: "Vendor Name" },
                        { key: "customer.name", label: "Customer Name" },
                        { key: "payment.amount", label: "Payment Amount" },
                        { key: "payment.description", label: "Payment Description" },
                        { key: "payment.url", label: "Payment URL" },
                        { key: "payment.expiresAt", label: "Expiry" },
                    ],
                    headerId: "default-header",
                    footerId: "default-footer",
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            upsert: true,
        });

        context.log("payment-link-request template re-seeded");
    },
};
