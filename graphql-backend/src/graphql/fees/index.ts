import { serverContext } from "../../services/azFunction";

const container = 'System-Settings'
const partition = 'fees-config'

const VALID_MARKETS = ['AU', 'UK', 'US'] as const;

function getDocId(market: string): string {
    if (!VALID_MARKETS.includes(market as any)) {
        throw new Error(`Invalid market "${market}". Must be one of: ${VALID_MARKETS.join(', ')}`);
    }
    return `spiriverse-${market}`;
}

const resolvers = {
    Query: {
        feeSetting: async (_: any, args: { market?: string }, context: serverContext) => {
            // If no market specified, fall back to legacy document for backward compat
            const docId = args.market ? getDocId(args.market) : 'spiriverse';
            try {
                // Return raw fee config – fixed amounts are stored in smallest units (cents)
                // and the frontend expects cents (formatFixed divides by 100 for display)
                return await context.dataSources.cosmos.get_record(container, docId, partition);
            } catch (error) {
                console.error(`Failed to get fee setting ${docId}:`, error);
                throw new Error(`Fee setting ${docId} not found`);
            }
        }
    },

    Mutation: {
        updateFeeConfig: async (_: any, args: { market: string, key: string, percent: number, fixed: number, currency: string, basePrice?: number }, context: serverContext) => {
            const docId = getDocId(args.market);
            try {
                const value: Record<string, any> = {
                    percent: args.percent,
                    fixed: args.fixed, // Already in smallest units
                    currency: args.currency
                };

                // Include basePrice when provided (used for readings with platform-set pricing)
                if (args.basePrice !== undefined && args.basePrice !== null) {
                    value.basePrice = args.basePrice;
                }

                // Use patch_record to update just the specific fee configuration
                await context.dataSources.cosmos.patch_record(
                    container,
                    docId,
                    partition,
                    [
                        {
                            op: "set",
                            path: `/${args.key}`,
                            value
                        }
                    ],
                    context.userId
                );
                return true;
            } catch (error) {
                console.error('Failed to update fee config:', error);
                throw new Error('Failed to update fee configuration');
            }
        },

        deleteFeeConfig: async (_: any, args: { market: string, key: string }, context: serverContext) => {
            const docId = getDocId(args.market);
            try {
                // Use patch_record to remove the specific fee configuration
                await context.dataSources.cosmos.patch_record(
                    container,
                    docId,
                    partition,
                    [
                        {
                            op: "remove",
                            path: `/${args.key}`
                        }
                    ],
                    context.userId
                );
                return true;
            } catch (error) {
                console.error('Failed to delete fee config:', error);
                throw new Error('Failed to delete fee configuration');
            }
        }
    }
};

export { resolvers };
