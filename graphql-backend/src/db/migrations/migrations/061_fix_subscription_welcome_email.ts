/**
 * Migration: 061_fix_subscription_welcome_email
 *
 * Updates the subscription-welcome email template to remove outdated
 * payout-gated billing language. The old text said vendors wouldn't be
 * charged until they earned enough through payouts. The current model
 * is a 14-day free trial, then billing starts automatically.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "061_fix_subscription_welcome_email",
    description: "Updates subscription welcome email to reflect trial-based billing instead of payout-gated billing",

    async up(context) {
        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-welcome" },
                { name: "@docType", value: "email-template" },
            ]
        );

        if (results.length === 0) {
            context.log("subscription-welcome template not found — skipping");
            return;
        }

        const doc = results[0];

        // The html field contains a JSON structure with contentBlocks.
        // We need to find and replace the outdated payout language in the body block.
        if (!doc.html) {
            context.log("subscription-welcome has no html field — skipping");
            return;
        }

        const oldText = "You won\u2019t be charged until your profile earns {{ subscription.threshold }} through payouts. Once that threshold is reached, your {{ subscription.interval }} billing of {{ subscription.price }} will begin automatically.";
        const newText = "Your 14-day free trial starts today. You won\u2019t be charged until it ends. After your trial, your {{ subscription.interval }} billing of {{ subscription.price }} will begin automatically.";

        if (!doc.html.includes("won\u2019t be charged until your profile earns")) {
            context.log("subscription-welcome: payout language not found (may have been updated already) — skipping");
            return;
        }

        const updatedHtml = doc.html.replace(oldText, newText);

        await context.patchItem(
            "System-Settings",
            doc.id,
            "email-template",
            [
                { op: "set", path: "/html", value: updatedHtml },
                { op: "set", path: "/updatedAt", value: new Date().toISOString() },
                { op: "set", path: "/updatedBy", value: "system-migration" },
            ]
        );

        context.log("subscription-welcome: updated billing language from payout-gated to trial-based");
    },
};
