import { Migration } from "../types";

export const migration: Migration = {
    id: "062_tour_session_composite_index",
    description: "Adds composite index to Tour-Session for date + time ordering",

    async up(context) {
        await context.updateIndexingPolicy("Tour-Session", {
            indexingMode: "consistent",
            automatic: true,
            includedPaths: [{ path: "/*" }],
            excludedPaths: [{ path: "/\"_etag\"/?" }],
            compositeIndexes: [
                // sessions query: ORDER BY date ASC, time.start ASC
                [
                    { path: "/date", order: "ascending" },
                    { path: "/time/start", order: "ascending" },
                ],
            ],
        });
    },
};
