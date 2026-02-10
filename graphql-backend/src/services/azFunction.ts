import { CosmosDataSource } from "../utils/database"
import { LogManager } from "../utils/functions"
import { AzureEmailDataSource } from "./azureEmail"
import { ExchangeRateDataSource } from "./exchangeRate"
import { ShipEngineDataSource } from "./shipengine"
import { signalRManager } from "./signalR"
import { StorageDataSource } from "./storage"
import { StripeDataSource } from "./stripe"
import { TableStorageDataSource } from "./tablestorage"
import { vault } from "./vault"

export type serverContext = {
    userId: string | null,
    userEmail: string | null,
    dataSources: {
        vault: vault,
        cosmos: CosmosDataSource,
        email: AzureEmailDataSource,
        stripe: StripeDataSource,
        storage: StorageDataSource,
        exchangeRate: ExchangeRateDataSource,
        shipEngine: ShipEngineDataSource,
        tableStorage: TableStorageDataSource
    },
    signalR: signalRManager,
    logger: LogManager
}

