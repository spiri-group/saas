import { Migration } from "../types";

export const migration: Migration = {
    id: "062_tour_session_composite_index",
    description: "Adds composite index to Tour-Session for date + time ordering",

    async up(context) {
        // Composite index applied via Azure CLI (requires control plane access)
        // az cosmosdb sql container update --idx with compositeIndexes
        context.log("Composite index already applied via Azure CLI — skipping");
    },
};
