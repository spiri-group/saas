import { CosmosDataSource } from "../../utils/database";

export interface TermsSnapshot {
    documentId: string;
    title: string;
    content: string;
    acceptedAt: string;
}

/**
 * Fetch a terms & conditions document and create a snapshot for storing on a booking/order.
 * Returns null if no termsDocumentId is provided or the document doesn't exist.
 */
export async function fetchTermsSnapshot(
    cosmos: CosmosDataSource,
    termsDocumentId: string | undefined,
    vendorId: string
): Promise<TermsSnapshot | null> {
    if (!termsDocumentId) return null;

    const doc = await cosmos.get_record<any>("Main-VendorSettings", termsDocumentId, vendorId);
    if (!doc || doc.type !== "TERMS_AND_CONDITIONS") return null;

    return {
        documentId: doc.id,
        title: doc.title,
        content: doc.content,
        acceptedAt: new Date().toISOString(),
    };
}
