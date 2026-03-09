import axios from 'axios'
import { HttpMethod } from "@azure/functions";
import { GraphQLError } from 'graphql';
import { vault } from "./vault"
import { HTTPMethod } from '@azure/cosmos';
import { LogManager, mergeDeep } from '../utils/functions';

const qs = require('qs');

const service_prefix = "https://api.stripe.com/v1"

export class StripeDataSource {
    private token : string | null;
    private logger: LogManager;
    private vault: vault;

    private defaultHeaders : Record<string, string> = {
        'content-type': 'application/x-www-form-urlencoded',
    }

    constructor(log : LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
    }

    async init() {
        this.token = await this.getToken();
        // Removed verbose "Successfully connected" log - only log errors
    }

    async getToken() {
        // Removed verbose "Fetching token" log - only log errors
        const token = await this.vault.get("stripe-sk")
        if (token == undefined) throw "Stripe :: No Stripe token found"
        return token;
    }

    async callApi(method: HttpMethod, uri: string, data?: any, idempotencyKey?: string) {
        if (this.token == null) throw "This must be initialised before calling."

        // Create a fresh copy of headers for each request (don't mutate defaultHeaders)
        const headers: Record<string, string> = {
            ...this.defaultHeaders,
            'Authorization': `Bearer ${await this.token}`
        }

        // Add idempotency key if provided (prevents duplicate creates on retries/races)
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }

        let options = {
            method: method,
            headers,
            data: qs.stringify(data ?? {}, {arrayFormat: 'indices'}),
            url: `${service_prefix}/${uri}`
        }

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const resp = await axios(options);
                return resp;
            } catch (error) {
                // Stripe API errors (4xx/5xx with a response body) — don't retry
                if (error.response) {
                    this.logger.error(`Stripe API error: ${JSON.stringify(error.response.data)}`);
                    throw new GraphQLError(`Error ${error.response.status} - Stripe ${method} could not be called for ${uri}`, {
                        extensions: { code: 'BAD_REQUEST'},
                    });
                }

                // Network errors (DNS, timeout, connection reset) — retry with backoff
                if (attempt < maxRetries) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
                    this.logger.error(`Stripe network error (attempt ${attempt}/${maxRetries}): ${error.message || error}. Retrying in ${delayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }

                this.logger.error(`Stripe network error (attempt ${attempt}/${maxRetries}, giving up): ${error.message || error}`);
                throw new GraphQLError(`Network error calling Stripe ${method} for ${uri}: ${error.message || 'Unknown error'}`, {
                    extensions: { code: 'INTERNAL_SERVER_ERROR'},
                });
            }
        }

    }

    asConnectedAccount(accountId: string) {
        // you need to clone this and then set the default headers again
        const ds = new StripeDataSource(this.logger, this.vault);
        ds.defaultHeaders = this.defaultHeaders;
        ds.token = this.token;
        ds.defaultHeaders["Stripe-Account"] = accountId
        return ds;
    }

    async resolveCustomer(email: string) {
        // Look up stripe customers by email and return the matching one, if not create one
        // Use idempotency key based on email to prevent race conditions creating duplicate customers
        var customers = await this.callApi(HTTPMethod.get, `customers/search`, {
            query: `email:\'${email}\'`
        })
        if (customers.data == undefined) {
            throw "unexpected error when trying to search for customers"
        }
        if (customers.data.data.length >= 1) {
            // Return the existing customer in stripe
            return customers.data.data[0]
        } else {
            // Create the customer with an idempotency key based on email
            // This ensures that even if two calls race past the search, only one customer is created
            const idempotencyKey = `create-customer-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            var customer = await this.callApi(HTTPMethod.post, "customers", {
                email
            }, idempotencyKey)
            return customer.data;
        }
    }

    async retrievePrice(priceId: string): Promise<any> {
        var getCustomerResp = await this.callApi(HTTPMethod.get, `prices/${priceId}`, null)
        if (getCustomerResp.status == 200) {
            return getCustomerResp.data
        }
        return null;
    }


}
