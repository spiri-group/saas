import { ApolloServer } from "@apollo/server";
import {resolvers as ScalarResolvers } from "graphql-scalars";
import NodeCache from "node-cache";
import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import { CosmosDataSource } from "../utils/database";
import { StripeDataSource } from "../services/stripe";
import { StorageDataSource } from "../services/storage";
import { resolvers, typeDefs } from "../graphql";
import { signalRManager } from "../services/signalR";
import { AzureEmailDataSource } from "../services/azureEmail";
import { TableStorageDataSource } from "../services/tablestorage";
import { DateTime } from "luxon";
import { ExchangeRateDataSource } from "../services/exchangeRate";
import { ShipEngineDataSource } from "../services/shipengine";
import depthLimit from "graphql-depth-limit";
import { parse } from "graphql";

// Utility to extract operation name from GraphQL query
function getOperationInfo(query: string): { name: string; type: string } {
  try {
    const parsed = parse(query);
    const operation = parsed.definitions[0];
    if (operation.kind === 'OperationDefinition') {
      return {
        name: operation.name?.value || 'Anonymous',
        type: operation.operation
      };
    }
  } catch (error) {
    // If parsing fails, fallback to regex
    const operationMatch = query.match(/(query|mutation)\s+(\w+)/);
    if (operationMatch) {
      return { type: operationMatch[1], name: operationMatch[2] };
    }
  }
  return { name: 'Unknown', type: 'unknown' };
}

const myCache = new NodeCache();

// Create ApolloServer instance once at module level for reuse across requests
// This avoids schema parsing, validation, and compilation on every request
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers: { ...ScalarResolvers, ...resolvers},
  csrfPrevention: true,
  // Add introspection and playground control
  introspection: process.env.NODE_ENV !== 'production',
  // Prevent deeply nested queries that could cause performance issues
  validationRules: [depthLimit(10)],
  // Add performance monitoring plugins
  plugins: [
    {
      async requestDidStart() {
        const startTime = Date.now();
        let operationName = 'Unknown';

        return {
          async didResolveOperation(requestContext) {
            operationName = requestContext.operationName || 'Anonymous';
          },
          async willSendResponse(requestContext) {
            const duration = Date.now() - startTime;

            // Log slow queries (over 1 second)
            if (duration > 1000) {
              console.warn(`[SLOW QUERY] ${operationName} took ${duration}ms`);
            }

            // Add performance headers for debugging
            if (requestContext.response.http) {
              requestContext.response.http.headers.set('X-GraphQL-Duration', `${duration}ms`);
              requestContext.response.http.headers.set('X-GraphQL-Operation', operationName);
            }
          },
        };
      },
    },
  ],
});

export async function graphql(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const startTime = Date.now();
    var host = request.headers.get('host');
    if (host == null) {
      context.error(`Cannot start function without host`);
      return {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: 'An error occurred while processing your request. Please try again later.'
        })
      }
    }

    const logger = new LogManager(context)
    const keyVault = new vault(host, logger, myCache)

    const dataSources = {
      vault: keyVault,
      cosmos: new CosmosDataSource(logger, keyVault),
      stripe: new StripeDataSource(logger, keyVault),
      storage: new StorageDataSource(host, logger),
      email: new AzureEmailDataSource(logger, keyVault),
      exchangeRate: new ExchangeRateDataSource(logger, keyVault),
      shipEngine: new ShipEngineDataSource(logger, keyVault)
    }

    await Promise.all([
      dataSources.cosmos.init(host),
      dataSources.stripe.init(),
      dataSources.email.init(host),
      dataSources.exchangeRate.init(),
      dataSources.shipEngine.init(),
    ])

    // Set dataSources reference for email service (needed for Cosmos template lookups)
    dataSources.email.setDataSources(dataSources);

    // we need to convert the readable stream of the body to json and extract the query and variables
    const {query, variables} = await request.json() as { query: string, variables: any };

    // Extract operation info for better logging
    const operationInfo = getOperationInfo(query);

    // Log meaningful start message using trace level (gray/dimmed in VS Code)
    context.trace(`▶️  ${operationInfo.type} ${operationInfo.name}`);

    // Only log query summary in development or for debugging
    // In production, the performance monitoring plugin will log slow queries
    if (process.env.NODE_ENV === 'development') {
      const patterns = ['query', 'mutation'];
      const cleanedQuery = query.replace(/\n|\t|\s+/g, ' ');
      let operationBodies = cleanedQuery.split(new RegExp(patterns.join('|')));
      operationBodies = operationBodies.map(operationBody => operationBody.trim());
      const gql_summary = operationBodies.filter(operationBody => operationBody.length > 0).join("||");
      logger.logMessage(gql_summary);
    }

    // now we need to check if the user is present
    
    const authorization = request.headers.get("authorization");
    
    let userId = null as string|null
    let userEmail = null as string|null
    if (authorization != null) {

      try {
      // Removed verbose "user is present" log - auth happens on 99% of requests
      let auth_prepped = Buffer.from(authorization.replace("Bearer ", ""), 'base64').toString('utf-8');
      let encoded = JSON.parse(auth_prepped) as {token:string, email: string};
      if (encoded.token == null) {
        return {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      }
      
      // now we need to check if its a guid -- if so we know its the session token otherwise handle as a jwt
      if (encoded.token.length == 36) {
        // now from table storage we need to find the session token and check has it expired yet
        const storageService = new TableStorageDataSource(logger, keyVault);
        await storageService.init('auth');

        // now we attempt to get the session row
        const session = await storageService.getRow<{ expires: string, userId: string }>('auth', 'session', encoded.token);
        const sessionExpiresAt = DateTime.fromISO(session?.expires || "1970-01-01T00:00:00Z");
        const userForSession = await storageService.getRow<{ email: string }>('auth', 'user', session?.userId || '');

        // has the session expired
        if (sessionExpiresAt < DateTime.utc()) {
          return {
            status: 401,
            headers: {
              "Content-Type": "application/json"
            }
          } 
        }

        userEmail = userForSession.email
        // now from cosmos we need to get the user id
        const user = await dataSources.cosmos.run_query('Main-User', { query: 'SELECT c.id FROM c WHERE c.email = @email', parameters: [{ name:"@email", value: userForSession.email }] }, true);
        
        // now if we found a user then set it otherwise just continue may not be registered yet
        if (user.length > 0) {
          userId = user[0].id;
        }
      }

      } catch (error) {
        context.error(`GraphQL ERROR :: ${error}`);
        return {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      }
    }

    const signalR = new signalRManager();

    const contextValue = {
      userId, userEmail, dataSources, logger, signalR
    }

    // Reuse the module-level ApolloServer instance instead of creating a new one
    const resp = await apolloServer.executeOperation({
      query,
      variables
    }, {
      contextValue
    });

    context.extraOutputs.set('signalR', signalR.messages)

    if (resp.body.kind == "single") {
      const {data, errors} = resp.body.singleResult;

      if (errors != null) {
        errors.forEach((error, index) => {
          const timestamp = DateTime.utc().toISO();
          const locationStr = error.locations?.map(loc => `${loc.line}:${loc.column}`).join(", ") ?? "N/A";
          const pathStr = error.path?.join(" > ") ?? "N/A";

          let stack: string;
          if (
            error.extensions &&
            Array.isArray(error.extensions.stacktrace) &&
            error.extensions.stacktrace.every(line => typeof line === 'string')
          ) {
            stack = error.extensions.stacktrace.join("\n");
          } else {
            stack = "No stack trace available";
          }

          const formatted = [
            `\n--- GraphQL ERROR (${index + 1}) ---`,
            `Timestamp  : ${timestamp}`,
            `Message    : ${error.message}`,
            `Location   : ${locationStr}`,
            `Path       : ${pathStr}`,
            `StackTrace :`,
            stack,
            `-----------------------------`
          ].join("\n");

          logger.error(formatted);
        });

        const duration = Date.now() - startTime;
        // Use error level for failures (red in Azure)
        context.error(`❌ ${operationInfo.type} ${operationInfo.name} FAILED (${duration}ms) - ${errors.length} error(s)`);

        return {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: 'An error occurred while processing your request. Please try again later.'
          })
        };
      }

      const duration = Date.now() - startTime;
      const userContext = userId ? `user:${userId}` : 'anonymous';

      // Log datasource usage summary (only in development or for slow queries)
      if (process.env.NODE_ENV === 'development' || duration > 1000) {
        const dsUsage = [];
        if (dataSources.cosmos) dsUsage.push('cosmos');
        if (dataSources.stripe) dsUsage.push('stripe');
        if (dataSources.email) dsUsage.push('email');
        if (dataSources.exchangeRate) dsUsage.push('exchange');
        if (dataSources.shipEngine) dsUsage.push('shipengine');
        // Use warn level for slow queries (yellow/orange in VS Code)
        context.warn(`⚠️  ${operationInfo.type} ${operationInfo.name} (${duration}ms) [${userContext}] [ds: ${dsUsage.join(', ')}]`);
      } else {
        // Use log level for normal success (white/default in VS Code)
        context.log(`✅ ${operationInfo.type} ${operationInfo.name} (${duration}ms) [${userContext}]`);
      }

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data,
          success: true,
          message: 'Operation completed successfully'
        })
      }

    } else {
      throw "Unsupported graphql function kind, only support single at the moment"
    }

};

const goingOutToSignalR = output.generic({
  type: 'signalR',
  name: 'signalR',
  hubName: 'serverless',
  connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('graphql', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: graphql,
  extraOutputs: [goingOutToSignalR]
});
