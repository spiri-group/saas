import { readFileSync } from 'fs';
import { join } from 'path';

const query = readFileSync(join(__dirname, 'query.graphql'), 'utf8');
const mutation = readFileSync(join(__dirname, 'mutation.graphql'), 'utf8');

export const paymentTypeDefs = [query, mutation].join('\n');

const resolvers = {
    Query: {
        getStoredPaymentMethods: async (_, { merchantId }, { dataSources, req }) => {
            // TODO: Implement payment methods retrieval from Stripe
            // This will need to fetch payment methods from merchant's Stripe customer
            return dataSources.payment.getStoredPaymentMethods(merchantId);
        },
    },
    
    Mutation: {
        createSetupIntent: async (_, { merchantId }, { dataSources, req }) => {
            try {
                const setupIntent = await dataSources.payment.createSetupIntent(merchantId);
                return {
                    code: '200',
                    success: true,
                    message: 'Setup intent created successfully',
                    setupIntent
                };
            } catch (error) {
                return {
                    code: '500',
                    success: false,
                    message: error.message || 'Failed to create setup intent',
                    setupIntent: null
                };
            }
        },

        addPaymentMethod: async (_, { merchantId, setupIntentId, paymentMethodId }, { dataSources, req }) => {
            try {
                const paymentMethod = await dataSources.payment.addPaymentMethod(
                    merchantId, 
                    setupIntentId, 
                    paymentMethodId
                );
                return {
                    code: '200',
                    success: true,
                    message: 'Payment method added successfully',
                    paymentMethod
                };
            } catch (error) {
                return {
                    code: '500',
                    success: false,
                    message: error.message || 'Failed to add payment method',
                    paymentMethod: null
                };
            }
        },

        deletePaymentMethod: async (_, { merchantId, paymentMethodId }, { dataSources, req }) => {
            try {
                await dataSources.payment.deletePaymentMethod(merchantId, paymentMethodId);
                return {
                    code: '200',
                    success: true,
                    message: 'Payment method deleted successfully'
                };
            } catch (error) {
                return {
                    code: '500',
                    success: false,
                    message: error.message || 'Failed to delete payment method'
                };
            }
        },

        setDefaultPaymentMethod: async (_, { merchantId, paymentMethodId }, { dataSources, req }) => {
            try {
                await dataSources.payment.setDefaultPaymentMethod(merchantId, paymentMethodId);
                return {
                    code: '200',
                    success: true,
                    message: 'Default payment method updated successfully'
                };
            } catch (error) {
                return {
                    code: '500',
                    success: false,
                    message: error.message || 'Failed to update default payment method'
                };
            }
        }    }
};

export { resolvers };