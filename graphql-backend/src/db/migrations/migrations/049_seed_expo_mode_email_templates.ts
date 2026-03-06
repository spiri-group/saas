/**
 * Migration: 049_seed_expo_mode_email_templates
 *
 * Seeds three email templates for the Expo Mode feature:
 *   - expo-sale-receipt: Sent to customer after QR purchase
 *   - expo-sale-vendor-notification: Sent to vendor on QR sale
 *   - expo-summary: Sent to vendor when expo ends
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

const EXPO_MODE_TEMPLATES = [
    // 1. Sale receipt — sent to customer after QR purchase
    makeTemplate(
        "expo-sale-receipt",
        "Your order at {{ expo.name }} is confirmed",
        "expo-mode",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Order Confirmed!", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ customer.name }},",
                    "Your order #{{ sale.number }} at {{ expo.name }} has been confirmed.",
                    "{{ sale.items }}",
                    "Total: {{ sale.total }}",
                    "Thank you for your purchase from {{ vendor.name }}!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "customer.name", label: "Customer Name" },
            { key: "expo.name", label: "Expo Name" },
            { key: "vendor.name", label: "Vendor Name" },
            { key: "sale.number", label: "Sale Number" },
            { key: "sale.items", label: "Items List" },
            { key: "sale.total", label: "Total Amount" },
        ]
    ),

    // 2. Vendor notification — sent to vendor on QR sale
    makeTemplate(
        "expo-sale-vendor-notification",
        "New sale at {{ expo.name }}!",
        "expo-mode",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "New Expo Sale!", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "You have a new sale at {{ expo.name }}!",
                    "Customer: {{ customer.name }}",
                    "{{ sale.items }}",
                    "Total: {{ sale.total }}",
                ].map(p).join(""),
            },
        ],
        [
            { key: "expo.name", label: "Expo Name" },
            { key: "customer.name", label: "Customer Name" },
            { key: "sale.items", label: "Items List" },
            { key: "sale.total", label: "Total Amount" },
        ]
    ),

    // 3. Expo summary — sent to vendor when expo ends
    makeTemplate(
        "expo-summary",
        "Your expo {{ expo.name }} has wrapped up",
        "expo-mode",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Expo Complete!", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Your expo {{ expo.name }} has wrapped up. Here's your summary:",
                    "Total Sales: {{ expo.totalSales }}",
                    "Total Revenue: {{ expo.totalRevenue }}",
                    "Items Sold: {{ expo.totalItemsSold }}",
                    "Great work!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "expo.name", label: "Expo Name" },
            { key: "expo.totalSales", label: "Total Sales Count" },
            { key: "expo.totalRevenue", label: "Total Revenue" },
            { key: "expo.totalItemsSold", label: "Total Items Sold" },
        ]
    ),
];

export const migration: Migration = {
    id: "049_seed_expo_mode_email_templates",
    description: "Seeds email templates for Expo Mode: sale receipt, vendor notification, and expo summary",

    async up(context) {
        context.log("Seeding Expo Mode email templates...");
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: EXPO_MODE_TEMPLATES,
            upsert: false,
        });
        context.log("Migration 049 complete");
    },
};
