import { Migration } from "../types";

export const migration: Migration = {
    id: "020_legal_document_indexes",
    description: "Adds composite indexes to System-Settings for legal document ORDER BY queries",

    async up(context) {
        await context.updateIndexingPolicy("System-Settings", {
            indexingMode: "consistent",
            automatic: true,
            includedPaths: [{ path: "/*" }],
            excludedPaths: [{ path: "/\"_etag\"/?" }],
            compositeIndexes: [
                // legalDocuments query: ORDER BY documentType ASC, market ASC
                [
                    { path: "/documentType", order: "ascending" },
                    { path: "/market", order: "ascending" },
                ],
                // legalDocumentVersions query: ORDER BY version DESC
                [
                    { path: "/documentId", order: "ascending" },
                    { path: "/version", order: "descending" },
                ],
            ],
        });
    },
};
