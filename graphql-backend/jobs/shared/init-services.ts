/**
 * Service bootstrap for Container Jobs - no Azure Functions dependencies.
 * Initializes Cosmos, Stripe, Email services using the same vault pattern.
 */
import NodeCache from "node-cache";
import { CosmosDataSource } from "../../src/utils/database";
import { StripeDataSource } from "../../src/services/stripe";
import { AzureEmailDataSource } from "../../src/services/azureEmail";
import { TableStorageDataSource } from "../../src/services/tablestorage";
import { LogManager } from "../../src/utils/functions";
import { vault } from "../../src/services/vault";

export interface JobServices {
    cosmos: CosmosDataSource;
    stripe: StripeDataSource;
    email: AzureEmailDataSource;
    tableStorage: TableStorageDataSource;
    logger: LogManager;
}

const cache = new NodeCache();

export async function initServices(): Promise<JobServices> {
    // WEBSITE_HOSTNAME is set on Container Jobs to match the Function App name
    // so vault.ts host-parsing regex resolves the correct Key Vault
    const host = process.env.WEBSITE_HOSTNAME || "localhost:7071";

    const logger = new LogManager();
    const keyVault = new vault(host, logger, cache);

    const cosmos = new CosmosDataSource(logger, keyVault);
    const stripe = new StripeDataSource(logger, keyVault);
    const email = new AzureEmailDataSource(logger, keyVault);
    const tableStorage = new TableStorageDataSource(logger, keyVault);

    await cosmos.init(host);
    await stripe.init();
    await email.init(host);
    await tableStorage.init();
    email.setDataSources({ cosmos });

    return { cosmos, stripe, email, tableStorage, logger };
}
