# Email Template System

Email templates are stored in the `System-Settings` container with `docType: "email-template"` and partition key `email-templates`.

## GraphQL API

### Queries

```graphql
# Get all email templates
query {
  emailTemplates {
    id
    name
    subject
    html
    variables
    category
    description
    isActive
    createdAt
    updatedAt
    updatedBy
  }
}

# Get templates by category
query {
  emailTemplates(category: "order") {
    id
    name
    subject
    variables
  }
}

# Get a specific template
query {
  emailTemplate(id: "refund-approved") {
    id
    name
    subject
    html
    variables
  }
}
```

### Mutations

```graphql
# Create or update a template
mutation {
  upsertEmailTemplate(input: {
    id: "refund-approved"
    name: "Refund Approved"
    subject: "Your refund for order {{orderCode}} has been processed"
    html: "<html><body><h1>Refund Approved</h1><p>Hi {{customerName}},</p><p>Your refund of {{refundAmount}} for order {{orderCode}} has been processed.</p></body></html>"
    variables: ["customerName", "refundAmount", "orderCode"]
    category: "refund"
    description: "Sent when a refund is approved and processed"
    isActive: true
  }) {
    id
    name
    updatedAt
  }
}

# Delete a template
mutation {
  deleteEmailTemplate(id: "refund-approved")
}
```

## Using Templates in Code

### Simple Usage

```typescript
import { renderEmailTemplate } from '../graphql/email/utils';

// In your resolver or function
const emailContent = await renderEmailTemplate(
  dataSources,
  'refund-approved',
  {
    customerName: 'John Doe',
    refundAmount: '$50.00',
    orderCode: 'ORD-12345'
  }
);

if (emailContent) {
  // Send email via SendGrid
  await sendEmail({
    to: customerEmail,
    subject: emailContent.subject,
    html: emailContent.html
  });
}
```

### With Validation

```typescript
import { renderEmailTemplateWithValidation } from '../graphql/email/utils';

try {
  const emailContent = await renderEmailTemplateWithValidation(
    dataSources,
    'refund-approved',
    {
      customerName: 'John Doe',
      refundAmount: '$50.00',
      orderCode: 'ORD-12345'
    }
  );

  await sendEmail({
    to: customerEmail,
    subject: emailContent.subject,
    html: emailContent.html
  });
} catch (error) {
  // Will throw if template not found or variables missing
  console.error('Failed to render email template:', error);
}
```

### Manual Template Fetching and Rendering

```typescript
import {
  fetchEmailTemplate,
  replaceVariables,
  validateTemplateVariables
} from '../graphql/email/utils';

const template = await fetchEmailTemplate(dataSources, 'refund-approved');

if (!template) {
  throw new Error('Template not found');
}

const variables = {
  customerName: 'John Doe',
  refundAmount: '$50.00',
  orderCode: 'ORD-12345'
};

// Validate before rendering
const missingVars = validateTemplateVariables(template, variables);
if (missingVars.length > 0) {
  console.warn('Missing variables:', missingVars);
}

const subject = replaceVariables(template.subject, variables);
const html = replaceVariables(template.html, variables);
```

## Variable Syntax

Templates use `{{variableName}}` syntax for variable substitution:

- Subject: `"Your refund for order {{orderCode}} has been processed"`
- HTML: `"<p>Hi {{customerName}}, your refund of {{refundAmount}} is ready.</p>"`

## Example Templates

### Refund Approved

```typescript
{
  id: "refund-approved",
  name: "Refund Approved",
  subject: "Your refund for order {{orderCode}} has been processed",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Refund Approved</h1>
        </div>
        <div class="content">
          <p>Hi {{customerName}},</p>
          <p>Great news! Your refund has been processed.</p>
          <p><strong>Order:</strong> {{orderCode}}</p>
          <p><strong>Refund Amount:</strong> {{refundAmount}}</p>
          <p>The refund will appear in your account within 5-10 business days.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </body>
    </html>
  `,
  variables: ["customerName", "refundAmount", "orderCode"],
  category: "refund",
  isActive: true
}
```

### Order Confirmation

```typescript
{
  id: "order-confirmation",
  name: "Order Confirmation",
  subject: "Order {{orderCode}} confirmed - Thank you!",
  html: `
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Order Confirmed</h1>
      <p>Hi {{customerName}},</p>
      <p>Thank you for your order!</p>
      <p><strong>Order Number:</strong> {{orderCode}}</p>
      <p><strong>Total:</strong> {{orderTotal}}</p>
      <p><strong>Estimated Delivery:</strong> {{deliveryDate}}</p>
      <p>You can track your order at: {{trackingUrl}}</p>
    </body>
    </html>
  `,
  variables: ["customerName", "orderCode", "orderTotal", "deliveryDate", "trackingUrl"],
  category: "order",
  isActive: true
}
```

## Migration from SendGrid Templates

To migrate from SendGrid template IDs to database templates:

1. **Create template in database** via GraphQL mutation
2. **Update code** to use `renderEmailTemplate()` instead of SendGrid template ID
3. **Test** the new template
4. **Deploy**

### Before (SendGrid Template)

```typescript
await sendEmail({
  to: customerEmail,
  templateId: 'd-abc123',
  dynamicTemplateData: {
    customerName: 'John',
    refundAmount: '$50.00'
  }
});
```

### After (Database Template)

```typescript
const emailContent = await renderEmailTemplate(dataSources, 'refund-approved', {
  customerName: 'John',
  refundAmount: '$50.00',
  orderCode: 'ORD-12345'
});

await sendEmail({
  to: customerEmail,
  subject: emailContent.subject,
  html: emailContent.html
});
```

## Categories

Suggested categories for organizing templates:
- `order` - Order confirmations, updates
- `refund` - Refund approvals, notifications
- `shipping` - Shipment tracking, delivery confirmations
- `account` - Account creation, password resets
- `notification` - General notifications
- `marketing` - Promotional emails (if applicable)
