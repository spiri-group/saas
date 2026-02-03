/**
 * Migration: 005_seed_email_templates
 *
 * Seeds all email templates, headers, and footers into System-Settings container.
 * Templates use EmailStructure JSON format matching the block editor's output.
 *
 * Each template is composed of independent, reusable blocks:
 *   - Hero block: bold banner with optional CTA button embedded
 *   - Info-card block: structured key/value details
 *   - Body block(s): content paragraphs
 *   - CTA block: standalone button with action link
 *   - Divider block: visual separator between sections
 *
 * Templates also leverage:
 *   - Global color palette (brand colors defined once)
 *   - Font controls on text blocks (family & size)
 *   - Hero embedded buttons (CTA inside the banner)
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

// ─── Block Helpers ───────────────────────────────────────────────

/** All blocks include Zod schema defaults to match editor output */
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

/** Wrap plain text in the rich text editor's paragraph format */
const p = (text: string) =>
    `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${text}</span></p>`;

/** Create a heading-only text block */
const heading = (title: string, size: "small" | "medium" | "large" | "xlarge" = "xlarge") => ({
    id: uuid(),
    blockType: "text",
    ...baseDefaults,
    label: "Heading",
    title,
    titleAlign: "center" as const,
    titleSize: size,
});

/** Create a body text block with rich text paragraphs */
const body = (label: string, lines: string[], align: "left" | "center" | "justify" = "justify") => ({
    id: uuid(),
    blockType: "text",
    ...baseDefaults,
    label,
    description: lines.map(p).join(""),
    descriptionAlign: align,
});

/** Create a styled body text block with background, border, and optional font */
const styledBody = (
    label: string,
    lines: string[],
    opts: {
        align?: "left" | "center" | "justify";
        bgColor?: string;
        borderColor?: string;
        borderRadius?: number;
        padding?: number;
        fontFamily?: string;
        fontSize?: number;
    } = {},
) => ({
    id: uuid(),
    blockType: "text",
    ...baseDefaults,
    label,
    description: lines.map(p).join(""),
    descriptionAlign: opts.align || "justify",
    textBgColor: opts.bgColor,
    textBorderColor: opts.borderColor,
    textBorderRadius: opts.borderRadius ?? 0,
    textPadding: opts.padding ?? 0,
    textFontFamily: opts.fontFamily,
    textFontSize: opts.fontSize,
});

/** Create a CTA button block */
const cta = (label: string, text: string, url: string, style: "primary" | "secondary" | "outline" = "primary") => ({
    id: uuid(),
    blockType: "button",
    ...baseDefaults,
    label,
    buttonText: text,
    buttonUrl: url,
    buttonStyle: style,
});

/** Create a hero / banner block with optional embedded CTA button */
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

/** Create an info-card block with label/value pairs */
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

/** Create a divider block */
const divider = (
    label: string = "Divider",
    opts: { style?: "solid" | "dashed" | "dotted" | "gradient"; color?: string; height?: number; width?: number } = {},
) => ({
    id: uuid(),
    blockType: "dividerBlock",
    ...baseDefaults,
    label,
    dividerBlockStyle: opts.style || "solid",
    dividerBlockColor: opts.color || "#e2e8f0",
    dividerBlockHeight: opts.height || 1,
    dividerBlockWidth: opts.width || 100,
});

// ─── Structure Helper ────────────────────────────────────────────

const SLOT_MAPS: Record<string, string[]> = {
    "single-full": ["main"],
    "two-stacked": ["top", "bottom"],
    "three-stacked": ["top", "middle", "bottom"],
    "four-grid": ["top-left", "top-right", "bottom-left", "bottom-right"],
    "hero-two-column": ["hero", "left", "right"],
    "hero-three-column": ["hero", "left", "center", "right"],
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

// ─── Headers & Footers ───────────────────────────────────────────

const defaultHeader = {
    id: "default-header",
    name: "SpiriVerse Default Header",
    type: "header" as const,
    content: createStructure([
        { ...heading("SpiriVerse", "large"), label: "Logo" },
    ]),
    description: "Default SpiriVerse email header",
    isDefault: true,
    isActive: true,
};

const defaultFooter = {
    id: "default-footer",
    name: "SpiriVerse Default Footer",
    type: "footer" as const,
    content: createStructure([
        body("Copyright", ["\u00a9 SpiriVerse. All rights reserved."], "center"),
    ]),
    description: "Default SpiriVerse email footer",
    isDefault: true,
    isActive: true,
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
    // MERCHANT
    // ═══════════════════════════════════════════════════

    {
        id: "merchant-request",
        name: "Merchant Request",
        subject: "New Merchant Request from {{ merchant.name }}",
        category: "merchant",
        description: "Sent to admin when a new merchant submits a request to join",
        variables: ["merchant.name", "merchant.contactEmail"],
        layout: "three-stacked",
        blocks: [
            heading("New Merchant Request"),
            infoCard("Request Info", [
                { label: "Business Name", value: "{{ merchant.name }}" },
                { label: "Contact Email", value: "{{ merchant.contactEmail }}" },
            ], "accent", { borderColor: "#6b21a8" }),
            body("Details", [
                "A new merchant is keen to join the SpiriVerse community and has submitted a request for review.",
                "Head over to the admin console to review their application and get them started.",
            ]),
        ],
    },
    {
        id: "verification-code",
        name: "Verification Code",
        subject: "Your SpiriVerse verification code: {{ code }}",
        category: "auth",
        description: "Sent for email verification during signup or login",
        variables: ["user.name", "code"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Verify Your Email", "One more step to get going", {
                bgColor: "#6b21a8",
                minHeight: 150,
            }),
            styledBody("Code Display", [
                "{{ code }}",
            ], {
                align: "center",
                bgColor: "#f8fafc",
                borderColor: "#e2e8f0",
                borderRadius: 12,
                padding: 24,
                fontFamily: "monospace",
                fontSize: 36,
            }),
            body("Instructions", [
                "Hi {{ user.name }}, enter the code above to verify your email and get going.",
                "This code is valid for 10 minutes \u2014 if it expires, you can always request a new one.",
                "Didn\u2019t request this? No worries, you can safely ignore this email.",
            ], "center"),
        ],
    },
    {
        id: "merchant-signup",
        name: "Merchant Signup",
        subject: "Welcome to SpiriVerse, {{ merchant.name }}!",
        category: "merchant",
        description: "Sent when a new merchant completes signup",
        variables: ["merchant.name", "merchant.contactName"],
        layout: "two-stacked",
        blocks: [
            hero("Welcome Banner", "Welcome to SpiriVerse!", "We\u2019re excited to have {{ merchant.name }} on board", {
                bgColor: "#6b21a8",
                minHeight: 180,
            }),
            body("Welcome Message", [
                "Hi {{ merchant.contactName }},",
                "Thanks for signing up \u2014 we\u2019re thrilled to welcome you to the community!",
                "Our team is reviewing your account now. We\u2019ll send you another email as soon as everything is approved, so keep an eye on your inbox.",
                "In the meantime, feel free to explore and get familiar with the platform.",
            ]),
        ],
    },
    {
        id: "merchant-welcome-message",
        name: "Merchant Approved",
        subject: "You\u2019re approved! Start selling on SpiriVerse",
        category: "merchant",
        description: "Sent when merchant account is approved",
        variables: ["merchant.contactName", "merchant.name", "merchant.dashboardUrl"],
        layout: "two-stacked",
        blocks: [
            hero("Approval Banner", "You\u2019re Approved!", "{{ merchant.name }} is ready to go", {
                bgColor: "#16a34a",
                minHeight: 200,
                buttonText: "Go to Dashboard",
                buttonUrl: "{{ merchant.dashboardUrl }}",
                buttonStyle: "primary",
            }),
            body("Next Steps", [
                "Hi {{ merchant.contactName }},",
                "Great news \u2014 {{ merchant.name }} has been approved and your account is live!",
                "You can now start adding your services, setting up your storefront, and connecting with customers. Your dashboard has everything you need to get up and running.",
                "If you need any help along the way, our support team is always here for you.",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // ORDER
    // ═══════════════════════════════════════════════════

    {
        id: "order-confirmation",
        name: "Order Confirmation",
        subject: "Order Confirmed \u2014 #{{ order.code }}",
        category: "order",
        description: "Sent when an order is confirmed",
        variables: ["customer.name", "order.code", "order.total", "order.url"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Order Confirmed!", "Thanks for your purchase, {{ customer.name }}", {
                bgColor: "#6b21a8",
                minHeight: 180,
                buttonText: "View Order Details",
                buttonUrl: "{{ order.url }}",
            }),
            infoCard("Order Summary", [
                { label: "Order Number", value: "{{ order.code }}" },
                { label: "Total", value: "{{ order.total }}" },
            ], "filled", { bgColor: "#f8fafc" }),
            body("What Happens Next", [
                "We\u2019ve got your order and everything looks good!",
                "We\u2019ll keep you updated as things progress and let you know as soon as your order ships.",
            ]),
        ],
    },
    {
        id: "order-shipped",
        name: "Order Shipped",
        subject: "Your order #{{ order.code }} is on its way!",
        category: "order",
        description: "Sent when an order ships",
        variables: ["customer.name", "order.code", "shipment.trackingNumber", "shipment.carrier", "shipment.trackingUrl"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Your Order Has Shipped!", "It\u2019s on its way to you, {{ customer.name }}", {
                bgColor: "#2563eb",
                minHeight: 180,
                buttonText: "Track Your Package",
                buttonUrl: "{{ shipment.trackingUrl }}",
            }),
            infoCard("Shipping Details", [
                { label: "Order Number", value: "{{ order.code }}" },
                { label: "Tracking Number", value: "{{ shipment.trackingNumber }}" },
                { label: "Carrier", value: "{{ shipment.carrier }}" },
            ], "outlined"),
            body("Delivery Info", [
                "Your order is packed and on its way! Delivery times vary by carrier, but you can track the latest updates using the button above.",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // BOOKING
    // ═══════════════════════════════════════════════════

    {
        id: "booking-confirmed-customer",
        name: "Booking Confirmed - Customer",
        subject: "You\u2019re all set! Booking with {{ practitioner.name }} confirmed",
        category: "booking",
        description: "Sent to customer when practitioner confirms booking",
        variables: ["customer.name", "practitioner.name", "booking.serviceName", "booking.date", "booking.time", "booking.deliveryMethod", "booking.url"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Booking Confirmed!", "Your appointment with {{ practitioner.name }} is locked in", {
                bgColor: "#16a34a",
                minHeight: 180,
                buttonText: "View Your Booking",
                buttonUrl: "{{ booking.url }}",
            }),
            infoCard("Appointment Details", [
                { label: "Service", value: "{{ booking.serviceName }}" },
                { label: "Date", value: "{{ booking.date }}" },
                { label: "Time", value: "{{ booking.time }}" },
                { label: "Delivery", value: "{{ booking.deliveryMethod }}" },
            ], "filled", { bgColor: "#f0fdf4" }),
            body("Note", [
                "Hi {{ customer.name }}, if you need to make any changes or have questions ahead of your appointment, you can manage everything from your booking page.",
            ]),
        ],
    },
    {
        id: "booking-pending-practitioner",
        name: "Booking Pending - Practitioner",
        subject: "New booking request from {{ customer.name }}",
        category: "booking",
        description: "Sent to practitioner when a new booking needs confirmation",
        variables: ["practitioner.name", "customer.name", "booking.serviceName", "booking.date", "booking.time", "booking.url"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "New Booking Request", "{{ customer.name }} wants to book with you", {
                bgColor: "#d97706",
                minHeight: 170,
                buttonText: "Review Booking",
                buttonUrl: "{{ booking.url }}",
            }),
            infoCard("Request Details", [
                { label: "Customer", value: "{{ customer.name }}" },
                { label: "Service", value: "{{ booking.serviceName }}" },
                { label: "Date", value: "{{ booking.date }}" },
                { label: "Time", value: "{{ booking.time }}" },
            ], "accent", { borderColor: "#d97706" }),
            body("Action Needed", [
                "Hi {{ practitioner.name }}, please review and confirm or decline at your earliest convenience \u2014 the customer will be notified once you respond.",
            ]),
        ],
    },
    {
        id: "booking-cancelled-customer",
        name: "Booking Cancelled - Customer",
        subject: "Your booking has been cancelled",
        category: "booking",
        description: "Sent to customer when a booking is cancelled",
        variables: ["customer.name", "practitioner.name", "booking.serviceName", "booking.date", "booking.time"],
        layout: "three-stacked",
        blocks: [
            heading("Booking Cancelled"),
            infoCard("Cancelled Booking", [
                { label: "Practitioner", value: "{{ practitioner.name }}" },
                { label: "Service", value: "{{ booking.serviceName }}" },
                { label: "Date", value: "{{ booking.date }}" },
                { label: "Time", value: "{{ booking.time }}" },
            ], "outlined"),
            body("Message", [
                "Hi {{ customer.name }},",
                "We wanted to let you know that your upcoming booking has been cancelled.",
                "If this wasn\u2019t expected, or if you\u2019d like to rebook, you\u2019re welcome to schedule a new appointment anytime. If you have any questions, our team is happy to help.",
            ]),
        ],
    },
    {
        id: "booking-cancelled-practitioner",
        name: "Booking Cancelled - Practitioner",
        subject: "A booking has been cancelled",
        category: "booking",
        description: "Sent to practitioner when a booking is cancelled",
        variables: ["practitioner.name", "customer.name", "booking.serviceName", "booking.date", "booking.time"],
        layout: "three-stacked",
        blocks: [
            heading("Booking Cancelled"),
            infoCard("Cancelled Booking", [
                { label: "Customer", value: "{{ customer.name }}" },
                { label: "Service", value: "{{ booking.serviceName }}" },
                { label: "Date", value: "{{ booking.date }}" },
                { label: "Time", value: "{{ booking.time }}" },
            ], "outlined"),
            body("Note", [
                "Hi {{ practitioner.name }},",
                "Just a heads up \u2014 the above booking has been cancelled. This time slot is now free on your schedule. No action needed on your end.",
            ]),
        ],
    },
    {
        id: "booking-reminder-1h",
        name: "Booking Reminder - 1 Hour",
        subject: "Heads up \u2014 your appointment is in 1 hour!",
        category: "booking",
        description: "Sent 1 hour before scheduled booking",
        variables: ["recipient.name", "booking.serviceName", "booking.date", "booking.time", "booking.deliveryMethod"],
        layout: "two-stacked",
        blocks: [
            hero("Banner", "Almost Time!", "Your appointment is in about 1 hour", {
                bgColor: "#2563eb",
                minHeight: 170,
            }),
            infoCard("Appointment Details", [
                { label: "Service", value: "{{ booking.serviceName }}" },
                { label: "Date", value: "{{ booking.date }}" },
                { label: "Time", value: "{{ booking.time }}" },
                { label: "Location", value: "{{ booking.deliveryMethod }}" },
            ], "filled", { bgColor: "#eff6ff" }),
        ],
    },

    // ═══════════════════════════════════════════════════
    // REFUND
    // ═══════════════════════════════════════════════════

    {
        id: "refund-approved",
        name: "Refund Approved",
        subject: "Your refund has been approved",
        category: "refund",
        description: "Sent when a refund is approved",
        variables: ["customer.name", "order.code", "refund.amount"],
        layout: "three-stacked",
        blocks: [
            heading("Refund Approved"),
            infoCard("Refund Details", [
                { label: "Order Number", value: "{{ order.code }}" },
                { label: "Refund Amount", value: "{{ refund.amount }}" },
            ], "filled", { bgColor: "#f0fdf4" }),
            body("What Happens Next", [
                "Hi {{ customer.name }},",
                "We\u2019ve reviewed your refund request and it\u2019s been approved.",
                "The refund has been initiated and the funds should appear back in your account within 5\u201310 business days, depending on your bank or payment provider.",
                "If you have any questions in the meantime, don\u2019t hesitate to reach out.",
            ]),
        ],
    },
    {
        id: "refund-processed",
        name: "Refund Processed",
        subject: "Your refund of {{ refund.amount }} has been processed",
        category: "refund",
        description: "Sent when refund payment is processed",
        variables: ["customer.name", "order.code", "refund.amount"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Refund Processed", "Your money is on its way back", {
                bgColor: "#16a34a",
                minHeight: 160,
            }),
            infoCard("Refund Summary", [
                { label: "Order Number", value: "{{ order.code }}" },
                { label: "Amount Refunded", value: "{{ refund.amount }}" },
            ], "outlined"),
            body("Details", [
                "Hi {{ customer.name }},",
                "Your refund has been processed and is on its way back to you. You should see the funds in your account within 5\u201310 business days. The exact timing depends on your bank or payment provider.",
                "Thanks for your patience \u2014 we appreciate it.",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // TOUR
    // ═══════════════════════════════════════════════════

    {
        id: "tour-booking-created-customer",
        name: "Tour Booking Created - Customer",
        subject: "You\u2019re booked for {{ tour.name }}!",
        category: "tour",
        description: "Sent when customer books a tour",
        variables: ["customer.name", "tour.name", "tour.sessionDate", "tour.sessionTime", "tour.bookingCode", "tour.ticketCount", "tour.url"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "You\u2019re Booked!", "{{ tour.name }}", {
                bgColor: "#6b21a8",
                minHeight: 200,
                buttonText: "View Your Booking",
                buttonUrl: "{{ tour.url }}",
            }),
            infoCard("Tour Details", [
                { label: "Date", value: "{{ tour.sessionDate }}" },
                { label: "Time", value: "{{ tour.sessionTime }}" },
                { label: "Booking Code", value: "{{ tour.bookingCode }}" },
                { label: "Tickets", value: "{{ tour.ticketCount }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("Note", [
                "Hi {{ customer.name }}, exciting times! Hold onto your booking code \u2014 you\u2019ll need it on the day. We can\u2019t wait to see you there!",
            ]),
        ],
    },
    {
        id: "tour-reminder-24h",
        name: "Tour Reminder - 24 Hours",
        subject: "{{ tour.name }} is tomorrow \u2014 see you there!",
        category: "tour",
        description: "Sent 24 hours before tour",
        variables: ["customer.name", "tour.name", "tour.sessionDate", "tour.sessionTime", "tour.location", "tour.bookingCode", "tour.totalTickets"],
        layout: "two-stacked",
        blocks: [
            hero("Banner", "See You Tomorrow!", "{{ tour.name }} is just around the corner", {
                bgColor: "#6b21a8",
                minHeight: 180,
            }),
            infoCard("Your Tour Details", [
                { label: "Date", value: "{{ tour.sessionDate }}" },
                { label: "Time", value: "{{ tour.sessionTime }}" },
                { label: "Location", value: "{{ tour.location }}" },
                { label: "Booking Code", value: "{{ tour.bookingCode }}" },
                { label: "Tickets", value: "{{ tour.totalTickets }}" },
            ], "outlined"),
        ],
    },

    // ═══════════════════════════════════════════════════
    // CASE
    // ═══════════════════════════════════════════════════

    {
        id: "case-created",
        name: "Case Created",
        subject: "We\u2019ve received your case \u2014 #{{ case.number }}",
        category: "case",
        description: "Sent when a new case is created",
        variables: ["customer.name", "case.number", "case.subject", "case.createdDate", "case.url"],
        layout: "three-stacked",
        blocks: [
            heading("Case Created"),
            infoCard("Case Details", [
                { label: "Case Number", value: "{{ case.number }}" },
                { label: "Subject", value: "{{ case.subject }}" },
                { label: "Created", value: "{{ case.createdDate }}" },
            ], "accent", { borderColor: "#2563eb" }),
            body("What Happens Next", [
                "Hi {{ customer.name }},",
                "Your case has been created and is now in our system. We\u2019re working on assigning an investigator to your case. You\u2019ll receive an update once someone has been assigned and begins reviewing it.",
            ]),
        ],
    },
    {
        id: "case-application-accepted",
        name: "Case Application Accepted",
        subject: "You\u2019re in! Application accepted for case #{{ case.number }}",
        category: "case",
        description: "Sent to investigator when their application is accepted",
        variables: ["investigator.name", "case.number", "case.url"],
        layout: "two-stacked",
        blocks: [
            hero("Banner", "Application Accepted!", "You\u2019ve been assigned to case #{{ case.number }}", {
                bgColor: "#16a34a",
                minHeight: 200,
                buttonText: "Open Case",
                buttonUrl: "{{ case.url }}",
            }),
            body("Details", [
                "Hi {{ investigator.name }},",
                "Great news \u2014 your application has been accepted! You now have full access to the case details and can begin your work.",
                "Thanks for stepping up \u2014 your expertise makes a real difference.",
            ]),
        ],
    },

    // ═══════════════════════════════════════════════════
    // PRODUCT
    // ═══════════════════════════════════════════════════

    {
        id: "product-purchase-success",
        name: "Product Purchase Success",
        subject: "Order confirmed \u2014 #{{ order.code }}",
        category: "product",
        description: "Sent when product purchase is successful",
        variables: ["customer.name", "order.code", "order.total", "order.url"],
        layout: "three-stacked",
        blocks: [
            hero("Banner", "Order Confirmed!", "Thanks for your purchase, {{ customer.name }}", {
                bgColor: "#6b21a8",
                minHeight: 180,
                buttonText: "View Order Details",
                buttonUrl: "{{ order.url }}",
            }),
            infoCard("Order Summary", [
                { label: "Order Number", value: "{{ order.code }}" },
                { label: "Total", value: "{{ order.total }}" },
            ], "filled", { bgColor: "#faf5ff" }),
            body("What Happens Next", [
                "Your order has been confirmed and is being prepared. We\u2019ll send you another email as soon as your order ships.",
            ]),
        ],
    },
];

// ─── Migration ───────────────────────────────────────────────────

export const migration: Migration = {
    id: "005_seed_email_templates",
    description: "Seeds all email templates into System-Settings container for ACS email service",

    async up(context) {
        context.log("Seeding email headers and footers...");

        const headerFooterRecords = [
            {
                ...defaultHeader,
                partition: "email-headers-footers",
                docType: "email-header-footer" as const,
                createdAt: now,
                updatedAt: now,
                updatedBy: "system-migration",
            },
            {
                ...defaultFooter,
                partition: "email-headers-footers",
                docType: "email-header-footer" as const,
                createdAt: now,
                updatedAt: now,
                updatedBy: "system-migration",
            },
        ];

        const hfResult = await context.seedData({
            container: "System-Settings",
            partitionKeyField: "partition",
            records: headerFooterRecords,
            upsert: true,
        });

        context.log(`Headers/Footers: ${hfResult.inserted} inserted, ${hfResult.skipped} skipped`);

        // Look up current default header/footer to assign to templates
        const defaultHeaders = await context.runQuery<{ id: string; name: string }>(
            "System-Settings",
            "SELECT c.id, c.name FROM c WHERE c.docType = 'email-header-footer' AND c.type = 'header' AND c.isDefault = true"
        );
        const defaultFooters = await context.runQuery<{ id: string; name: string }>(
            "System-Settings",
            "SELECT c.id, c.name FROM c WHERE c.docType = 'email-header-footer' AND c.type = 'footer' AND c.isDefault = true"
        );

        const activeHeaderId = defaultHeaders[0]?.id;
        const activeFooterId = defaultFooters[0]?.id;
        context.log(`Default header: ${defaultHeaders[0]?.name || "none"} (${activeHeaderId || "n/a"})`);
        context.log(`Default footer: ${defaultFooters[0]?.name || "none"} (${activeFooterId || "n/a"})`);

        context.log(`Seeding ${templates.length} email templates...`);

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
            ...(activeHeaderId && { headerId: activeHeaderId }),
            ...(activeFooterId && { footerId: activeFooterId }),
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
