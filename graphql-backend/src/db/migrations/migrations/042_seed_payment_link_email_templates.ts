/**
 * Migration: 042_seed_payment_link_email_templates
 *
 * Seeds three email templates for the Payment Links feature:
 *   - payment-link-request: Sent to customer with payment link
 *   - payment-link-paid-customer: Confirmation to customer after payment
 *   - payment-link-paid-vendor: Notification to vendor after payment received
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

const PAYMENT_LINK_TEMPLATES = [
    // 1. Sent to customer — payment request
    makeTemplate(
        "payment-link-request",
        "{{ vendor.name }} has sent you a payment request",
        "payment-link",
        [
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
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "customer.name", label: "Customer Name" },
            { key: "payment.amount", label: "Payment Amount" },
            { key: "payment.description", label: "Payment Description" },
            { key: "payment.url", label: "Payment URL" },
            { key: "payment.expiresAt", label: "Expiry" },
        ]
    ),

    // 2. Customer confirmation after payment
    makeTemplate(
        "payment-link-paid-customer",
        "Payment confirmed \u2014 {{ vendor.name }}",
        "payment-link",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Payment Successful", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ customer.name }},",
                    "Your payment of {{ payment.amount }} to {{ vendor.name }} has been successfully processed.",
                    "{{ payment.description }}",
                    "If any services were included, your booking has been confirmed and the practitioner will be in touch.",
                    "Thank you for your purchase!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "customer.name", label: "Customer Name" },
            { key: "payment.amount", label: "Payment Amount" },
            { key: "payment.description", label: "Payment Description" },
        ]
    ),

    // 3. Vendor notification after payment received
    makeTemplate(
        "payment-link-paid-vendor",
        "Payment received from {{ customer.email }}",
        "payment-link",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Payment Received", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "Great news! {{ customer.email }} has paid {{ payment.amount }} via your payment link.",
                    "{{ payment.description }}",
                    "The funds will be transferred to your connected Stripe account.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "View Payment Links",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "customer.email", label: "Customer Email" },
            { key: "payment.amount", label: "Payment Amount" },
            { key: "payment.description", label: "Payment Description" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
];

export const migration: Migration = {
    id: "042_seed_payment_link_email_templates",
    description: "Seeds email templates for payment link request, customer confirmation, and vendor notification",

    async up(context) {
        context.log("Seeding payment link email templates...");
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: PAYMENT_LINK_TEMPLATES,
            upsert: false,
        });
        context.log("Migration 042 complete");
    },
};
