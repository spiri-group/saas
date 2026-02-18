<!-- id: payment-terms -->
<!-- title: Payment & Fee Terms -->
<!-- version: 2 -->
<!-- market: global -->
<!-- isPublished: true -->
<!-- effectiveDate: 2026-02-17T10:19:53.850Z -->
<!-- updatedAt: 2026-02-17T10:19:53.850Z -->
<!-- updatedBy: migration-035 -->
<!-- changeSummary: Replaced all Merchant terminology with Partner. Added Partner definition. Made platform fees (both Customer and Partner portions) non-refundable in all cases. -->
# SpiriVerse Payment & Fee Terms

**Effective Date:** [EFFECTIVE_DATE]
**Last Updated:** [EFFECTIVE_DATE]

These Payment & Fee Terms ("Payment Terms") govern all payment processing, fees, billing, and financial transactions conducted through the SpiriVerse platform ("Platform"), operated by [COMPANY_ENTITY] ("Company", "we", "us", "our"). These Payment Terms apply to all users of the Platform, including customers ("Customers") and partners ("Partners"), collectively referred to as "Users". A "Partner" is any individual or business that lists services, products, or experiences on SpiriVerse. A "Partner" is any individual or business that lists services, products, or experiences on SpiriVerse.

By using the Platform, you agree to be bound by these Payment Terms in addition to our Terms of Service and Privacy Policy.

---

## Table of Contents

1. [Payment Processing Overview](#1-payment-processing-overview)
2. [Accepted Payment Methods](#2-accepted-payment-methods)
3. [Currency and Pricing](#3-currency-and-pricing)
4. [Customer Payment Terms](#4-customer-payment-terms)
5. [Platform Fee Structure and Transparency](#5-platform-fee-structure-and-transparency)
6. [Partner Subscription Billing](#6-partner-subscription-billing)
7. [Payout Terms and Schedules](#7-payout-terms-and-schedules)
8. [Refund and Chargeback Handling](#8-refund-and-chargeback-handling)
9. [Failed Payment Procedures](#9-failed-payment-procedures)
10. [Payment Security](#10-payment-security)
11. [Tax Responsibilities](#11-tax-responsibilities)
12. [Fee Changes and Notification](#12-fee-changes-and-notification)
13. [Payment Disputes](#13-payment-disputes)
14. [Account Holds and Reserves](#14-account-holds-and-reserves)
15. [Multi-Jurisdiction Compliance](#15-multi-jurisdiction-compliance)
16. [Contact Information](#16-contact-information)

---

## 1. Payment Processing Overview

SpiriVerse uses **Stripe** as its sole payment processor. Stripe is a globally recognised, PCI DSS Level 1 certified payment infrastructure provider. All payment transactions on the Platform are processed through Stripe's secure systems.

### How Payments Work

- **Customer payments** are processed through Stripe's payment infrastructure and routed to the relevant Partner's Stripe Connected Account.
- **Partner accounts** are Stripe Connected Accounts created during onboarding. Partners must complete Stripe's identity verification and onboarding requirements before receiving payouts.
- **Cart-based checkout** allows Customers to purchase from multiple Partners in a single order. Payments are split and routed to each respective Partner's Connected Account automatically.
- **Platform fees** are deducted from Partner payments at the time of transaction before funds are settled to the Partner's Connected Account.

SpiriVerse does not directly store, process, or transmit payment card data. All sensitive payment information is handled exclusively by Stripe.

---

## 2. Accepted Payment Methods

SpiriVerse accepts the following payment methods via Stripe:

- **Credit cards**: Visa, Mastercard, American Express
- **Debit cards**: Visa Debit, Mastercard Debit
- Additional payment methods as supported by Stripe in each operating market

### Saved Payment Methods

- Customers may save payment methods to their account for faster checkout using Stripe's Setup Intent flow.
- Saved card details are stored securely by Stripe and are never stored on SpiriVerse servers.
- Customers may add, update, or remove saved payment methods at any time through their account settings.

---

## 3. Currency and Pricing

SpiriVerse operates across three markets, each with its own local currency:

| Market | Currency | Currency Code |
|--------|----------|---------------|
| Australia | Australian Dollar | AUD |
| United Kingdom | British Pound | GBP |
| United States | US Dollar | USD |

### Currency Selection

- Currency is automatically determined by the market in which the Partner operates.
- All prices displayed to Customers are in the local currency of the Partner's market.
- Cross-currency transactions are not supported. Customers purchase from Partners within their local market currency.

### Pricing Display

- All prices displayed on the Platform are inclusive of any applicable platform fees charged to the Customer, clearly itemised during checkout.
- Partners set their own product and service pricing. SpiriVerse does not control or regulate Partner pricing.

---

## 4. Customer Payment Terms

### Checkout Process

- Customers add items to their cart and proceed through a secure checkout flow.
- Orders may include items from multiple Partners in a single transaction. Each Partner's portion is processed and settled separately.
- Payment is captured at the time of order confirmation.

### Authorisation

- By completing a purchase, the Customer authorises SpiriVerse and Stripe to charge the selected payment method for the full order amount, including any applicable Customer fees, shipping fees, and taxes.

### Order Confirmation

- Customers receive an order confirmation upon successful payment processing.
- If payment fails at checkout, the order is not placed and the Customer is prompted to update their payment method or try again.

### Customer Fees

- Certain transactions may include a Customer fee, which covers a portion of payment processing costs. This fee is clearly displayed during checkout before the Customer confirms their order.
- Customer fee rates vary by market and are detailed in the fee schedule available in the Platform's administrative settings.

---

## 5. Platform Fee Structure and Transparency

SpiriVerse operates a transparent, market-based fee structure. Fees vary by market (Australia, United Kingdom, United States) to reflect local payment processing costs and regulatory requirements.

### Fee Components

Fees are composed of the following elements, which may apply individually or in combination depending on the transaction:

| Fee Component | Description |
|---------------|-------------|
| **Partner Fee (Percentage)** | A percentage of the transaction amount deducted from the Partner's payment. |
| **Partner Fee (Fixed)** | A fixed amount per transaction deducted from the Partner's payment, denominated in the smallest currency unit (e.g., cents). |
| **Customer Fee (Percentage)** | A percentage of the transaction amount added to the Customer's total at checkout. |
| **Customer Fee (Fixed)** | A fixed amount per transaction added to the Customer's total at checkout, denominated in the smallest currency unit. |
| **Processing Fee** | Covers underlying payment processing costs incurred by the Platform. |
| **Shipping Fee** | Shipping costs set by the Partner and charged to the Customer at checkout, where applicable. |
| **Tax** | Applicable taxes as determined by the Partner's obligations in their jurisdiction. |

### Fee Configuration

- Fee rates are configured per market and stored in the Platform's System Settings.
- Current fee rates for each market are available to Partners through their dashboard.
- Platform administrators may adjust fee rates. Any changes are subject to the notification provisions in Section 12.

### Fee Transparency

- Partners can view the fee breakdown for each transaction in their dashboard.
- Customers see all applicable fees clearly itemised during checkout before confirming their order.
- No hidden fees are charged at any point in the transaction process.

---

## 6. Partner Subscription Billing

Partners on SpiriVerse pay a recurring subscription fee for access to the Platform.

### Billing Frequency

Partners may choose from the following billing cycles:

- **Monthly billing**: Charged once per calendar month.
- **Yearly billing**: Charged once per year, typically at a discounted rate compared to monthly billing.

### Deferred Billing Start

SpiriVerse operates a **deferred billing model** to support new Partners:

- Subscription billing does **not** begin at the time of account creation.
- Billing commences only after the Partner has received their **first payout** through the Platform.
- This means Partners can set up their storefront, list products, and begin trading without upfront subscription costs.

### Billing Requirements

- **Saved payment method required**: Partners must have a valid payment card saved to their account. Payouts are blocked until a payment card is on file.
- **Automatic charges**: Subscription fees are automatically charged to the Partner's saved payment method on the billing date.
- **Billing history**: Partners can view their full billing history, including past charges and upcoming billing dates, through their dashboard.

### Discounts and Waivers

- Platform administrators may apply **discount percentages** to a Partner's subscription at their discretion (e.g., promotional pricing, partnership arrangements).
- Platform administrators may apply **payment waivers**, temporarily or permanently exempting a Partner from subscription fees.
- Any discounts or waivers are applied at the sole discretion of [COMPANY_ENTITY] and may be revoked with notice.

### Subscription Changes

- Partners may switch between monthly and yearly billing through their account settings.
- Changes take effect at the start of the next billing cycle.
- No pro-rata refunds are issued for mid-cycle changes unless otherwise stated.

---

## 7. Payout Terms and Schedules

### Payout Method

- Partner payouts are processed through **Stripe Connected Accounts**.
- Funds are deposited directly into the bank account linked to the Partner's Stripe Connected Account.

### Payout Prerequisites

Before a Partner can receive payouts, the following must be completed:

1. **Stripe onboarding**: Full identity verification and account setup through Stripe.
2. **Payment card on file**: A valid payment card must be saved to the Partner's SpiriVerse account.
3. **Bank account linked**: A valid bank account must be connected through Stripe.

### Payout Schedule

- Payout schedules are managed by Stripe in accordance with Stripe's standard payout timelines for each market.
- Typical payout timing varies by market:
  - **Australia**: 2-3 business days
  - **United Kingdom**: 2-3 business days
  - **United States**: 2 business days
- These timelines are indicative and subject to Stripe's processing schedules and any applicable holds.

### Payout Tracking

- Partners can track payout status through their SpiriVerse dashboard.
- Webhook notifications (via Stripe's `payout.paid` event) confirm when payouts have been successfully deposited.
- Payout details include the amount, date, and associated transactions.

### Payout Deductions

- Platform fees (Partner percentage and fixed fees) are deducted before payout settlement.
- Refunds processed after payout may be deducted from subsequent payouts or charged to the Partner's saved payment method.

---

## 8. Refund and Chargeback Handling

### Refund Policy

Partners are expected to maintain their own refund policies in compliance with local consumer protection laws. SpiriVerse facilitates refund processing through the following methods:

| Refund Method | Description |
|---------------|-------------|
| **Original payment method** | Funds returned to the Customer's original payment card via Stripe. |
| **Store credit** | Credit applied to the Customer's SpiriVerse account for future purchases. |
| **Bank transfer** | Direct refund via bank transfer where applicable. |

### Partial Refunds

- Partial refunds are supported. Partners may refund a portion of the original transaction amount.
- Partial refund amounts are at the Partner's discretion, subject to their stated refund policy and applicable consumer protection laws.

### Platform Fee Handling on Refunds

- **Platform Fees (both Customer and Partner portions) are non-refundable in all cases.** When a refund is issued, the product or service amount is returned to the Customer, but Platform Fees are retained by SpiriVerse.
- Stripe's processing fees are generally non-refundable, consistent with Stripe's terms.

### Chargebacks

- A chargeback occurs when a Customer disputes a charge directly with their bank or card issuer.
- When a chargeback is initiated, Stripe notifies SpiriVerse and the Partner.
- **Partner responsibility**: Partners are responsible for providing evidence to contest chargebacks where appropriate.
- **Chargeback fees**: Any chargeback fees imposed by Stripe or the card network are the Partner's responsibility.
- SpiriVerse will assist Partners with the chargeback dispute process where possible but does not guarantee outcomes.
- Repeated chargebacks may result in account review, holds, or suspension under Section 14.

---

## 9. Failed Payment Procedures

### Customer Payments

- If a Customer's payment fails at checkout, the order is not processed. The Customer is notified and prompted to:
  - Retry with the same payment method
  - Use a different saved payment method
  - Add a new payment method

### Partner Subscription Payments

If a Partner's subscription payment fails:

1. **First attempt fails**: The Partner is notified via email and in-app notification. A retry is attempted automatically.
2. **Subsequent retries**: Stripe will retry the charge according to its retry schedule (typically up to 3 additional attempts over several days).
3. **All retries fail**: The Partner's account may be flagged, and access to certain Platform features (including payouts) may be restricted until payment is resolved.
4. **Continued non-payment**: Prolonged failure to maintain a valid payment method may result in account suspension.

### Updating Payment Methods

- Partners can update their saved payment method at any time through their account settings.
- Customers can manage their saved payment methods through their account settings.

---

## 10. Payment Security

### PCI DSS Compliance

- Stripe maintains **PCI DSS Level 1** certification, the highest level of payment security compliance.
- SpiriVerse does not store, process, or transmit cardholder data directly. All payment card data is handled by Stripe's certified infrastructure.

### Data Encryption

- All payment transactions are encrypted in transit using TLS (Transport Layer Security).
- Stripe encrypts sensitive data at rest using AES-256 encryption.
- Saved payment method tokens (not actual card numbers) are used for recurring charges and repeat purchases.

### Authentication and Fraud Prevention

- Stripe's fraud detection systems (Stripe Radar) monitor transactions for suspicious activity.
- Strong Customer Authentication (SCA) is enforced for applicable transactions in the United Kingdom (see Section 15).
- 3D Secure authentication may be required for certain transactions based on risk assessment and regulatory requirements.

### User Responsibilities

- Users are responsible for maintaining the security of their account credentials.
- Users must promptly report any unauthorised transactions or suspected security breaches to billing@spiriverse.com.
- SpiriVerse is not liable for losses resulting from a User's failure to secure their account credentials.

---

## 11. Tax Responsibilities

### Partner Tax Obligations

- **Partners are solely responsible for their own tax obligations**, including but not limited to:
  - Goods and Services Tax (GST) in Australia
  - Value Added Tax (VAT) in the United Kingdom
  - Sales tax in the United States (which varies by state and locality)
- Partners are responsible for:
  - Determining whether their products or services are taxable
  - Calculating and collecting the correct tax amounts
  - Remitting taxes to the appropriate tax authorities
  - Maintaining proper tax records and filing returns

### Platform Role

- SpiriVerse provides tools to help Partners configure tax settings for their products and services.
- SpiriVerse does **not** provide tax advice and is **not** responsible for ensuring Partners comply with their tax obligations.
- Partners are strongly advised to consult with a qualified tax professional regarding their obligations in their operating market.

### Platform Fees and Tax

- Platform fees charged to Partners may be subject to applicable taxes (e.g., GST, VAT) depending on the jurisdiction. Any such taxes will be clearly indicated on invoices.

---

## 12. Fee Changes and Notification

### Right to Modify Fees

[COMPANY_ENTITY] reserves the right to modify the fee structure, including Partner fees, Customer fees, processing fees, and subscription pricing, at any time.

### Notification Requirements

- **Partner fees and subscription pricing**: Partners will receive a minimum of **30 days' written notice** before any fee increase takes effect. Notice will be provided via email and in-platform notification.
- **Customer fees**: Changes to Customer fees will be reflected in the checkout process. Customers are shown all applicable fees before confirming any purchase.
- **Immediate changes**: In exceptional circumstances (e.g., significant changes in payment processing costs, regulatory requirements), [COMPANY_ENTITY] may implement fee changes with shorter notice, providing as much advance notice as reasonably practicable.

### Partner Options on Fee Changes

- Upon receiving notice of a fee change, Partners may:
  - Accept the new fee structure and continue using the Platform.
  - Downgrade or modify their subscription plan if available.
  - Close their account in accordance with the Terms of Service before the new fees take effect.
- Continued use of the Platform after the effective date of a fee change constitutes acceptance of the updated fees.

---

## 13. Payment Disputes

### Between Customers and Partners

- Payment disputes between Customers and Partners (e.g., regarding product quality, non-delivery, or service issues) should be resolved directly between the parties.
- SpiriVerse may facilitate communication between the parties but is not an arbitrator.
- If a resolution cannot be reached, either party may escalate the matter to SpiriVerse support at billing@spiriverse.com for review.

### Dispute Resolution Process

1. **Direct resolution**: The Customer contacts the Partner to resolve the issue.
2. **Platform review**: If unresolved, either party submits a dispute to SpiriVerse with supporting documentation.
3. **Investigation**: SpiriVerse reviews the dispute, which may include reviewing transaction records, communications, and evidence provided by both parties.
4. **Decision**: SpiriVerse may, at its discretion, issue a refund, uphold the charge, or take other appropriate action.

### Binding Decisions

- SpiriVerse's decisions on payment disputes are made in good faith and are final within the scope of Platform transactions.
- Nothing in this section limits either party's rights under applicable consumer protection laws or their right to pursue external legal remedies.

---

## 14. Account Holds and Reserves

### When Holds May Be Applied

[COMPANY_ENTITY] reserves the right to place temporary holds on Partner payouts or account funds in the following circumstances:

- **Suspected fraudulent activity**: Unusual transaction patterns or reported fraud.
- **Excessive chargebacks**: A chargeback rate exceeding industry-standard thresholds.
- **Violation of Terms of Service**: Breach of Platform policies or applicable laws.
- **Regulatory requirements**: Compliance with legal or regulatory obligations.
- **Pending disputes**: Active payment disputes under investigation.
- **Identity verification issues**: Incomplete or failed Stripe onboarding verification.

### Hold Procedures

- Partners will be notified promptly when a hold is placed on their account, along with the reason for the hold.
- Partners may submit additional information or documentation to resolve the issue.
- Holds will be released as soon as reasonably practicable once the underlying issue is resolved.

### Reserves

- In certain cases, Stripe or [COMPANY_ENTITY] may require a reserve (a percentage of transaction volume withheld as a safeguard) to be maintained on a Partner's account.
- Reserve requirements are determined based on risk assessment and will be communicated clearly to the affected Partner.

### Account Suspension

- In severe cases (e.g., confirmed fraud, persistent Terms of Service violations), accounts may be suspended.
- Outstanding payouts may be held for up to 90 days following suspension to cover potential chargebacks, refunds, or disputes.

---

## 15. Multi-Jurisdiction Compliance

SpiriVerse operates across Australia, the United Kingdom, and the United States. Payment processing complies with applicable laws and regulations in each jurisdiction.

### Australia

- Payments processed in compliance with the **Australian Consumer Law (ACL)** and the **Payment Systems (Regulation) Act 1998**.
- GST applies where required under the **A New Tax System (Goods and Services Tax) Act 1999**.
- Anti-money laundering obligations under the **Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (AML/CTF Act)**.

### United Kingdom

- Payments processed in compliance with the **Payment Services Regulations 2017 (PSRs 2017)** and the **Consumer Rights Act 2015**.
- **PSD2 and Strong Customer Authentication (SCA)**: SpiriVerse and Stripe enforce SCA requirements for applicable transactions in the UK. This includes:
  - 3D Secure (3DS) authentication for online card payments where required.
  - Exemptions applied where permitted (e.g., low-value transactions, trusted beneficiaries) in accordance with PSD2 regulations.
  - The Setup Intent flow used for saving payment methods incorporates SCA where required by regulation.
- VAT applies where required under UK tax law.
- Anti-money laundering obligations under the **Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017**.
- Financial Conduct Authority (FCA) regulations applicable to payment services.

### United States

- Payments processed in compliance with applicable **federal and state consumer protection laws**, including the **Electronic Fund Transfer Act (EFTA)** and **Regulation E**.
- State-level money transmitter regulations are addressed through Stripe's licensed payment processing infrastructure.
- The **Payment Card Industry Data Security Standard (PCI DSS)** is maintained through Stripe's Level 1 certification.
- Compliance with the **Bank Secrecy Act (BSA)** and applicable anti-money laundering requirements.

### Cross-Market Provisions

- Each market operates independently with its own currency, fee structure, and regulatory compliance framework.
- User data is processed in accordance with applicable data protection laws in each jurisdiction (GDPR for UK, Privacy Act for Australia, applicable state privacy laws for the US).

---

## 16. Contact Information

For all payment-related enquiries, billing questions, disputes, or to report unauthorised transactions:

**Email:** billing@spiriverse.com

**Mailing Address:** [COMPANY_ENTITY]

When contacting us regarding a payment issue, please include:

- Your account email address
- Transaction ID or order number (if applicable)
- A clear description of the issue
- Any relevant supporting documentation

We aim to respond to all payment-related enquiries within 2 business days.

---

## Changes to These Payment Terms

[COMPANY_ENTITY] reserves the right to update these Payment Terms at any time. Material changes will be communicated to Users via email and/or in-platform notification at least 30 days before taking effect. Continued use of the Platform after the effective date of any changes constitutes acceptance of the updated Payment Terms.

---

*These Payment Terms are governed by the laws of the jurisdiction specified in SpiriVerse's Terms of Service.*
