/**
 * Migration: 059_reseed_feature_email_templates
 *
 * Reseeds the 11 email templates from Payment Links, Live Assist,
 * Expo Mode, and Journeys with proper designs matching the quality
 * of the core templates (hero banners, info cards, CTAs, layouts).
 *
 * The original migrations (042, 045, 049, 053, 056) seeded these
 * with minimal text-only blocks. This brings them up to standard.
 */

import { Migration } from "../types";
import { v4 as uuid } from "uuid";

const now = new Date().toISOString();

// ─── Brand Palette ──────────────────────────────────────────────

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

// ─── Block Helpers (same as migration 005) ──────────────────────

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

const heading = (title: string, size: "small" | "medium" | "large" | "xlarge" = "xlarge") => ({
    id: uuid(),
    blockType: "text",
    ...baseDefaults,
    label: "Heading",
    title,
    titleAlign: "center" as const,
    titleSize: size,
});

const body = (label: string, lines: string[], align: "left" | "center" | "justify" = "justify") => ({
    id: uuid(),
    blockType: "text",
    ...baseDefaults,
    label,
    description: lines.map(p).join(""),
    descriptionAlign: align,
});

const hero = (
    label: string,
    title: string,
    subtitle?: string,
    opts: {
        bgColor?: string;
        textColor?: string;
        textAlign?: "left" | "center" | "right";
        minHeight?: number;
        buttonText?: string;
        buttonUrl?: string;
        buttonStyle?: "primary" | "secondary" | "outline";
    } = {},
) => ({
    id: uuid(),
    blockType: "hero",
    ...baseDefaults,
    label,
    heroTitle: title,
    heroSubtitle: subtitle,
    heroBgColor: opts.bgColor || "#6b21a8",
    heroTextColor: opts.textColor || "#ffffff",
    heroTextAlign: opts.textAlign || "center",
    heroMinHeight: opts.minHeight || 200,
    heroButtonText: opts.buttonText,
    heroButtonUrl: opts.buttonUrl,
    heroButtonStyle: opts.buttonStyle || "primary",
});

const infoCard = (
    label: string,
    items: { label: string; value: string }[],
    style: "default" | "outlined" | "filled" | "accent" = "outlined",
    opts: { bgColor?: string; borderColor?: string } = {},
) => ({
    id: uuid(),
    blockType: "infoCard",
    ...baseDefaults,
    label,
    infoCardItems: items.map((item) => ({ id: uuid(), ...item })),
    infoCardStyle: style,
    infoCardBgColor: opts.bgColor,
    infoCardBorderColor: opts.borderColor || "#e2e8f0",
});

// ─── Structure Helper ────────────────────────────────────────────

const SLOT_MAPS: Record<string, string[]> = {
    "single-full": ["main"],
    "two-stacked": ["top", "bottom"],
    "three-stacked": ["top", "middle", "bottom"],
};

const createStructure = (blocks: any[], layoutType: string = "single-full") => {
    const slotNames = SLOT_MAPS[layoutType] || SLOT_MAPS["single-full"];
    const slots: Record<string, string> = {};
    blocks.forEach((block, i) => {
        if (i < slotNames.length) {
            slots[slotNames[i]] = block.id;
        }
    });

    const structure = {
        contentBlocks: blocks,
        layout: {
            type: layoutType,
            slots,
            dividers: [],
            padding: { top: 20, bottom: 20, left: 20, right: 20 },
        },
        colorPalette: BRAND_PALETTE,
    };
    return `<!-- Email Structure -->\n${JSON.stringify(structure, null, 2)}`;
};

// ─── Template Definitions ────────────────────────────────────────

interface TemplateDef {
    id: string;
    name: string;
    subject: string;
    category: string;
    description: string;
    variables: string[];
    blocks: any[];
    layout: string;
}

const templates: TemplateDef[] = [

    // ═══════════════════════════════════════════════════
    // PAYMENT LINKS
    // ═══════════════════════════════════════════════════

    {
        id: "payment-link-request",
        name: "Payment Link Request",
        subject: "{{ vendor.name }} has sent you a payment request",
        category: "payment-link",
        description: "Sent to customer with a payment link from a vendor",
        variables: ["vendor.name", "customer.name", "payment.amount", "payment.description", "payment.url", "payment.expiresAt"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Payment Request", "{{ vendor.name }} has requested a payment", {
                bgColor: "#6b21a8",
                minHeight: 180,
                buttonText: "Pay Now",
                buttonUrl: "{{ payment.url }}",
            }),
            infoCard("Payment Details", [
                { label: "From", value: "{{ vendor.name }}" },
                { label: "Amount", value: "{{ payment.amount }}" },
                { label: "Description", value: "{{ payment.description }}" },
                { label: "Expires", value: "{{ payment.expiresAt }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("Note", [
                "Hi {{ customer.name }},",
                "Please complete your payment before the link expires. This payment is processed securely through Stripe.",
                "If you didn\u2019t expect this request, you can safely ignore this email.",
            ]),
        ],
    },
    {
        id: "payment-link-paid-customer",
        name: "Payment Link Paid (Customer)",
        subject: "Payment confirmed \u2014 {{ vendor.name }}",
        category: "payment-link",
        description: "Confirmation sent to customer after payment link is paid",
        variables: ["vendor.name", "customer.name", "payment.amount", "payment.description"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Payment Successful", "Your payment to {{ vendor.name }} is confirmed", {
                bgColor: "#16a34a",
                minHeight: 180,
            }),
            infoCard("Payment Summary", [
                { label: "Paid To", value: "{{ vendor.name }}" },
                { label: "Amount", value: "{{ payment.amount }}" },
                { label: "Description", value: "{{ payment.description }}" },
            ], "filled", { bgColor: "#f0fdf4" }),
            body("Details", [
                "Hi {{ customer.name }},",
                "Your payment has been successfully processed. If any services were included, the practitioner will be in touch.",
                "Thank you for your purchase!",
            ]),
        ],
    },
    {
        id: "payment-link-paid-vendor",
        name: "Payment Link Paid (Vendor)",
        subject: "Payment received from {{ customer.email }}",
        category: "payment-link",
        description: "Notification sent to vendor when payment link is paid",
        variables: ["vendor.name", "vendor.contactName", "customer.email", "payment.amount", "payment.description", "dashboardUrl"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Payment Received!", "{{ customer.email }} has completed a payment", {
                bgColor: "#16a34a",
                minHeight: 180,
                buttonText: "View Payment Links",
                buttonUrl: "{{ dashboardUrl }}",
            }),
            infoCard("Payment Details", [
                { label: "Customer", value: "{{ customer.email }}" },
                { label: "Amount", value: "{{ payment.amount }}" },
                { label: "Description", value: "{{ payment.description }}" },
            ], "accent", { borderColor: "#16a34a" }),
            body("Note", [
                "Hi {{ vendor.contactName }},",
                "The funds will be transferred to your connected Stripe account. You can view all your payment links from the dashboard.",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // LIVE ASSIST
    // ═══════════════════════════════════════════════════

    {
        id: "live-assist-confirmation",
        name: "Live Assist Confirmation",
        subject: "You're in the queue \u2014 {{ practitioner.name }}",
        category: "live-assist",
        description: "Sent to customer when they join a live reading queue",
        variables: ["practitioner.name", "customer.name", "queue.position", "payment.amount"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "You\u2019re In the Queue!", "Live reading with {{ practitioner.name }}", {
                bgColor: "#6b21a8",
                minHeight: 180,
            }),
            infoCard("Session Details", [
                { label: "Practitioner", value: "{{ practitioner.name }}" },
                { label: "Queue Position", value: "#{{ queue.position }}" },
                { label: "Authorised Amount", value: "{{ payment.amount }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("What to Expect", [
                "Hi {{ customer.name }},",
                "Your card has been authorised for {{ payment.amount }}. You\u2019ll only be charged if your reading is completed.",
                "Stay on the page to see real-time updates on your position. We\u2019ll notify you when it\u2019s your turn!",
            ]),
        ],
    },
    {
        id: "live-assist-reading-complete",
        name: "Live Assist Reading Complete",
        subject: "Your reading with {{ practitioner.name }} is complete",
        category: "live-assist",
        description: "Sent to customer after their live reading is completed",
        variables: ["practitioner.name", "customer.name", "payment.amount"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Reading Complete", "Your session with {{ practitioner.name }} is finished", {
                bgColor: "#16a34a",
                minHeight: 180,
            }),
            infoCard("Session Summary", [
                { label: "Practitioner", value: "{{ practitioner.name }}" },
                { label: "Amount Charged", value: "{{ payment.amount }}" },
            ], "filled", { bgColor: "#f0fdf4" }),
            body("Note", [
                "Hi {{ customer.name }},",
                "Thank you for joining the live session. We hope your reading was meaningful and insightful!",
                "If you\u2019d like to book a private session with {{ practitioner.name }}, you can find them on SpiriVerse.",
            ]),
        ],
    },
    {
        id: "live-assist-released",
        name: "Live Assist Released",
        subject: "Session update \u2014 {{ practitioner.name }}",
        category: "live-assist",
        description: "Sent to customer when their card authorisation is released without charge",
        variables: ["practitioner.name", "customer.name", "payment.amount", "release.reason"],
        layout: "two-stacked",
        blocks: [
            heading("Card Authorisation Released"),
            body("Details", [
                "Hi {{ customer.name }},",
                "{{ release.reason }}",
                "Your card authorisation of {{ payment.amount }} has been released \u2014 you have not been charged.",
                "We hope to see you at a future session with {{ practitioner.name }}!",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // EXPO MODE
    // ═══════════════════════════════════════════════════

    {
        id: "expo-sale-receipt",
        name: "Expo Sale Receipt",
        subject: "Your order at {{ expo.name }} is confirmed",
        category: "expo-mode",
        description: "Receipt sent to customer after a QR purchase at an expo",
        variables: ["customer.name", "expo.name", "vendor.name", "sale.number", "sale.items", "sale.total"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Order Confirmed!", "Thanks for your purchase at {{ expo.name }}", {
                bgColor: "#6b21a8",
                minHeight: 180,
            }),
            infoCard("Order Summary", [
                { label: "Order Number", value: "#{{ sale.number }}" },
                { label: "Vendor", value: "{{ vendor.name }}" },
                { label: "Total", value: "{{ sale.total }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("Details", [
                "Hi {{ customer.name }},",
                "{{ sale.items }}",
                "Thank you for supporting {{ vendor.name }} at {{ expo.name }}!",
            ]),
        ],
    },
    {
        id: "expo-sale-vendor-notification",
        name: "Expo Sale Vendor Notification",
        subject: "New sale at {{ expo.name }}!",
        category: "expo-mode",
        description: "Notification sent to vendor when a customer makes a QR purchase",
        variables: ["expo.name", "customer.name", "sale.items", "sale.total"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "New Expo Sale!", "You\u2019ve made a sale at {{ expo.name }}", {
                bgColor: "#16a34a",
                minHeight: 170,
            }),
            infoCard("Sale Details", [
                { label: "Customer", value: "{{ customer.name }}" },
                { label: "Total", value: "{{ sale.total }}" },
            ], "accent", { borderColor: "#16a34a" }),
            body("Items", [
                "{{ sale.items }}",
                "The funds will be transferred to your connected Stripe account.",
            ]),
        ],
    },
    {
        id: "expo-summary",
        name: "Expo Summary",
        subject: "Your expo {{ expo.name }} has wrapped up",
        category: "expo-mode",
        description: "Summary sent to vendor when their expo ends",
        variables: ["expo.name", "expo.totalSales", "expo.totalRevenue", "expo.totalItemsSold"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Expo Complete!", "{{ expo.name }} has wrapped up", {
                bgColor: "#6b21a8",
                minHeight: 200,
            }),
            infoCard("Expo Results", [
                { label: "Total Sales", value: "{{ expo.totalSales }}" },
                { label: "Total Revenue", value: "{{ expo.totalRevenue }}" },
                { label: "Items Sold", value: "{{ expo.totalItemsSold }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("Note", [
                "Great work! Your expo has wrapped up and here\u2019s how you went. The revenue from your sales will be transferred to your connected Stripe account.",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // JOURNEYS
    // ═══════════════════════════════════════════════════

    {
        id: "JOURNEY_PURCHASED_PRACTITIONER",
        name: "Journey Purchased (Practitioner)",
        subject: "New journey purchase \u2014 {{ journeyName }}",
        category: "journey",
        description: "Sent to practitioner when someone purchases their guided journey",
        variables: ["journeyName", "customerEmail", "price"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "New Journey Sale!", "Someone has purchased your guided journey", {
                bgColor: "#16a34a",
                minHeight: 180,
            }),
            infoCard("Sale Details", [
                { label: "Journey", value: "{{ journeyName }}" },
                { label: "Customer", value: "{{ customerEmail }}" },
                { label: "Amount", value: "{{ price }}" },
            ], "accent", { borderColor: "#16a34a" }),
            body("Note", [
                "Great news! The customer now has full access to all tracks in this journey.",
                "Keep creating amazing content \u2014 your journeys are making a difference!",
            ]),
        ],
    },
    {
        id: "JOURNEY_PURCHASED_CUSTOMER",
        name: "Journey Purchased (Customer)",
        subject: "Your journey awaits \u2014 {{ journeyName }}",
        category: "journey",
        description: "Confirmation sent to customer after purchasing a guided journey",
        variables: ["journeyName", "practitionerName", "trackCount"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Your Journey Awaits", "{{ journeyName }} by {{ practitionerName }}", {
                bgColor: "#6b21a8",
                minHeight: 200,
            }),
            infoCard("Journey Details", [
                { label: "Journey", value: "{{ journeyName }}" },
                { label: "Practitioner", value: "{{ practitionerName }}" },
                { label: "Tracks", value: "{{ trackCount }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("Getting Started", [
                "Thank you for your purchase! You now have full access to this journey in your personal space.",
                "Find a quiet space, gather any recommended tools, and begin when you\u2019re ready. Here are some tips for the best experience:",
                "\u2022 Listen with headphones for immersive audio",
                "\u2022 Set an intention before each track",
                "\u2022 Use the reflection prompts to journal after each session",
                "\u2022 Take your time \u2014 there\u2019s no rush to complete",
            ]),
        ],
    },
];

// ─── Migration ───────────────────────────────────────────────────

export const migration: Migration = {
    id: "059_reseed_feature_email_templates",
    description: "Reseeds Payment Link, Live Assist, Expo Mode, and Journey email templates with proper designs",

    async up(context) {
        // Look up current default header/footer
        const defaultHeaders = await context.runQuery<{ id: string }>(
            "System-Settings",
            "SELECT c.id FROM c WHERE c.docType = 'email-header-footer' AND c.type = 'header' AND c.isDefault = true"
        );
        const defaultFooters = await context.runQuery<{ id: string }>(
            "System-Settings",
            "SELECT c.id FROM c WHERE c.docType = 'email-header-footer' AND c.type = 'footer' AND c.isDefault = true"
        );

        const activeHeaderId = defaultHeaders[0]?.id || "default-header";
        const activeFooterId = defaultFooters[0]?.id || "default-footer";
        context.log(`Using header: ${activeHeaderId}, footer: ${activeFooterId}`);

        context.log(`Reseeding ${templates.length} email templates with proper designs...`);

        const templateRecords = templates.map((t) => ({
            id: t.id,
            partition: "email-templates",
            docType: "email-template" as const,
            name: t.name,
            subject: t.subject,
            html: createStructure(t.blocks, t.layout),
            variables: t.variables,
            category: t.category,
            description: t.description,
            isActive: true,
            headerId: activeHeaderId,
            footerId: activeFooterId,
            createdAt: now,
            updatedAt: now,
            updatedBy: "system-migration",
        }));

        const result = await context.seedData({
            container: "System-Settings",
            partitionKeyField: "partition",
            records: templateRecords,
            upsert: true,
        });

        context.log(`Templates: ${result.inserted} inserted, ${result.skipped} skipped`);
    },
};
