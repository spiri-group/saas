'use server';

import twilio from "twilio";
import { vault } from "./vault";
import { sender_details } from "@/utils/email_templates";
import { sendRawHtmlEmail } from "./acsEmail";

const cache = new Map<string, { otp: string; expires: Date }>();

// Test mode helpers
const isTestEmail = (email: string) =>
    process.env.NODE_ENV !== 'production' && email.toLowerCase().endsWith('@playwright.com');

// Test phone numbers: Australian format starting with +61400000 (e.g., +61400000123)
const isTestPhone = (phone: string) =>
    process.env.NODE_ENV !== 'production' && phone.replace(/\s/g, '').startsWith('+61400000');

export const generateOTP = async (subject: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(new Date().getTime() + 3 * 60000); // Current time + 3 minutes
    cache.set(subject, { otp, expires });
    return otp;
}

export const verifyOTP = async (payload: {
    email?: string,
    phone?: string,
    otp: string
}) => {
    if (payload.email == null && payload.phone == null) {
        throw `You must provide an email or phone number`
    }

    const subject = payload.email == null ? payload.phone : payload.email

    if (subject == null) {
        throw `Could not determine who's otp we're verifying`
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

    const otpEntry = cache.get(subject);
    if (!otpEntry) return false;

    const { otp: cachedOtp, expires } = otpEntry;
    const now = new Date();

    if (now > expires) {
        cache.delete(subject); // Optionally clear expired OTP
        return false;
    }

    return cachedOtp === payload.otp;
}

export const clearOTP = async (email: string) => {
    cache.delete(email);
}

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
