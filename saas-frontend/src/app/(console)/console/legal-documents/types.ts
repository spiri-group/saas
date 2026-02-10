export interface LegalDocument {
  id: string;
  documentType: string;
  title: string;
  content: string;
  market: string;
  version: number;
  isPublished: boolean;
  effectiveDate: string;
  changeSummary?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LegalDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  market: string;
  isPublished: boolean;
  effectiveDate: string;
  changeSummary: string;
  createdAt: string;
  supersededAt: string;
  supersededBy: string;
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
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  "terms-of-service": "Terms of Service",
  "privacy-policy": "Privacy Policy",
  "cookie-policy": "Cookie Policy",
  "merchant-terms": "Merchant Terms",
  "refund-policy": "Refund & Returns Policy",
  "acceptable-use-policy": "Acceptable Use Policy",
  "spiritual-services-disclaimer": "Spiritual Services Disclaimer",
  "payment-terms": "Payment & Fee Terms",
  "intellectual-property-policy": "Intellectual Property & DMCA Policy",
};

export const DOCUMENT_TYPE_INFO: Record<string, { purpose: string; marketNotes: string; usedIn: string }> = {
  "terms-of-service": {
    purpose: "Governs user access and use of the platform",
    marketNotes: "Applies uniformly across AU, UK, and US",
    usedIn: "Site consent (login)",
  },
  "privacy-policy": {
    purpose: "Discloses data collection, usage, and sharing practices",
    marketNotes: "UK GDPR (s.6, 9, 12, 23) | AU APPs (s.13, 22) | US CCPA/state laws (s.14)",
    usedIn: "Site consent (login)",
  },
  "cookie-policy": {
    purpose: "Explains cookie usage and tracking technologies",
    marketNotes: "UK PECR requires explicit consent | AU/US less strict but covered",
    usedIn: "Public page only",
  },
  "merchant-terms": {
    purpose: "Agreement between the platform and merchants/vendors",
    marketNotes: "Applies uniformly across AU, UK, and US",
    usedIn: "Merchant onboarding",
  },
  "refund-policy": {
    purpose: "Outlines refund and return procedures",
    marketNotes: "AU ACL mandatory guarantees (s.12) | UK Consumer Rights Act 14-day cooling off | US varies by state",
    usedIn: "Checkout consent",
  },
  "acceptable-use-policy": {
    purpose: "Defines prohibited activities and content standards",
    marketNotes: "Applies uniformly across AU, UK, and US",
    usedIn: "Merchant onboarding",
  },
  "spiritual-services-disclaimer": {
    purpose: "Disclaimers specific to spiritual/wellness services",
    marketNotes: "Applies uniformly across AU, UK, and US",
    usedIn: "Service checkout consent",
  },
  "payment-terms": {
    purpose: "Payment processing, fees, and billing terms",
    marketNotes: "AU (AUD/GST, s.11) | UK (GBP/VAT, s.11) | US (USD/sales tax, s.11)",
    usedIn: "Checkout consent",
  },
  "intellectual-property-policy": {
    purpose: "DMCA/copyright takedown procedures and IP protection",
    marketNotes: "US DMCA (s.8) | UK CDPA 1988 (s.9) | AU Copyright Act 1968 (s.10)",
    usedIn: "Merchant onboarding",
  },
};
