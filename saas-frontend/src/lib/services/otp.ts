'use server';

import twilio from "twilio";
import sendgrid from "@sendgrid/mail";
import { vault } from "./vault";
import email_templates, { sender_details } from "@/utils/email_templates";

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

export const sendOTP = async (to: string, otp: string, strategy: 'email' | 'phone') => {
    // Skip sending OTP to test users in non-production
    const isTest = (strategy === 'email' && isTestEmail(to)) ||
                   (strategy === 'phone' && isTestPhone(to));
    if (isTest) {
        console.log(`[OTP] Skipping OTP send to test user: ${to}`);
        return true;
    }

    const keyvault = new vault();

    if (strategy === 'email') {
        const key_name = "sendgrid-api-key"
        const keyvault_key = await keyvault.getSecret(key_name);
        if (keyvault_key == null) {
            throw new Error(`${key_name} not found in keyvault`);
        }
        sendgrid.setApiKey(keyvault_key);

        const templateId = email_templates.get('VERIFICATION_CODE') as string;
        const resp = await sendgrid.send({   
            from: sender_details.from, to,
            dynamicTemplateData: {
                otp, subject: to
            },
            templateId
        })

        console.debug(resp);
    } else if (strategy === 'phone') {
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
