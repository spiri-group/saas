import { EmailClient, EmailMessage, KnownEmailSendStatus } from "@azure/communication-email";
import { DefaultAzureCredential } from "@azure/identity";
import { LogManager, shouldSkipEmail } from "../utils/functions";
import { vault } from "./vault";
import { renderEmailTemplate } from "../graphql/email/utils";

// ACS endpoints and sender domains by environment
const ACS_CONFIG = {
    dev: {
        endpoint: "https://acs-spiriverse-server-dev-002.australia.communication.azure.com",
        senderDomain: "2d6f6e5a-e5cb-4020-85ed-96b14fdeba0d.azurecomm.net"
    },
    prod: {
        endpoint: "https://acs-spiriverse-server-prd-002.australia.communication.azure.com",
        senderDomain: "d00865ac-d925-4c14-b38f-cc20f57391e6.azurecomm.net"
    }
};

export class AzureEmailDataSource {
    private client: EmailClient | null = null;
    private logger: LogManager;
    private vault: vault;
    private senderDomain: string;
    private dataSources: any = null;

    constructor(log: LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
        this.senderDomain = ACS_CONFIG.dev.senderDomain;
    }

    async init(host: string) {
        // Determine environment from host (same pattern as other services)
        const isProd = host.includes("prd") || host.includes("prod");
        const config = isProd ? ACS_CONFIG.prod : ACS_CONFIG.dev;
        this.senderDomain = config.senderDomain;

        // Use managed identity for authentication (no connection string needed)
        const credential = new DefaultAzureCredential();
        this.client = new EmailClient(config.endpoint, credential);
    }

    /**
     * Set the dataSources reference for Cosmos template lookups
     * Call this after all dataSources are initialized
     */
    setDataSources(dataSources: any) {
        this.dataSources = dataSources;
    }

    /**
     * Get the default sender address for ACS
     * Uses DoNotReply@ with the Azure Managed Domain
     */
    private getSenderAddress(): string {
        return `DoNotReply@${this.senderDomain}`;
    }

    /**
     * Convert legacy SCREAMING_SNAKE_CASE template names to kebab-case
     * Also strips SendGrid template IDs (d-xxx)
     */
    private normalizeTemplateId(templateId: string): string {
        // If it's a SendGrid template ID (starts with d-), throw an error
        if (templateId.startsWith('d-')) {
            throw new Error(`AzureEmail :: SendGrid template ID '${templateId}' is not supported. Please migrate to Cosmos templates.`);
        }

        // Convert SCREAMING_SNAKE_CASE to kebab-case
        // e.g., MERCHANT_REQUEST -> merchant-request
        return templateId.toLowerCase().replace(/_/g, '-');
    }

    /**
     * Send email to multiple recipients
     * Compatible with legacy SendGrid interface
     */
    async sendEmailToMany<T>(
        from: string,
        to: T[],
        templateId: string,
        variables: Record<string, any>,
        emailExtract: (data: T) => string
    ) {
        for (const obj of to) {
            await this.sendEmail(from, emailExtract(obj), templateId, variables);
        }
    }

    /**
     * Send a templated email using Cosmos-stored templates
     * @param from - Sender email address (ignored, uses ACS managed domain)
     * @param to - Recipient email address
     * @param templateId - Template ID from Cosmos DB
     * @param variables - Variables to replace in the template
     * @param dataSources - DataSources object containing cosmos
     * @param cc - Optional CC recipients
     * @param bcc - Optional BCC recipients
     */
    /**
     * Send a templated email using Cosmos-stored templates
     * Compatible with legacy SendGrid interface: sendEmail(from, to, templateId, variables, cc?, bcc?)
     * @param from - Sender email address (ignored, uses ACS managed domain)
     * @param to - Recipient email address
     * @param templateId - Template ID (supports SCREAMING_SNAKE_CASE or kebab-case)
     * @param variables - Variables to replace in the template
     * @param cc - Optional CC recipients
     * @param bcc - Optional BCC recipients
     */
    async sendEmail(
        from: string,
        to: string,
        templateId: string,
        variables: Record<string, any>,
        cc: string[] = [],
        bcc: string[] = []
    ): Promise<boolean> {
        // Skip sending emails to Playwright test users
        if (shouldSkipEmail(to)) {
            this.logger.logMessage(`AzureEmail :: Skipping email to Playwright test user: ${to}`);
            return true;
        }

        if (!this.client) {
            throw new Error("AzureEmail :: client needs to be initialized before calling");
        }

        if (!this.dataSources) {
            throw new Error("AzureEmail :: dataSources not set. Call setDataSources() after initialization.");
        }

        // Normalize template ID (convert SCREAMING_SNAKE_CASE to kebab-case)
        const normalizedTemplateId = this.normalizeTemplateId(templateId);

        // Render the template from Cosmos DB
        const rendered = await renderEmailTemplate(this.dataSources, normalizedTemplateId, variables);
        if (!rendered) {
            throw new Error(`AzureEmail :: Template '${normalizedTemplateId}' not found or inactive. Please create this template in Cosmos DB.`);
        }

        return this.sendRawHtmlEmail(from, to, rendered.subject, rendered.html, cc, bcc);
    }

    /**
     * Send a raw HTML email (for pre-rendered content)
     * @param from - Sender email address (ignored, uses ACS managed domain)
     * @param to - Recipient email address
     * @param subject - Email subject
     * @param html - Email HTML content
     * @param cc - Optional CC recipients
     * @param bcc - Optional BCC recipients
     */
    async sendRawHtmlEmail(
        from: string,
        to: string,
        subject: string,
        html: string,
        cc: string[] = [],
        bcc: string[] = []
    ): Promise<boolean> {
        // Skip sending emails to Playwright test users
        if (shouldSkipEmail(to)) {
            this.logger.logMessage(`AzureEmail :: Skipping email to Playwright test user: ${to}`);
            return true;
        }

        if (!this.client) {
            throw new Error("AzureEmail :: client needs to be initialized before calling");
        }

        try {
            const message: EmailMessage = {
                senderAddress: this.getSenderAddress(),
                content: {
                    subject: subject,
                    html: html
                },
                recipients: {
                    to: [{ address: to }]
                }
            };

            // Add CC recipients if provided
            if (cc.length > 0) {
                message.recipients.cc = cc.map(email => ({ address: email }));
            }

            // Add BCC recipients if provided
            if (bcc.length > 0) {
                message.recipients.bcc = bcc.map(email => ({ address: email }));
            }

            // Begin sending the email
            const poller = await this.client.beginSend(message);

            // Wait for the operation to complete
            const result = await poller.pollUntilDone();

            if (result.status === KnownEmailSendStatus.Succeeded) {
                return true;
            } else {
                this.logger.logMessage(`AzureEmail :: Email send failed with status: ${result.status}`);
                throw new Error(`Failed to send email to ${to}, status: ${result.status}`);
            }
        } catch (error) {
            this.logger.logMessage(`AzureEmail :: Failed to send email to ${to}: ${error}`);
            throw new Error(`Failed to send email to ${to}`);
        }
    }
}
