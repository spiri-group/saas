export interface LegalDocument {
  docType: "legal-document";
  id: string; // e.g., "terms-of-service", "privacy-policy"
  documentType: string; // Category: "terms-of-service", "privacy-policy", etc.
  title: string; // Human-readable title
  content: string; // Markdown content
  market: string; // "global" | "AU" | "UK" | "US"
  version: number; // Auto-incrementing version number
  isPublished: boolean; // Whether this version is live
  effectiveDate: string; // When this version takes effect
  changeSummary?: string; // Description of the most recent change
  createdAt: string;
  updatedAt: string;
  updatedBy: string; // Staff member who last edited
  placeholders?: Record<string, string>;
  parentDocumentId?: string; // For supplements: links to the base document
  supplementOrder?: number; // Display order within supplements for a document type
}

export interface LegalDocumentVersion {
  docType: "legal-document-version";
  id: string; // "{documentId}-v{version}" e.g., "terms-of-service-v1"
  documentId: string; // Reference to parent document ID
  version: number; // The version number of this snapshot
  title: string;
  content: string;
  market: string;
  isPublished: boolean;
  effectiveDate: string;
  changeSummary: string; // What changed in the next version (why this was replaced)
  createdAt: string; // When this version was originally created
  supersededAt: string; // When this version was replaced
  supersededBy: string; // Who replaced it
  placeholders?: Record<string, string>;
}

export interface LegalDocumentInput {
  id: string;
  documentType: string;
  title: string;
  content: string;
  market: string;
  isPublished?: boolean;
  effectiveDate?: string;
  changeSummary?: string;
  placeholders?: Record<string, string>;
  parentDocumentId?: string;
  supplementOrder?: number;
}

export const LEGAL_DOCUMENT_TYPES = [
  "terms-of-service",
  "privacy-policy",
  "cookie-policy",
  "merchant-terms",
  "refund-policy",
  "acceptable-use-policy",
  "spiritual-services-disclaimer",
  "payment-terms",
  "intellectual-property-policy",
] as const;

export type LegalDocumentType = typeof LEGAL_DOCUMENT_TYPES[number];
