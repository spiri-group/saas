import { EmailTemplate } from "./types";

const EMAIL_CONTAINER = 'System-Settings';
const EMAIL_PARTITION = 'email-template';

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
 * Render an email template with variables
 * @param dataSources - Cosmos data source
 * @param templateId - Template ID
 * @param variables - Object with variable values
 * @returns Object with subject and html, or null if template not found
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
  const html = replaceVariables(template.html, variables);

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
