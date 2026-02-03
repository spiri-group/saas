import { serverContext } from "../../services/azFunction";
import { decodeAmountFromSmallestUnit } from "../../utils/functions";

const container = 'System-Settings'
const id = 'spiriverse'
const partition = 'fees-config'

const resolvers = {
    Query: {
        feeSetting: async (_: any, __: any, context: serverContext) => {
            try {
                const setting = await context.dataSources.cosmos.get_record(container, id, partition);

                // Convert fixed amounts from smallest units to dollars for frontend
                const convertedSetting = (setting && typeof setting === 'object' && !Array.isArray(setting)) ? { ...setting } : {};

                Object.keys(setting).forEach(key => {
                    const value = setting[key];
                    if (key !== 'id' && !key.startsWith('_') && typeof value === 'object' && value !== null) {
                        if ('fixed' in value && 'currency' in value && 'percent' in value) {
                            convertedSetting[key] = {
                                ...value,
                                fixed: decodeAmountFromSmallestUnit(value.fixed || 0, value.currency)
                            };
                        }
                    }
                });

                return convertedSetting;
            } catch (error) {
                console.error(`Failed to get fee setting ${id}:`, error);
                throw new Error(`Fee setting ${id} not found`);
            }
        }
    },

    Mutation: {
        updateFeeConfig: async (_: any, args: { key: string, percent: number, fixed: number, currency: string }, context: serverContext) => {
            try {
                // Fixed amount is already in smallest units from frontend

                // Use patch_record to update just the specific fee configuration
                await context.dataSources.cosmos.patch_record(
                    container,
                    id,
                    partition,
                    [
                        {
                            op: "set",
                            path: `/${args.key}`,
                            value: {
                                percent: args.percent,
                                fixed: args.fixed, // Already in smallest units
                                currency: args.currency
                            }
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

        deleteFeeConfig: async (_: any, args: { key: string }, context: serverContext) => {
            try {
                // Use patch_record to remove the specific fee configuration
                await context.dataSources.cosmos.patch_record(
                    container,
                    id,
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