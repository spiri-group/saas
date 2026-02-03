export interface EmailTemplate {
  docType: "email-template";
  id: string; // e.g., "refund-approved", "order-confirmation"
  name: string; // Human-readable name
  subject: string; // Email subject line (can include {{variables}})
  html: string; // Full HTML content (can include {{variables}})
  variables: string[]; // e.g., ["customerName", "refundAmount", "orderId"]
  category?: string; // e.g., "order", "refund", "shipping"
  description?: string; // Optional description of when this template is used
  isActive: boolean;
  headerId?: string; // Reference to EmailHeaderFooter with type "header"
  footerId?: string; // Reference to EmailHeaderFooter with type "footer"
  createdAt: string;
  updatedAt: string;
  updatedBy: string; // Staff member who last edited
}

export interface EmailTemplateInput {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables?: string[];
  category?: string;
  description?: string;
  isActive?: boolean;
  headerId?: string;
  footerId?: string;
}

export interface EmailHeaderFooter {
  docType: "email-header-footer";
  id: string; // Auto-generated UUID
  name: string; // Human-readable name
  type: "header" | "footer";
  content: string; // JSON string of EmailStructure
  description?: string; // Optional description
  isDefault: boolean; // Whether this is the default header/footer
  isActive: boolean; // Whether this is available for selection
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EmailHeaderFooterInput {
  id?: string; // If provided, update existing; otherwise create new
  name: string;
  type: "header" | "footer";
  content: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}
