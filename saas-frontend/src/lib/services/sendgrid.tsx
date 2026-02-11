'use server';

import { sendEmail, type EmailAttachment } from "./acsEmail";

type SendEmailProps = {
    to: string[];
    subject: string;
    body?: string;
    cc?: string[];
    attachments?: EmailAttachment[];
};

export default async function SendEmail(props: SendEmailProps) {
    const html = props.body
        ? `<p>${props.body}</p>`
        : `<p>Please find the attached document.</p>`;

    try {
        await sendEmail({
            to: props.to,
            subject: props.subject,
            html,
            cc: props.cc,
            attachments: props.attachments,
        });
        return { success: true };
    } catch (error) {
        return { success: false, error };
    }
}
