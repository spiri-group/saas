/**
 * Migration: 039_seed_subscription_terms
 *
 * Seeds the "Subscription Terms" base legal document covering the Awaken,
 * Manifest, and Transcend subscription plans — pricing, billing intervals,
 * upgrades/downgrades, cancellation, and feature entitlements.
 */

import { Migration, MigrationContext } from "../types";

const SUBSCRIPTION_TERMS_CONTENT = `# Subscription Terms

**Effective Date:** [EFFECTIVE_DATE]

These Subscription Terms ("Terms") govern your subscription to SpiriVerse's paid plans. By subscribing, you agree to these Terms in addition to our general Terms of Service.

---

## 1. Subscription Plans

SpiriVerse offers three subscription plans:

### 1.1 Awaken

- **Who it's for:** Individual practitioners
- Profile listing on the SpiriVerse marketplace
- Online booking and calendar management
- Accept payments through the platform
- Access to SpiriReadings (virtual readings)
- Build a following with video content

### 1.2 Manifest

- **Who it's for:** Merchants and store owners
- Everything in Awaken, plus:
- Create a merchant profile and online shop (up to 10 products)
- Run and sell ticketed events
- Inventory automation (stock stays in sync)
- SpiriAssist for investigations and insights

### 1.3 Transcend

- **Who it's for:** Established businesses
- Everything in Manifest, plus:
- Unlimited products (no cap)
- Host practitioners within your space
- Create and sell guided tours
- Backorder support (never miss a sale)
- Shipping automation (auto-generated labels)

---

## 2. Pricing and Billing

### 2.1 Billing Intervals

Each plan is available on two billing intervals:

- **Monthly** — billed once per calendar month
- **Annual** — billed once per year at a discounted rate (approximately 20% saving compared to monthly billing)

Current pricing is displayed on our website and during the subscription signup process. All prices are in Australian Dollars (AUD) unless otherwise stated.

### 2.2 When Billing Starts

Your first billing cycle begins when you complete your account setup requirements (adding a payment method and completing Stripe onboarding). There is no charge until these steps are completed.

### 2.3 Payment Method

You must provide a valid payment method (credit card or debit card) via our payment processor, Stripe. Your payment method will be charged automatically at the start of each billing cycle.

### 2.4 Failed Payments

If a payment fails, we will:

1. Notify you and retry the payment
2. Send a second notice if the retry fails
3. Send a final notice before suspending your account

If payment is not resolved after the final notice, your account will be suspended. You can reactivate your account at any time by updating your payment method and clearing the outstanding balance.

---

## 3. Upgrades

### 3.1 Upgrading Your Plan

You may upgrade your subscription plan at any time (e.g., from Awaken to Manifest, or from Manifest to Transcend).

### 3.2 When Upgrades Take Effect

Upgrades take effect immediately. You gain access to the new plan's features straight away.

### 3.3 Prorated Billing

When you upgrade mid-cycle, we calculate the unused portion of your current plan and credit it toward your new plan. You only pay the difference for the remainder of the current billing period.

---

## 4. Downgrades

### 4.1 Requesting a Downgrade

You may request a downgrade at any time (e.g., from Transcend to Manifest, or from Manifest to Awaken).

### 4.2 When Downgrades Take Effect

Downgrades take effect at the end of your current billing period. You continue to have access to your current plan's features until then.

### 4.3 Feature Adjustments

When a downgrade takes effect, features not included in your new plan will no longer be available. For example:

- Downgrading from Transcend to Manifest will cap your product listings at 10 and remove access to tours, hosted practitioners, backorders, and shipping automation
- Downgrading from Manifest to Awaken will remove your merchant profile and shop

We recommend reviewing your account and adjusting your content before a downgrade takes effect.

### 4.4 Cancelling a Pending Downgrade

You may cancel a pending downgrade at any time before it takes effect, and your current plan will continue unchanged.

---

## 5. Cancellation

### 5.1 How to Cancel

You may cancel your subscription at any time through your account settings.

### 5.2 Effect of Cancellation

When you cancel, your subscription remains active until the end of your current billing period. After that:

- Your profile will no longer appear in search results or the marketplace
- Your merchant shop (if applicable) will be hidden from customers
- Your account data is retained for 90 days in case you wish to resubscribe

### 5.3 Refunds

Subscription fees are non-refundable, except where required by applicable consumer protection law (see the relevant Country Supplement for your jurisdiction).

---

## 6. Changes to Plans and Pricing

### 6.1 Plan Changes

We may modify the features included in each plan from time to time. We will give you at least 30 days' notice of any material changes.

### 6.2 Price Changes

We may adjust subscription pricing. Price changes will:

- Apply from your next billing cycle (not mid-cycle)
- Be communicated at least 30 days in advance via email
- Not affect the current billing period you have already paid for

If you do not agree with a price change, you may downgrade or cancel your subscription before the new price takes effect.

---

## 7. General

### 7.1 Relationship to Other Terms

These Subscription Terms supplement our general Terms of Service. In the event of a conflict between these Terms and the general Terms of Service, these Terms prevail with respect to subscription-related matters.

### 7.2 Country-Specific Terms

Additional terms may apply depending on your jurisdiction. Please refer to the applicable Country Supplement for details on consumer rights, refund entitlements, and tax treatment.

### 7.3 Contact

If you have questions about your subscription, contact us at support@spiriverse.com.`;

export const migration: Migration = {
    id: "039_seed_subscription_terms",
    description:
        "Seed the Subscription Terms base legal document covering Awaken, Manifest, and Transcend plans.",

    async up(context: MigrationContext) {
        const now = new Date().toISOString();

        // Check if document already exists
        const existing = await context.runQuery<{ id: string }>(
            "System-Settings",
            "SELECT c.id FROM c WHERE c.docType = 'legal-document' AND c.id = 'subscription-terms'"
        );

        if (existing.length > 0) {
            context.log("subscription-terms already exists — skipping");
            return;
        }

        const record = {
            id: "subscription-terms",
            docType: "legal-document",
            documentType: "subscription-terms",
            title: "Subscription Terms",
            content: SUBSCRIPTION_TERMS_CONTENT,
            market: "global",
            version: 1,
            isPublished: false, // Draft — needs review before publishing
            effectiveDate: now,
            changeSummary: "Initial subscription terms document",
            createdAt: now,
            updatedAt: now,
            updatedBy: "migration-039",
            status: "ACTIVE",
        };

        context.log("Seeding subscription-terms base document...");

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [record],
            upsert: true,
        });

        context.log("✓ Seeded subscription-terms (draft — review before publishing)");
    },
};
