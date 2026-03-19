/**
 * Migration: 066_reseed_default_header_footer
 *
 * Re-seeds the default email header and footer with proper content.
 * The originals may have been overwritten with empty content via the console editor.
 */

import { Migration } from "../types";
import { v4 as uuid } from "uuid";

export const migration: Migration = {
    id: "066_reseed_default_header_footer",
    description: "Re-seeds the default SpiriVerse email header and footer with branded content",

    async up(context) {
        const now = new Date().toISOString();

        // Build the default header: SpiriVerse branded banner
        const headerLogoBlockId = uuid();
        const headerContent = JSON.stringify({
            contentBlocks: [
                {
                    id: headerLogoBlockId,
                    blockType: "hero",
                    heroTitle: "SpiriVerse",
                    heroSubtitle: undefined,
                    heroBgColor: "#6b21a8",
                    heroTextColor: "#ffffff",
                    heroTextAlign: "center",
                    heroMinHeight: 80,
                    titleAlign: "left",
                    titleSize: "large",
                    subtitleAlign: "left",
                    subtitleSize: "medium",
                    descriptionAlign: "justify",
                    isQuote: false,
                    socialIconSize: 32,
                    socialAlign: "center",
                },
            ],
            layout: {
                type: "single-full",
                slots: { main: headerLogoBlockId },
                dividers: [],
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
            },
        });

        // Build the default footer: copyright + social links placeholder
        const footerCopyrightBlockId = uuid();
        const footerContent = JSON.stringify({
            contentBlocks: [
                {
                    id: footerCopyrightBlockId,
                    blockType: "text",
                    description: '<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">\u00a9 SpiriVerse. All rights reserved.</span></p>',
                    descriptionAlign: "center",
                    titleAlign: "left",
                    titleSize: "large",
                    subtitleAlign: "left",
                    subtitleSize: "medium",
                    isQuote: false,
                    socialIconSize: 32,
                    socialAlign: "center",
                },
            ],
            layout: {
                type: "single-full",
                slots: { main: footerCopyrightBlockId },
                dividers: [],
                padding: { top: 12, bottom: 12, left: 20, right: 20 },
            },
        });

        // Upsert the default header
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    docType: "email-header-footer",
                    id: "default-header",
                    name: "SpiriVerse Default Header",
                    type: "header",
                    content: headerContent,
                    description: "Default SpiriVerse branded email header",
                    isDefault: true,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "migration-066",
                },
                {
                    docType: "email-header-footer",
                    id: "default-footer",
                    name: "SpiriVerse Default Footer",
                    type: "footer",
                    content: footerContent,
                    description: "Default SpiriVerse email footer with copyright",
                    isDefault: true,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "migration-066",
                },
            ],
        });

        context.log("Re-seeded default header and footer with branded content");
    },
};
