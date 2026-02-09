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

export const MARKET_LABELS: Record<string, string> = {
  global: "Global",
  AU: "Australia",
  UK: "United Kingdom",
  US: "United States",
};

export const MARKET_INFO: Record<string, { flag: string; description: string; regulations: string }> = {
  global: {
    flag: "🌐",
    description: "Applies to all markets as a baseline",
    regulations: "General international compliance",
  },
  AU: {
    flag: "🇦🇺",
    description: "Australian Consumer Law (ACL) & Privacy Act 1988",
    regulations: "ACCC, OAIC, Australian Privacy Principles (APPs)",
  },
  UK: {
    flag: "🇬🇧",
    description: "UK GDPR, Consumer Rights Act 2015",
    regulations: "ICO, CMA, UK data protection requirements",
  },
  US: {
    flag: "🇺🇸",
    description: "State-level privacy laws (CCPA/CPRA, etc.)",
    regulations: "FTC, state AGs, CCPA/CPRA, CAN-SPAM",
  },
};

export const DOCUMENT_TYPE_INFO: Record<string, { purpose: string; requiredFor: string }> = {
  "terms-of-service": {
    purpose: "Governs user access and use of the platform",
    requiredFor: "All markets - required for platform operation",
  },
  "privacy-policy": {
    purpose: "Discloses data collection, usage, and sharing practices",
    requiredFor: "All markets - legally required in AU (APPs), UK (GDPR), US (CCPA)",
  },
  "cookie-policy": {
    purpose: "Explains cookie usage and tracking technologies",
    requiredFor: "UK (PECR/ePrivacy), recommended for AU and US",
  },
  "merchant-terms": {
    purpose: "Agreement between the platform and merchants/vendors",
    requiredFor: "All markets - governs merchant onboarding and obligations",
  },
  "refund-policy": {
    purpose: "Outlines refund and return procedures",
    requiredFor: "AU (mandatory under ACL), UK (Consumer Rights Act), US (varies by state)",
  },
  "acceptable-use-policy": {
    purpose: "Defines prohibited activities and content standards",
    requiredFor: "All markets - platform integrity and compliance",
  },
  "spiritual-services-disclaimer": {
    purpose: "Disclaimers specific to spiritual/wellness services",
    requiredFor: "All markets - liability protection for spiritual services",
  },
  "payment-terms": {
    purpose: "Payment processing, fees, and billing terms",
    requiredFor: "All markets - Stripe compliance and fee transparency",
  },
  "intellectual-property-policy": {
    purpose: "DMCA/copyright takedown procedures and IP protection",
    requiredFor: "US (DMCA safe harbor), UK/AU (copyright law compliance)",
  },
};
