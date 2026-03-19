import { EmailTemplate, EmailHeaderFooter } from "./types";
import { renderStructureToHtml } from "./structureRenderer";

const EMAIL_CONTAINER = 'System-Settings';
const EMAIL_PARTITION = 'email-template';
const HEADER_FOOTER_PARTITION = 'email-header-footer';

/**
 * Fetch an email template from the database
 * @param dataSources - Cosmos data source
 * @param templateId - Template ID (e.g., "refund-approved")
 * @returns EmailTemplate or null if not found
 */
export const fetchEmailTemplate = async (
  dataSources: any,
  templateId: string
): Promise<EmailTemplate | null> => {
  try {
    const template = await dataSources.cosmos.get_record(
      EMAIL_CONTAINER,
      templateId,
      EMAIL_PARTITION
    );

    if (!template || !template.isActive) {
      console.warn(`Email template ${templateId} not found or inactive`);
      return null;
    }

    return template as EmailTemplate;
  } catch (error) {
    console.error(`Failed to fetch email template ${templateId}:`, error);
    return null;
  }
};

/**
 * Replace variables in a string using {{variableName}} syntax
 * @param text - Text containing {{variables}}
 * @param variables - Object with variable values
 * @returns Text with variables replaced
 */
export const replaceVariables = (
  text: string,
  variables: Record<string, any>
): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    if (variableName in variables) {
      const value = variables[variableName];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Convert to string
      return String(value);
    }
    // Keep the placeholder if variable not provided
    return match;
  });
};

/**
 * Fetch the default header or footer from the database
 */
const fetchDefaultHeaderFooter = async (
  dataSources: any,
  type: 'header' | 'footer'
): Promise<EmailHeaderFooter | null> => {
  try {
    const results = await dataSources.cosmos.run_query(
      EMAIL_CONTAINER,
      {
        query: `SELECT * FROM c WHERE c.docType = 'email-header-footer' AND c.type = @type AND c.isDefault = true`,
        parameters: [{ name: '@type', value: type }],
      },
      true
    );
    return results.length > 0 ? results[0] as EmailHeaderFooter : null;
  } catch {
    return null;
  }
};

/**
 * Fetch a specific header or footer by ID
 */
const fetchHeaderFooter = async (
  dataSources: any,
  id: string
): Promise<EmailHeaderFooter | null> => {
  try {
    return await dataSources.cosmos.get_record(
      EMAIL_CONTAINER,
      id,
      HEADER_FOOTER_PARTITION
    ) as EmailHeaderFooter;
  } catch {
    return null;
  }
};

/**
 * Render header/footer content (EmailStructure JSON) to HTML
 */
const renderHeaderFooterHtml = (headerFooter: EmailHeaderFooter | null): string => {
  if (!headerFooter || !headerFooter.content) return '';
  return renderStructureToHtml(headerFooter.content);
};

/**
 * Wraps body HTML with header and footer in a full email document.
 */
const wrapWithHeaderFooter = (bodyHtml: string, headerHtml: string, footerHtml: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
${headerHtml ? `<tr><td>${headerHtml}</td></tr>` : ''}
<tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
${footerHtml ? `<tr><td style="border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;color:#94a3b8;font-size:13px;">${footerHtml}</td></tr>` : ''}
</table>
</td></tr>
</table>
</body>
</html>`;
};

/**
 * Render an email template with variables.
 * Applies the template's header/footer (or the default ones) around the body.
 * Self-contained templates (starting with <!DOCTYPE) are returned as-is.
 */
export const renderEmailTemplate = async (
  dataSources: any,
  templateId: string,
  variables: Record<string, any>
): Promise<{ subject: string; html: string } | null> => {
  const template = await fetchEmailTemplate(dataSources, templateId);

  if (!template) {
    return null;
  }

  const subject = replaceVariables(template.subject, variables);
  let rawHtml = replaceVariables(template.html, variables);

  // If the template is already a self-contained HTML document, return as-is
  if (rawHtml.trimStart().startsWith('<!DOCTYPE') || rawHtml.trimStart().startsWith('<html')) {
    return { subject, html: rawHtml };
  }

  // Template is EmailStructure JSON — render it to HTML
  if (rawHtml.trimStart().startsWith('<!-- Email Structure -->') || rawHtml.trimStart().startsWith('{')) {
    rawHtml = renderStructureToHtml(rawHtml);
  }

  // Fetch header and footer
  const [header, footer] = await Promise.all([
    template.headerId
      ? fetchHeaderFooter(dataSources, template.headerId)
      : fetchDefaultHeaderFooter(dataSources, 'header'),
    template.footerId
      ? fetchHeaderFooter(dataSources, template.footerId)
      : fetchDefaultHeaderFooter(dataSources, 'footer'),
  ]);

  const headerHtml = renderHeaderFooterHtml(header);
  const footerHtml = renderHeaderFooterHtml(footer);

  const html = wrapWithHeaderFooter(rawHtml, headerHtml, footerHtml);
  return { subject, html };
};

/**
 * Validate that all required variables are provided
 * @param template - Email template
 * @param variables - Provided variables
 * @returns Array of missing variable names
 */
export const validateTemplateVariables = (
  template: EmailTemplate,
  variables: Record<string, any>
): string[] => {
  const missing: string[] = [];

  for (const varName of template.variables) {
    if (!(varName in variables)) {
      missing.push(varName);
    }
  }

  return missing;
};

/**
 * Fetch and render email template with validation
 * @param dataSources - Cosmos data source
 * @param templateId - Template ID
 * @param variables - Object with variable values
 * @param throwOnMissing - Whether to throw error if variables missing (default: true)
 * @returns Object with subject and html
 * @throws Error if template not found or variables missing
 */
export const renderEmailTemplateWithValidation = async (
  dataSources: any,
  templateId: string,
  variables: Record<string, any>,
  throwOnMissing: boolean = true
): Promise<{ subject: string; html: string }> => {
  const template = await fetchEmailTemplate(dataSources, templateId);

  if (!template) {
    throw new Error(`Email template '${templateId}' not found or inactive`);
  }

  const missingVars = validateTemplateVariables(template, variables);

  if (missingVars.length > 0 && throwOnMissing) {
    throw new Error(
      `Missing required variables for email template '${templateId}': ${missingVars.join(', ')}`
    );
  }

  if (missingVars.length > 0) {
    console.warn(
      `Missing variables for email template '${templateId}': ${missingVars.join(', ')}`
    );
  }

  const subject = replaceVariables(template.subject, variables);
  const html = replaceVariables(template.html, variables);

  return { subject, html };
};
