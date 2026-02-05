'use server';

import { EmailClient, EmailMessage, KnownEmailSendStatus } from "@azure/communication-email";
import { DefaultAzureCredential } from "@azure/identity";
import azure_environment from "./azure_environment";

const ACS_CONFIG: Record<string, { endpoint: string; senderDomain: string }> = {
    dev: {
        endpoint: "https://acs-spiriverse-server-dev-002.australia.communication.azure.com",
        senderDomain: "2d6f6e5a-e5cb-4020-85ed-96b14fdeba0d.azurecomm.net"
    },
    prd: {
        endpoint: "https://acs-spiriverse-server-prd-002.australia.communication.azure.com",
        senderDomain: "d00865ac-d925-4c14-b38f-cc20f57391e6.azurecomm.net"
    }
};

let clientInstance: EmailClient | null = null;
let currentEnv: string | null = null;

function getConfig() {
    const env = azure_environment();
    const envName = env?.env_name === "prd" ? "prd" : "dev";
    return { envName, ...ACS_CONFIG[envName] };
}

function getClient(): EmailClient {
    const { envName, endpoint } = getConfig();
    if (!clientInstance || currentEnv !== envName) {
        const credential = new DefaultAzureCredential();
        clientInstance = new EmailClient(endpoint, credential);
        currentEnv = envName;
    }
    return clientInstance;
}

export type EmailAttachment = {
    content: string;       // base64-encoded content
    filename: string;
    contentType: string;   // MIME type e.g. "application/pdf"
};

export type SendEmailOptions = {
    to: string[];
    subject: string;
    html: string;
    cc?: string[];
    attachments?: EmailAttachment[];
};

export async function sendRawHtmlEmail(to: string, subject: string, html: string): Promise<boolean> {
    return sendEmail({ to: [to], subject, html });
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { senderDomain } = getConfig();
    const client = getClient();

    const message: EmailMessage = {
        senderAddress: `DoNotReply@${senderDomain}`,
        content: { subject: options.subject, html: options.html },
        recipients: {
            to: options.to.map(address => ({ address }))
        }
    };

    if (options.cc?.length) {
        message.recipients.cc = options.cc.map(address => ({ address }));
    }

    if (options.attachments?.length) {
        message.attachments = options.attachments.map(a => ({
            name: a.filename,
            contentType: a.contentType,
            contentInBase64: a.content
        }));
    }

    const poller = await client.beginSend(message);
    const result = await poller.pollUntilDone();

    if (result.status === KnownEmailSendStatus.Succeeded) {
        return true;
    }

    throw new Error(`Failed to send email, status: ${result.status}`);
}
