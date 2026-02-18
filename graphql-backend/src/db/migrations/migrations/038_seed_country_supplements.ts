/**
 * Migration: 038_seed_country_supplements
 *
 * Creates country supplement documents for AU, UK, US, and NZ across all 9
 * document types (36 supplements total). Each supplement is a regular
 * legal-document record with `parentDocumentId` linking to its base document.
 *
 * - AU, UK, US supplements: published (content extracted from former
 *   country-specific sections)
 * - NZ supplements: draft (isPublished = false) pending legal review
 */

import { Migration, MigrationContext } from "../types";

const DOCUMENT_TYPES = [
    "terms-of-service",
    "privacy-policy",
    "cookie-policy",
    "merchant-terms",
    "refund-policy",
    "acceptable-use-policy",
    "spiritual-services-disclaimer",
    "payment-terms",
    "intellectual-property-policy",
] as const;

const MARKETS = ["AU", "UK", "US", "NZ"] as const;

const MARKET_NAMES: Record<string, string> = {
    AU: "Australia",
    UK: "United Kingdom",
    US: "United States",
    NZ: "New Zealand",
};

const TITLE_LABELS: Record<string, string> = {
    "terms-of-service": "Terms of Service",
    "privacy-policy": "Privacy Policy",
    "cookie-policy": "Cookie Policy",
    "merchant-terms": "Partner Terms",
    "refund-policy": "Refund & Returns Policy",
    "acceptable-use-policy": "Acceptable Use Policy",
    "spiritual-services-disclaimer": "Spiritual Services Disclaimer",
    "payment-terms": "Payment & Fee Terms",
    "intellectual-property-policy": "Intellectual Property & DMCA Policy",
};

// ─────────────────────────────────────────────────────
// Supplement content by document type and market
// ─────────────────────────────────────────────────────

function getSupplementContent(
    documentType: string,
    market: string
): string {
    const key = `${documentType}::${market}`;
    return SUPPLEMENT_CONTENT[key] || getDefaultContent(documentType, market);
}

function getDefaultContent(documentType: string, market: string): string {
    return `# ${TITLE_LABELS[documentType]} — ${MARKET_NAMES[market]} Supplement\n\nThis supplement contains the country-specific legal requirements applicable to users in ${MARKET_NAMES[market]}.\n\n*Content pending legal review.*`;
}

// ─────────────────────────────────────────────────────
// AU Supplement Content
// ─────────────────────────────────────────────────────

const AU_TERMS_OF_SERVICE = `# Terms of Service — Australia Supplement

## Governing Law

These Terms are governed by the laws of the State of New South Wales, Australia. You agree to submit to the non-exclusive jurisdiction of the courts of New South Wales.

## Age Requirement

You must be at least 18 years old to use the Platform in Australia, or have the consent of a parent or legal guardian.

## Australian Consumer Law

Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or remedy conferred on you by the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010 (Cth)) or any other applicable law that cannot be excluded, restricted, or modified by agreement.

If our goods or services come with guarantees that cannot be excluded under the Australian Consumer Law, our liability for failure to comply with a consumer guarantee is limited (where permitted) to:

- **(a)** for goods: the replacement of the goods or the supply of equivalent goods, the repair of the goods, or the payment of the cost of replacing the goods or having them repaired; and
- **(b)** for services: the supply of the services again or the payment of the cost of having the services supplied again.`;

const AU_PRIVACY_POLICY = `# Privacy Policy — Australia Supplement

## Australian Privacy Principles (APPs)

SpiriVerse complies with the Australian Privacy Principles (APPs) contained in the Privacy Act 1988 (Cth). This supplement outlines your additional rights under Australian law.

### Your Rights

Under the APPs, you have the right to:

- **Access** your personal information held by us (APP 12)
- **Correct** inaccurate, out-of-date, or incomplete personal information (APP 13)
- **Complain** about a breach of the APPs

### Complaints

If you believe we have breached the APPs, you may lodge a complaint with us at privacy@spiriverse.com. If you are not satisfied with our response, you may escalate your complaint to the Office of the Australian Information Commissioner (OAIC) at [oaic.gov.au](https://www.oaic.gov.au).

### Cross-Border Disclosure

Where we disclose your personal information to overseas recipients, we take reasonable steps to ensure the recipient complies with the APPs (APP 8).`;

const AU_COOKIE_POLICY = `# Cookie Policy — Australia Supplement

## Australian Cookie Requirements

While Australia does not have cookie-specific legislation equivalent to the EU ePrivacy Directive, SpiriVerse respects your privacy preferences in accordance with the Privacy Act 1988 (Cth) and Australian Privacy Principles.

Cookies that collect personal information are subject to the APPs, including the requirement to notify you of the collection and its purpose (APP 5).`;

const AU_MERCHANT_TERMS = `# Partner Terms — Australia Supplement

## Governing Law

This Agreement is governed by the laws of the State of New South Wales, Australia. Both parties submit to the non-exclusive jurisdiction of the courts of New South Wales.

## Australian Consumer Law Obligations

As a Partner operating in Australia, you must comply with the Australian Consumer Law (ACL), including:

- **Consumer guarantees** — goods must be of acceptable quality, fit for purpose, and match their description
- **Unfair contract terms** — standard form contracts must not contain unfair terms
- **Misleading or deceptive conduct** — you must not engage in conduct that is misleading or deceptive (s.18 ACL)`;

const AU_REFUND_POLICY = `# Refund & Returns Policy — Australia Supplement

## Australian Consumer Law

Under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010), consumers have automatic consumer guarantee rights that cannot be excluded, restricted, or modified.

### Consumer Guarantees for Goods

Goods must be:
- Of acceptable quality
- Fit for any disclosed purpose
- Match descriptions and samples

### Remedies

If a good fails to meet a consumer guarantee:

- **Major failure**: you may reject the goods and choose a refund or replacement, or keep the goods and receive compensation for the drop in value
- **Minor failure**: the supplier may choose to repair, replace, or refund

### Refund Timeframes

There is no set timeframe under the ACL, but refund requests should be made within a reasonable time of discovering the fault.`;

const AU_ACCEPTABLE_USE = `# Acceptable Use Policy — Australia Supplement

## Australian Legal Requirements

In addition to the general Acceptable Use Policy, users in Australia must comply with:

- **Criminal Code Act 1995 (Cth)** — provisions relating to online content and telecommunications offences
- **Broadcasting Services Act 1992 (Cth)** — Online Safety provisions
- **Online Safety Act 2021 (Cth)** — eSafety Commissioner powers regarding harmful online content

Content that violates Australian law may be reported to the eSafety Commissioner.`;

const AU_SPIRITUAL_DISCLAIMER = `# Spiritual Services Disclaimer — Australia Supplement

## Australian Regulatory Requirements

Practitioners offering spiritual services in Australia must be aware of:

- **Australian Consumer Law** — claims about the efficacy of spiritual services must not be misleading or deceptive under s.18 of the ACL
- **Health Practitioner Regulation National Law** — spiritual services must not claim to diagnose, treat, or cure any medical condition unless the practitioner is a registered health practitioner under AHPRA
- **Therapeutic Goods Act 1989 (Cth)** — any products used in connection with spiritual services must comply with TGA requirements if they make therapeutic claims`;

const AU_PAYMENT_TERMS = `# Payment & Fee Terms — Australia Supplement

## Currency

All transactions involving Australian users are denominated in Australian Dollars (AUD) unless otherwise specified.

## GST

Prices displayed to Australian users are inclusive of Goods and Services Tax (GST) at the applicable rate (currently 10%) where required by the A New Tax System (Goods and Services Tax) Act 1999 (Cth).

SpiriVerse will issue tax invoices in compliance with GST law.`;

const AU_IP_POLICY = `# Intellectual Property & DMCA Policy — Australia Supplement

## Australian Copyright Law

Copyright in Australia is governed by the Copyright Act 1968 (Cth). The Act provides automatic copyright protection for original literary, dramatic, musical, and artistic works.

### Takedown Procedure

While Australia does not have an equivalent to the US DMCA safe harbour provisions (following the expiry of the Copyright Amendment (Online Infringement) Act 2015 provisions), SpiriVerse voluntarily operates a notice-and-takedown system for Australian users consistent with our global IP policy.

### Designated Contact

Copyright complaints relating to Australian content may be directed to ip@spiriverse.com.`;

// ─────────────────────────────────────────────────────
// UK Supplement Content
// ─────────────────────────────────────────────────────

const UK_TERMS_OF_SERVICE = `# Terms of Service — United Kingdom Supplement

## Governing Law

These Terms are governed by the laws of England and Wales. You agree to submit to the non-exclusive jurisdiction of the courts of England and Wales.

## Age Requirement

You must be at least 18 years old to use the Platform in the United Kingdom, or have the consent of a parent or legal guardian.

## Consumer Rights Act 2015

Nothing in these Terms affects your statutory rights under the Consumer Rights Act 2015. Where goods or digital content do not conform to the contract, you may be entitled to a repair, replacement, or refund as set out in that Act.

## Cancellation Rights

For online purchases, UK consumers have a 14-day cooling-off period under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, during which you may cancel your order and receive a full refund. This right does not apply to sealed digital content once you have started downloading or streaming it with your consent.`;

const UK_PRIVACY_POLICY = `# Privacy Policy — United Kingdom Supplement

## UK GDPR

SpiriVerse processes personal data in compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.

### Legal Basis for Processing

We process your personal data on the following legal bases:
- **Consent** (Article 6(1)(a)) — where you have given clear consent
- **Contract** (Article 6(1)(b)) — where processing is necessary for a contract with you
- **Legal obligation** (Article 6(1)(c)) — where processing is required by law
- **Legitimate interests** (Article 6(1)(f)) — where processing is necessary for our legitimate interests

### Your Rights Under UK GDPR

You have the right to:
- **Access** your personal data (Article 15)
- **Rectification** of inaccurate data (Article 16)
- **Erasure** ("right to be forgotten") (Article 17)
- **Restrict processing** (Article 18)
- **Data portability** (Article 20)
- **Object** to processing (Article 21)
- **Not be subject to automated decision-making** (Article 22)

### Data Protection Officer

For data protection queries, contact privacy@spiriverse.com.

### Supervisory Authority

You have the right to lodge a complaint with the Information Commissioner's Office (ICO) at [ico.org.uk](https://ico.org.uk).

### International Transfers

Where we transfer personal data outside the UK, we ensure appropriate safeguards are in place as required by UK GDPR Chapter V.`;

const UK_COOKIE_POLICY = `# Cookie Policy — United Kingdom Supplement

## UK Cookie Requirements

Under the Privacy and Electronic Communications Regulations 2003 (PECR) and UK GDPR, explicit consent is required before placing non-essential cookies on your device.

### Consent

SpiriVerse uses a cookie consent banner to obtain your affirmative consent before setting analytics, advertising, or other non-essential cookies. Strictly necessary cookies do not require consent.

### Withdrawal of Consent

You may withdraw your cookie consent at any time via the cookie preferences link in the website footer.`;

const UK_MERCHANT_TERMS = `# Partner Terms — United Kingdom Supplement

## Governing Law

This Agreement is governed by the laws of England and Wales. Both parties submit to the non-exclusive jurisdiction of the courts of England and Wales.

## Consumer Rights Act 2015

As a Partner operating in the UK, you must ensure your goods and services comply with the Consumer Rights Act 2015, including that:

- Goods are of satisfactory quality, fit for purpose, and as described
- Digital content is of satisfactory quality, fit for purpose, and as described
- Services are performed with reasonable care and skill`;

const UK_REFUND_POLICY = `# Refund & Returns Policy — United Kingdom Supplement

## Consumer Rights Act 2015

UK consumers have statutory rights under the Consumer Rights Act 2015.

### 14-Day Cooling-Off Period

For online purchases, you have the right to cancel within 14 days of receiving your order under the Consumer Contracts Regulations 2013, for any reason and without justification.

### Faulty Goods

If goods are faulty or not as described:

- **Within 30 days** — you have the right to a full refund
- **Within 6 months** — the retailer must repair or replace the goods; if this is not possible, you are entitled to a full refund
- **After 6 months** — you must prove the goods were faulty at the time of delivery

### Digital Content

If digital content is faulty, you have the right to a repair or replacement. If the fault cannot be fixed, you may be entitled to a price reduction.`;

const UK_ACCEPTABLE_USE = `# Acceptable Use Policy — United Kingdom Supplement

## UK Legal Requirements

In addition to the general Acceptable Use Policy, users in the UK must comply with:

- **Online Safety Act 2023** — requirements for user-generated content and harmful content
- **Computer Misuse Act 1990** — prohibitions on unauthorised access to computer systems
- **Communications Act 2003** — offences relating to improper use of public electronic communications networks
- **Equality Act 2010** — prohibitions on content that constitutes unlawful discrimination or harassment`;

const UK_SPIRITUAL_DISCLAIMER = `# Spiritual Services Disclaimer — United Kingdom Supplement

## UK Regulatory Requirements

Practitioners offering spiritual services in the UK should be aware of:

- **Consumer Protection from Unfair Trading Regulations 2008** — spiritual service claims must not be misleading
- **Cancer Act 1939** — prohibition on advertising treatments or cures for cancer
- **Health and Safety at Work Act 1974** — if services involve physical contact or premises-based delivery`;

const UK_PAYMENT_TERMS = `# Payment & Fee Terms — United Kingdom Supplement

## Currency

All transactions involving UK users are denominated in British Pounds Sterling (GBP) unless otherwise specified.

## VAT

Prices displayed to UK users are inclusive of Value Added Tax (VAT) at the applicable rate (currently 20%) where required. SpiriVerse will issue VAT invoices in compliance with UK VAT law.`;

const UK_IP_POLICY = `# Intellectual Property & DMCA Policy — United Kingdom Supplement

## UK Copyright Law

Copyright in the UK is governed by the Copyright, Designs and Patents Act 1988 (CDPA).

### Takedown Procedure

SpiriVerse operates a notice-and-takedown system consistent with the CDPA and the Electronic Commerce (EC Directive) Regulations 2002.

### Designated Contact

Copyright complaints relating to UK content may be directed to ip@spiriverse.com.`;

// ─────────────────────────────────────────────────────
// US Supplement Content
// ─────────────────────────────────────────────────────

const US_TERMS_OF_SERVICE = `# Terms of Service — United States Supplement

## Governing Law

These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the state and federal courts located in Delaware.

## Age Requirement

You must be at least 18 years old to use the Platform in the United States, or have the consent of a parent or legal guardian. Users under 13 are prohibited from using the Platform in accordance with the Children's Online Privacy Protection Act (COPPA).

## Arbitration Agreement

To the fullest extent permitted by applicable law, you and SpiriVerse agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved through binding individual arbitration under the Federal Arbitration Act, rather than in court. You waive the right to participate in a class action or class-wide arbitration.`;

const US_PRIVACY_POLICY = `# Privacy Policy — United States Supplement

## California Consumer Privacy Act (CCPA/CPRA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act (as amended by the CPRA):

- **Right to Know** — you may request the categories and specific pieces of personal information we have collected about you
- **Right to Delete** — you may request deletion of your personal information, subject to certain exceptions
- **Right to Opt-Out of Sale/Sharing** — you may opt out of the sale or sharing of your personal information
- **Right to Non-Discrimination** — we will not discriminate against you for exercising your CCPA rights
- **Right to Correct** — you may request correction of inaccurate personal information

### Do Not Sell or Share My Personal Information

SpiriVerse does not sell your personal information. To opt out of sharing for cross-context behavioural advertising, use the "Do Not Share" link in the website footer.

## Other US State Privacy Laws

SpiriVerse also complies with applicable state privacy laws including the Virginia CDPA, Colorado Privacy Act, Connecticut Data Privacy Act, and other state laws as they take effect.

### Contact

For US privacy requests: privacy@spiriverse.com.`;

const US_COOKIE_POLICY = `# Cookie Policy — United States Supplement

## US Cookie Requirements

While the United States does not have a comprehensive federal cookie law, certain state laws impose requirements regarding tracking technologies:

- **California (CCPA/CPRA)** — disclosure of cookies used for cross-context behavioural advertising and a "Do Not Share" opt-out
- **Virginia, Colorado, Connecticut** — similar opt-out rights for targeted advertising

SpiriVerse provides cookie preference controls accessible via the website footer.`;

const US_MERCHANT_TERMS = `# Partner Terms — United States Supplement

## Governing Law

This Agreement is governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions.

## US Consumer Protection

As a Partner operating in the US, you must comply with applicable federal and state consumer protection laws, including:

- **FTC Act** — prohibition on unfair or deceptive acts or practices
- **State consumer protection statutes** — varying by the state(s) in which you operate`;

const US_REFUND_POLICY = `# Refund & Returns Policy — United States Supplement

## US Consumer Rights

Refund and return rights in the United States are primarily governed by state law and individual seller policies. There is no federal mandatory cooling-off period for online purchases, though the FTC\u2019s Cooling-Off Rule applies to certain in-person sales.

### State-Specific Requirements

Some states require sellers to conspicuously post their refund policies. If no refund policy is posted, certain states provide consumers with a right to a full refund within a specified period (typically 20–30 days).

### Credit Card Disputes

Under the Fair Credit Billing Act, you may dispute charges with your credit card issuer within 60 days of the statement date for goods not received or not as described.`;

const US_ACCEPTABLE_USE = `# Acceptable Use Policy — United States Supplement

## US Legal Requirements

In addition to the general Acceptable Use Policy, users in the US must comply with:

- **Computer Fraud and Abuse Act (CFAA)** — prohibitions on unauthorised access to computer systems
- **CAN-SPAM Act** — requirements for commercial electronic messages
- **Digital Millennium Copyright Act (DMCA)** — prohibitions on circumventing copyright protection measures
- **Section 230 of the Communications Decency Act** — while SpiriVerse benefits from safe harbour protections, users remain liable for their own content`;

const US_SPIRITUAL_DISCLAIMER = `# Spiritual Services Disclaimer — United States Supplement

## US Regulatory Requirements

Practitioners offering spiritual services in the United States should be aware of:

- **FTC Act** — spiritual service claims must not be deceptive or unfair under Section 5
- **State licensing laws** — certain states may require licenses for services that could be construed as counselling or therapy
- **State consumer protection laws** — varying requirements regarding disclaimers and disclosures`;

const US_PAYMENT_TERMS = `# Payment & Fee Terms — United States Supplement

## Currency

All transactions involving US users are denominated in United States Dollars (USD) unless otherwise specified.

## Sales Tax

Sales tax is applied where required by state law. The applicable rate varies by state, county, and municipality. Tax amounts are displayed at checkout before payment is confirmed.

SpiriVerse uses automated tax calculation services to ensure compliance with state and local tax requirements.`;

const US_IP_POLICY = `# Intellectual Property & DMCA Policy — United States Supplement

## US Copyright Law — DMCA

Copyright in the United States is governed by the Copyright Act of 1976, as amended by the Digital Millennium Copyright Act (DMCA).

### DMCA Notice Procedure

If you believe your copyrighted work has been infringed, you may submit a DMCA takedown notice to our designated agent containing:

1. A physical or electronic signature of the copyright owner or authorised agent
2. Identification of the copyrighted work claimed to have been infringed
3. Identification of the material to be removed, with information sufficient to locate it
4. Your contact information (address, telephone number, email)
5. A statement of good-faith belief that the use is not authorised
6. A statement, under penalty of perjury, that the information is accurate and that you are the copyright owner or authorised agent

### Designated DMCA Agent

Email: ip@spiriverse.com

### Counter-Notification

If you believe your material was removed in error, you may submit a counter-notification as set forth in 17 U.S.C. § 512(g).`;

// ─────────────────────────────────────────────────────
// NZ Supplement Content
// ─────────────────────────────────────────────────────

const NZ_TERMS_OF_SERVICE = `# Terms of Service — New Zealand Supplement

## Governing Law

These Terms are governed by the laws of New Zealand. You agree to submit to the non-exclusive jurisdiction of the courts of New Zealand.

## Age Requirement

You must be at least 18 years old to use the Platform in New Zealand, or have the consent of a parent or legal guardian.

## Consumer Guarantees Act 1993

Nothing in these Terms excludes, restricts, or modifies any right or remedy, or any guarantee, right, or obligation, implied or imposed by the Consumer Guarantees Act 1993 (CGA) or any other statute that cannot be lawfully excluded or modified.

## Fair Trading Act 1986

SpiriVerse will not engage in conduct that is misleading or deceptive, or likely to mislead or deceive, in trade, in accordance with the Fair Trading Act 1986.

## Contract and Commercial Law Act 2017

These Terms constitute a contract governed by the Contract and Commercial Law Act 2017 (CCLA). Provisions of the CCLA relating to unfair contract terms in standard form consumer contracts apply.`;

const NZ_PRIVACY_POLICY = `# Privacy Policy — New Zealand Supplement

## Privacy Act 2020

SpiriVerse complies with the Privacy Act 2020 and the Information Privacy Principles (IPPs).

### Your Rights

Under the Privacy Act 2020, you have the right to:

- **Access** your personal information (IPP 6)
- **Correct** your personal information (IPP 7)
- **Request** that we stop using your personal information in certain circumstances

### Notifiable Privacy Breaches

Under Part 6 of the Privacy Act 2020, SpiriVerse will notify the Privacy Commissioner and affected individuals of any notifiable privacy breach that is likely to cause serious harm.

### Complaints

You may lodge a complaint with the New Zealand Privacy Commissioner at [privacy.org.nz](https://www.privacy.org.nz).

### Cross-Border Disclosure

Where we disclose personal information to overseas recipients, we take reasonable steps to ensure the information is protected (IPP 12).`;

const NZ_COOKIE_POLICY = `# Cookie Policy — New Zealand Supplement

## New Zealand Cookie Requirements

New Zealand does not have cookie-specific legislation. However, the Privacy Act 2020 (in particular IPP 1 — purpose of collection) requires that individuals be informed about the purpose for which their personal information is collected.

The Unsolicited Electronic Messages Act 2007 is relevant where cookies are used in connection with commercial electronic messages.

SpiriVerse provides cookie preference controls consistent with our global policy.`;

const NZ_MERCHANT_TERMS = `# Partner Terms — New Zealand Supplement

## Governing Law

This Agreement is governed by the laws of New Zealand. Both parties submit to the non-exclusive jurisdiction of the courts of New Zealand.

## New Zealand Consumer Law Obligations

As a Partner operating in New Zealand, you must comply with:

- **Consumer Guarantees Act 1993** — goods must be of acceptable quality, fit for purpose, and match their description; services must be carried out with reasonable care and skill
- **Fair Trading Act 1986** — prohibition on misleading and deceptive conduct in trade
- **Contract and Commercial Law Act 2017** — unfair contract terms provisions`;

const NZ_REFUND_POLICY = `# Refund & Returns Policy — New Zealand Supplement

## Consumer Guarantees Act 1993

New Zealand consumers have rights under the Consumer Guarantees Act 1993 that cannot be excluded or limited.

### Right to Reject

If goods fail to meet a consumer guarantee, you have the right to reject the goods within a reasonable time if the failure is substantial.

### Remedies

- **Substantial failure**: you may reject the goods and choose a refund or replacement
- **Non-substantial failure**: the supplier may choose to repair, replace, or refund

### Services

Services must be carried out with reasonable care and skill, be fit for any particular purpose communicated, and be completed within a reasonable time.

### No Mandatory Online Cooling-Off Period

New Zealand does not have a mandatory cooling-off period for online purchases (unlike the UK). However, individual Partners may offer voluntary return periods.`;

const NZ_ACCEPTABLE_USE = `# Acceptable Use Policy — New Zealand Supplement

## New Zealand Legal Requirements

In addition to the general Acceptable Use Policy, users in New Zealand must comply with:

- **Harmful Digital Communications Act 2015** — prohibitions on harmful digital communications including online harassment, intimidation, and hate speech
- **Films, Videos, and Publications Classification Act 1993** — prohibitions on objectionable content
- **Crimes Act 1961** — relevant computer crime provisions`;

const NZ_SPIRITUAL_DISCLAIMER = `# Spiritual Services Disclaimer — New Zealand Supplement

## New Zealand Regulatory Requirements

Practitioners offering spiritual services in New Zealand should be aware of:

- **Fair Trading Act 1986** — claims about spiritual services must not be misleading or deceptive in trade
- **Health Practitioners Competence Assurance Act 2003** — spiritual services must not claim to diagnose, treat, or cure any health condition unless the practitioner is a registered health practitioner under this Act
- **Consumer Guarantees Act 1993** — services must be carried out with reasonable care and skill`;

const NZ_PAYMENT_TERMS = `# Payment & Fee Terms — New Zealand Supplement

## Currency

All transactions involving New Zealand users are denominated in New Zealand Dollars (NZD) unless otherwise specified.

## GST

Prices displayed to New Zealand users are inclusive of Goods and Services Tax (GST) at the applicable rate (currently 15%) where required by the Goods and Services Tax Act 1985.

SpiriVerse will issue tax invoices in compliance with NZ GST law.

## Credit Contracts and Consumer Finance Act 2003

Where applicable, SpiriVerse complies with the disclosure requirements of the Credit Contracts and Consumer Finance Act 2003 (CCCFA).`;

const NZ_IP_POLICY = `# Intellectual Property & DMCA Policy — New Zealand Supplement

## New Zealand Copyright Law

Copyright in New Zealand is governed by the Copyright Act 1994 and the Copyright (New Technologies) Amendment Act 2008.

### Internet Service Provider Liability

The Copyright (New Technologies) Amendment Act 2008 introduced a graduated response regime for online copyright infringement. SpiriVerse operates a notice-and-takedown system consistent with this Act.

### Takedown Procedure

Copyright complaints relating to New Zealand content may be directed to ip@spiriverse.com.`;

// ─────────────────────────────────────────────────────
// Content lookup table
// ─────────────────────────────────────────────────────

const SUPPLEMENT_CONTENT: Record<string, string> = {
    // AU
    "terms-of-service::AU": AU_TERMS_OF_SERVICE,
    "privacy-policy::AU": AU_PRIVACY_POLICY,
    "cookie-policy::AU": AU_COOKIE_POLICY,
    "merchant-terms::AU": AU_MERCHANT_TERMS,
    "refund-policy::AU": AU_REFUND_POLICY,
    "acceptable-use-policy::AU": AU_ACCEPTABLE_USE,
    "spiritual-services-disclaimer::AU": AU_SPIRITUAL_DISCLAIMER,
    "payment-terms::AU": AU_PAYMENT_TERMS,
    "intellectual-property-policy::AU": AU_IP_POLICY,
    // UK
    "terms-of-service::UK": UK_TERMS_OF_SERVICE,
    "privacy-policy::UK": UK_PRIVACY_POLICY,
    "cookie-policy::UK": UK_COOKIE_POLICY,
    "merchant-terms::UK": UK_MERCHANT_TERMS,
    "refund-policy::UK": UK_REFUND_POLICY,
    "acceptable-use-policy::UK": UK_ACCEPTABLE_USE,
    "spiritual-services-disclaimer::UK": UK_SPIRITUAL_DISCLAIMER,
    "payment-terms::UK": UK_PAYMENT_TERMS,
    "intellectual-property-policy::UK": UK_IP_POLICY,
    // US
    "terms-of-service::US": US_TERMS_OF_SERVICE,
    "privacy-policy::US": US_PRIVACY_POLICY,
    "cookie-policy::US": US_COOKIE_POLICY,
    "merchant-terms::US": US_MERCHANT_TERMS,
    "refund-policy::US": US_REFUND_POLICY,
    "acceptable-use-policy::US": US_ACCEPTABLE_USE,
    "spiritual-services-disclaimer::US": US_SPIRITUAL_DISCLAIMER,
    "payment-terms::US": US_PAYMENT_TERMS,
    "intellectual-property-policy::US": US_IP_POLICY,
    // NZ
    "terms-of-service::NZ": NZ_TERMS_OF_SERVICE,
    "privacy-policy::NZ": NZ_PRIVACY_POLICY,
    "cookie-policy::NZ": NZ_COOKIE_POLICY,
    "merchant-terms::NZ": NZ_MERCHANT_TERMS,
    "refund-policy::NZ": NZ_REFUND_POLICY,
    "acceptable-use-policy::NZ": NZ_ACCEPTABLE_USE,
    "spiritual-services-disclaimer::NZ": NZ_SPIRITUAL_DISCLAIMER,
    "payment-terms::NZ": NZ_PAYMENT_TERMS,
    "intellectual-property-policy::NZ": NZ_IP_POLICY,
};

// ─────────────────────────────────────────────────────
// Main migration
// ─────────────────────────────────────────────────────

export const migration: Migration = {
    id: "038_seed_country_supplements",
    description:
        "Seed country supplement documents for AU, UK, US, and NZ across all 9 document types (36 supplements). NZ supplements are seeded as drafts pending legal review.",

    async up(context: MigrationContext) {
        const now = new Date().toISOString();

        // Check which supplements already exist
        const existing = await context.runQuery<{ id: string }>(
            "System-Settings",
            "SELECT c.id FROM c WHERE c.docType = 'legal-document' AND IS_DEFINED(c.parentDocumentId)"
        );
        const existingIds = new Set(existing.map((d) => d.id));

        const records: Record<string, any>[] = [];
        let skipped = 0;

        for (const documentType of DOCUMENT_TYPES) {
            for (const market of MARKETS) {
                const id = `${documentType}-${market}`;

                if (existingIds.has(id)) {
                    context.log(`Skipping ${id} — already exists`);
                    skipped++;
                    continue;
                }

                const title = `${TITLE_LABELS[documentType]} — ${MARKET_NAMES[market]} Supplement`;
                const content = getSupplementContent(documentType, market);
                const isNZ = market === "NZ";

                records.push({
                    id,
                    docType: "legal-document",
                    documentType,
                    title,
                    content,
                    market,
                    parentDocumentId: documentType, // Links to the base document ID
                    supplementOrder: MARKETS.indexOf(market) + 1,
                    version: 1,
                    isPublished: !isNZ, // NZ is draft
                    effectiveDate: now,
                    changeSummary: isNZ
                        ? "Initial NZ supplement (draft — pending legal review)"
                        : "Initial country supplement",
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "migration-038",
                    status: "ACTIVE",
                });
            }
        }

        if (records.length === 0) {
            context.log(`All ${skipped} supplements already exist — nothing to seed`);
            return;
        }

        context.log(`Seeding ${records.length} country supplement documents (${skipped} already existed)...\n`);

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: records as any[],
            upsert: true,
        });

        const nzCount = records.filter((r) => r.market === "NZ").length;
        const publishedCount = records.length - nzCount;

        context.log(`\n✓ Seeded ${records.length} country supplements:`);
        context.log(`  — ${publishedCount} published (AU, UK, US)`);
        context.log(`  — ${nzCount} draft (NZ — pending legal review)`);
    },
};
