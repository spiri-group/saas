/**
 * Migration: 056_seed_journey_email_templates
 *
 * Seeds email templates for the Guided Journeys feature:
 *   - JOURNEY_PURCHASED_PRACTITIONER: Sent to practitioner when a journey is purchased
 *   - JOURNEY_PURCHASED_CUSTOMER: Sent to customer after purchasing a journey
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

const JOURNEY_TEMPLATES = [
    // 1. Practitioner notification - someone bought their journey
    makeTemplate(
        "JOURNEY_PURCHASED_PRACTITIONER",
        "New journey purchase \u2014 {{ journeyName }}",
        "journey",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "New Journey Sale!", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    p("Great news! Someone has purchased your guided journey."),
                    p("<strong>Journey:</strong> {{ journeyName }}"),
                    p("<strong>Customer:</strong> {{ customerEmail }}"),
                    p("<strong>Amount:</strong> {{ price }}"),
                    p("The customer now has full access to all tracks in this journey. Keep creating amazing content!"),
                ].join(""),
            },
        ],
        [
            { key: "journeyName", label: "Journey Name" },
            { key: "customerEmail", label: "Customer Email" },
            { key: "price", label: "Sale Price" },
        ]
    ),

    // 2. Customer confirmation - they bought a journey
    makeTemplate(
        "JOURNEY_PURCHASED_CUSTOMER",
        "Your journey awaits \u2014 {{ journeyName }}",
        "journey",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Your Journey Awaits", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    p("Thank you for your purchase!"),
                    p("You now have full access to <strong>{{ journeyName }}</strong> by {{ practitionerName }}."),
                    p("This journey includes {{ trackCount }} track(s) designed to guide you through a transformative experience."),
                    p("Find a quiet space, gather any recommended tools, and begin when you\u2019re ready. Your journey is waiting for you in your personal space."),
                ].join(""),
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Tips",
                title: "Getting the Most from Your Journey",
                description: [
                    p("\u2022 Listen with headphones for the best experience"),
                    p("\u2022 Set an intention before each track"),
                    p("\u2022 Use the reflection prompts to journal after each session"),
                    p("\u2022 Take your time \u2014 there\u2019s no rush to complete"),
                ].join(""),
            },
        ],
        [
            { key: "journeyName", label: "Journey Name" },
            { key: "practitionerName", label: "Practitioner Name" },
            { key: "trackCount", label: "Track Count" },
        ]
    ),
];

export const migration: Migration = {
    id: "056_seed_journey_email_templates",
    description: "Seeds email templates for the Guided Journeys feature",

    async up(context) {
        const records = JOURNEY_TEMPLATES.map(t => ({
            ...t,
            partition: "email-template",
            updatedBy: "system-migration",
        }));

        const result = await context.seedData({
            container: "System-Settings",
            partitionKeyField: "partition",
            records,
            upsert: true,
        });

        context.log(`Journey email templates: ${result.inserted} inserted, ${result.skipped} skipped`);
    },
};
