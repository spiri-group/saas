import { AzureEmailDataSource } from "../../services/azureEmail";
import { ExchangeRateDataSource } from "../../services/exchangeRate";
import { signalRManager } from "../../services/signalR";
import { vault } from "../../services/vault";
import { CosmosDataSource } from "../../utils/database";
import { LogManager } from "../../utils/functions";
import { HttpRequest, InvocationContext } from "@azure/functions";
import NodeCache from "node-cache";
import { ShipEngineDataSource } from "../../services/shipengine";
import { ShipEngineEvent } from "../../services/shipengine/types";

export type ShipEngineHandler = (event: ShipEngineEvent, logger: LogManager, services: Services) => Promise<void>

export type Services = {
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    exchangeRate_ds: ExchangeRateDataSource,
    shipEngine_ds: ShipEngineDataSource,
    signalR: signalRManager,
}

const setup = async (request: HttpRequest, context: InvocationContext, cache: NodeCache) => {
    const logger = new LogManager(context)
    const signalR = new signalRManager();

    var host = request.headers.get('host');
    if (host == null) {
        throw `Cannot start function without host`;
    }

    const keyVault = new vault(host, logger, cache)

    const cosmos = new CosmosDataSource(logger, keyVault)
    const email = new AzureEmailDataSource(logger, keyVault);
    const exchangeRate_ds = new ExchangeRateDataSource(logger, keyVault)
    const shipEngine_ds = new ShipEngineDataSource(logger, keyVault);

    await cosmos.init(host)
    await email.init(host);
    await exchangeRate_ds.init()
    await shipEngine_ds.init()

    // Create services object
    const services = {
        cosmos,
        email,
        exchangeRate_ds,
        shipEngine_ds,
        signalR
    } as Services;

    // Set dataSources reference for email service (needed for Cosmos template lookups)
    email.setDataSources({ cosmos });

    return {
        services,
        logger,
        keyVault
    }
}

export default setup;