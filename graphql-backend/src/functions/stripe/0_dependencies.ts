import { request } from "http";
import { AzureEmailDataSource } from "../../services/azureEmail";
import { ExchangeRateDataSource } from "../../services/exchangeRate";
import { signalRManager } from "../../services/signalR";
import { StripeDataSource } from "../../services/stripe"
import { vault } from "../../services/vault";
import { CosmosDataSource } from "../../utils/database";
import { LogManager } from "../../utils/functions";
import { HttpRequest, InvocationContext } from "@azure/functions";
import NodeCache from "node-cache";
import Stripe from "stripe";
import { ShipEngineDataSource } from "../../services/shipengine";

export type StripeHandler = (event: Stripe.Event, logger: LogManager, services: Services) => Promise<void>

export type Services = {
    stripe: StripeDataSource,
    cosmos: CosmosDataSource,
    email: AzureEmailDataSource,
    exchangeRate_ds: ExchangeRateDataSource,
    signalR: signalRManager,
    shipEngine: ShipEngineDataSource
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
    const stripe = new StripeDataSource(logger, keyVault)
    const email = new AzureEmailDataSource(logger, keyVault);
    const exchangeRate_ds = new ExchangeRateDataSource(logger, keyVault)
    const shipEngine = new ShipEngineDataSource(logger, keyVault);

    await cosmos.init(host)
    await stripe.init()
    await email.init(host);
    await exchangeRate_ds.init()
    await shipEngine.init();

    // Create services object for email dataSources reference
    const services = {
        cosmos,
        stripe,
        email,
        exchangeRate_ds,
        signalR,
        shipEngine
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