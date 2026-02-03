export interface EmailHeaderFooter {
  id: string;
  name: string;
  type: "header" | "footer";
  content: string; // JSON string of EmailStructure
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EmailHeaderFooterInput {
  id?: string;
  name: string;
  type: "header" | "footer";
  content: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  category?: string;
  description?: string;
  isActive: boolean;
  headerId?: string;
  footerId?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
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
