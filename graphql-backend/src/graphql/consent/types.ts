export interface UserConsent {
  partitionKey: string; // userId
  rowKey: string; // documentType
  documentId: string;
  version: number;
  consentedAt: string;
  consentContext: "site-modal" | "checkout";
  documentTitle: string;
}

export interface OutstandingConsent {
  documentType: string;
  documentId: string;
  title: string;
  content: string;
  version: number;
  effectiveDate: string;
}

export interface RecordConsentInput {
  documentType: string;
  documentId: string;
  version: number;
  consentContext: string;
  documentTitle: string;
}
