'use server';

import twilio from "twilio";
import { vault } from "./vault";
import { sender_details } from "@/utils/email_templates";
import { sendRawHtmlEmail } from "./acsEmail";
import azure_identity from "./azure_identity";
import { AzureNamedKeyCredential, TableClient, RestError } from "@azure/data-tables";
import { createHash, randomInt } from "crypto";

// ---------------------------------------------------------------------------
// Azure Table Storage client (lazy singleton — deferred because 'use server'
// modules don't reliably run module-level side-effects like auth.ts does)
// ---------------------------------------------------------------------------

let _tableClient: TableClient | null = null;

const getTableClient = () => {
    if (!_tableClient) {
        const { env_name, env_index } = azure_identity();
        const storagename = `stspvapp${env_name}${env_index}`;
        const credential = new AzureNamedKeyCredential(storagename, process.env.AUTH_AZURE_ACCESS_KEY as string);
        _tableClient = new TableClient(`https://${storagename}.table.core.windows.net`, "otp", credential);
    }
    return _tableClient;
};

// Ensure the table exists (runs once, cached promise)
let tableReady: Promise<void> | null = null;
const ensureTable = () => {
    if (!tableReady) {
        const client = getTableClient();
        tableReady = client.createTable().catch((err: unknown) => {
            // 409 = table already exists, which is fine
            if (err instanceof RestError && err.statusCode === 409) return;
            tableReady = null; // retry on real errors
            throw err;
        });
    }
    return tableReady;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hashOtp = (otp: string): string =>
    createHash('sha256').update(otp).digest('hex');

const normalizeSubject = (subject: string): string =>
    subject.toLowerCase().replace(/\s/g, '');

const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 3 * 60_000; // 3 minutes
const RATE_WINDOW_MS = 10 * 60_000; // 10 minutes
const MAX_GENERATIONS = 3;

// ---------------------------------------------------------------------------
// Test mode helpers
// ---------------------------------------------------------------------------

const isTestEmail = (email: string) =>
    process.env.NODE_ENV !== 'production' && email.toLowerCase().endsWith('@playwright.com');

const isTestPhone = (phone: string) =>
    process.env.NODE_ENV !== 'production' && phone.replace(/\s/g, '').startsWith('+61400000');

const DEMO_EMAILS = [
    "awaken@spirigroup.com",
    "illuminate@spirigroup.com",
    "manifest@spirigroup.com",
    "transcend@spirigroup.com",
];
const isDemoEmail = (email: string) => DEMO_EMAILS.includes(email.toLowerCase());

// ---------------------------------------------------------------------------
// Core OTP functions
// ---------------------------------------------------------------------------

export const generateOTP = async (subject: string) => {
    await ensureTable();
    const pk = normalizeSubject(subject);

    // --- Rate limiting: count gen_* rows in the last 10 minutes ---
    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const rateEntities = getTableClient().listEntities<{ createdAt: string }>({
        queryOptions: {
            filter: `PartitionKey eq '${pk}' and RowKey ge 'gen_' and RowKey lt 'gen_~' and createdAt ge '${windowStart}'`,
        },
    });

    let genCount = 0;
    for await (const _ of rateEntities) {
        genCount++;
        if (genCount >= MAX_GENERATIONS) {
            throw new Error("Too many verification code requests. Please wait a few minutes before trying again.");
        }
    }

    // --- Generate cryptographically-secure OTP ---
    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    // Upsert the OTP entity (overwrites any previous OTP for this subject)
    await getTableClient().upsertEntity({
        partitionKey: pk,
        rowKey: "current",
        otpHash: hashOtp(otp),
        expiresAt,
        attempts: 0,
    }, "Replace");

    // Record rate-limit entry
    const now = Date.now();
    await getTableClient().upsertEntity({
        partitionKey: pk,
        rowKey: `gen_${now}`,
        createdAt: new Date(now).toISOString(),
    }, "Replace");

    // Fire-and-forget: clean up expired rate-limit entries
    cleanupExpiredRateLimitEntries(pk).catch(() => { /* best-effort */ });

    return otp;
};

export const verifyOTP = async (payload: {
    email?: string,
    phone?: string,
    otp: string
}) => {
    if (payload.email == null && payload.phone == null) {
        throw `You must provide an email or phone number`;
    }

    const subject = payload.email == null ? payload.phone : payload.email;

    if (subject == null) {
        throw `Could not determine who's otp we're verifying`;
    }

    // Test mode: for @playwright.com emails or test phone numbers in non-production
    // 000000 = always fail (for testing error handling, like Stripe test cards)
    // Any other 6-digit code = always succeed (bypass actual OTP check)
    const isTest = (payload.email && isTestEmail(payload.email)) ||
                   (payload.phone && isTestPhone(payload.phone));
    if (isTest) {
        console.log(`[OTP] Test mode for: ${payload.email || payload.phone}`);
        return payload.otp !== '000000';
    }

    await ensureTable();
    const pk = normalizeSubject(subject);

    // Point-read the current OTP entity
    let entity;
    try {
        entity = await getTableClient().getEntity<{
            otpHash: string;
            expiresAt: string;
            attempts: number;
        }>(pk, "current");
    } catch (err: unknown) {
        if (err instanceof RestError && err.statusCode === 404) return false;
        throw err;
    }

    const { otpHash, expiresAt, attempts, etag } = entity;

    // Check expiry
    if (new Date() > new Date(expiresAt as string)) {
        await deleteEntity(pk, "current");
        return false;
    }

    // Check brute-force limit
    if ((attempts as number) >= MAX_ATTEMPTS) {
        await deleteEntity(pk, "current");
        return false;
    }

    // Increment attempts with optimistic concurrency (etag)
    try {
        await getTableClient().updateEntity(
            { partitionKey: pk, rowKey: "current", attempts: (attempts as number) + 1 },
            "Merge",
            { etag: etag as string }
        );
    } catch (err: unknown) {
        // 412 = concurrent modification, play it safe and reject
        if (err instanceof RestError && err.statusCode === 412) return false;
        throw err;
    }

    // Compare hashes
    if (hashOtp(payload.otp) !== otpHash) {
        return false;
    }

    // Success — delete the entity so the OTP can't be reused
    await deleteEntity(pk, "current");
    return true;
};

export const clearOTP = async (email: string) => {
    await ensureTable();
    await deleteEntity(normalizeSubject(email), "current");
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function deleteEntity(pk: string, rk: string) {
    try {
        await getTableClient().deleteEntity(pk, rk);
    } catch (err: unknown) {
        // 404 = already gone, that's fine
        if (err instanceof RestError && err.statusCode === 404) return;
        throw err;
    }
}

async function cleanupExpiredRateLimitEntries(pk: string) {
    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const expired = getTableClient().listEntities<{ createdAt: string }>({
        queryOptions: {
            filter: `PartitionKey eq '${pk}' and RowKey ge 'gen_' and RowKey lt 'gen_~' and createdAt lt '${windowStart}'`,
        },
    });
    for await (const entity of expired) {
        await deleteEntity(pk, entity.rowKey as string);
    }
}

// ---------------------------------------------------------------------------
// Email / SMS sending (unchanged)
// ---------------------------------------------------------------------------

function buildOtpEmailHtml(otp: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">SpiriVerse</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;color:#374151;font-size:16px;">Your verification code is:</p>
          <div style="margin:24px 0;text-align:center;background-color:#f5f3ff;border:2px solid #e9d5ff;border-radius:8px;padding:20px;">
            <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#6d28d9;">${otp}</span>
          </div>
          <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">This code expires in <strong>3 minutes</strong>.</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">If you didn&apos;t request this code, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#fafafa;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">SpiriVerse &mdash; Spiritual Services Marketplace</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const sendOTP = async (to: string, otp: string, strategy: 'email' | 'phone') => {
    // Skip sending OTP to test users in non-production
    const isTest = (strategy === 'email' && isTestEmail(to)) ||
                   (strategy === 'phone' && isTestPhone(to));
    if (isTest) {
        console.log(`[OTP] Skipping OTP send to test user: ${to}`);
        return true;
    }

    // Skip sending OTP to demo accounts (no real inboxes)
    if (strategy === 'email' && isDemoEmail(to)) {
        console.log(`[OTP] Skipping OTP send to demo account: ${to}`);
        return true;
    }

    if (strategy === 'email') {
        const subject = "Your SpiriVerse Verification Code";
        const html = buildOtpEmailHtml(otp);
        await sendRawHtmlEmail(to, subject, html);
    } else if (strategy === 'phone') {
        const keyvault = new vault();
        const accountSid = await keyvault.getSecret("twilio-account-sid");
        const authToken = await keyvault.getSecret("twilio-auth-token");

        if (accountSid == null || authToken == null) {
            throw new Error("Twilio credentials not found in keyvault");
        }

        const client = twilio(accountSid, authToken);
        const from = sender_details.phone.default;
        const message = await client.messages.create({
            body: `Your SpiriVerse Verification Code is: ${otp}`,
            from, to
        });

        console.debug(message);
    }

    return true;
}

export const generateAndSendOTP = async (payload: {
    to: string, strategy: 'email' | 'phone'
}) => {
    const { to, strategy } = payload;
    const otp = await generateOTP(to);
    await sendOTP(to, otp, strategy);
    return otp;
}
