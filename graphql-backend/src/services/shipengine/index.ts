import { rate_record_type } from "../../graphql/logistics/types";
import { LogManager } from "../../utils/functions";
import { vault } from "../vault";
import { ShipEngineInputAddress, ShipEngineInputPackage, ShipEngineRateResponseWrapper, ShipEngineTrackingEvent } from "./types";

const service_prefix = "https://api.shipengine.com"

export class ShipEngineDataSource {
    private logger: LogManager;
    private vault: vault;
    private key: string;

    constructor(log: LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
    }

    async init() {
        this.key = await this.vault.get('shipengine-api-key');
    }

    async getEstimate(
        ship: {
            from: ShipEngineInputAddress,
            to: ShipEngineInputAddress
        }, 
        packages: ShipEngineInputPackage[]
    ): Promise<rate_record_type[]>
    {
        const url = `${service_prefix}/v1/rates`;
        const headers = {
            'Content-Type': 'application/json',
            'API-Key': this.key
        };

        const customs_items = packages.flatMap(pkg => pkg.items).map(item => ({
            description: item.description,
            quantity: item.quantity,
            value: {
                amount: item.value.amount,
                currency: item.value.currency
            },
            country_of_origin: item.country_of_origin,
            country_of_manufacture: item.country_of_manufacture,
            harmonized_tariff_code: item.harmonized_tariff_code
        }))

        // we need to delete items from packages as its not required by the API
        for (const pkg of packages) {
            delete pkg.items;
        }

        const body = {
            rate_options: {
                carrier_ids: [
                    "se-210493" // UPS
                ],
                calculate_tax_amount: true
            },
            shipment: {
                ship_to: ship.to,
                ship_from: ship.from,
                packages,
                customs: {
                    contents: "merchandise",
                    non_delivery: "treat_as_abandoned",
                    customs_items
                }
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                this.logger.error(`Failed to fetch estimate: ${response.statusText}`);
                throw new Error(`Error fetching estimate: ${response.statusText}`);
            }

            const result: ShipEngineRateResponseWrapper = await response.json();
            const { rate_response } = result;

            if (!rate_response || !Array.isArray(rate_response.rates)) {
                this.logger.error(`Invalid response format: ${JSON.stringify(result)}`);
                throw new Error(`Invalid response format`);
            }

            const rates = rate_response.rates as rate_record_type[];

            // lets attach a total to each estimate by summing the rate_details
            for (const rate of rates) {
                rate.total_rate = {
                    amount: rate.shipping_amount.amount + rate.insurance_amount.amount + rate.other_amount.amount,
                    currency: rate.shipping_amount.currency
                }
            }
            
            return rates;
        } catch (error) {
            this.logger.error(`Error in getEstimate: ${error.message}`);
            throw error;
        }
    }

    async createLabelFromRate(params: {
       rate_id: string;
    }): Promise<any> {
        const url = `${service_prefix}/v1/labels/rates/${params.rate_id}`;
        const headers = {
            "Content-Type": "application/json",
            "API-Key": this.key
        };

        const body = {
        };

        try {
            const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
            });

            const responseText = await response.text();

            if (!response.ok) {
            this.logger.error(`Failed to create label from rate: ${response.status} - ${responseText}`);
            throw new Error(`ShipEngine label creation failed: ${responseText}`);
            }

            const result = JSON.parse(responseText);

            if (!result.label_id || !result.label_download) {
            this.logger.error(`Unexpected label response: ${responseText}`);
            throw new Error("Invalid label creation response");
            }

            this.logger.logMessage(`Successfully created label from rate ${params.rate_id}`);
            return result;
        } catch (error) {
            this.logger.error(`Error in createLabelFromRate: ${error.message}`);
            throw error;
        }
    }

    async getTrackingTimeline(labelId: string): Promise<ShipEngineTrackingEvent[]> {
        const url = `${service_prefix}/v1/labels/${encodeURIComponent(labelId)}/track`;
        const headers = {
            'API-Key': this.key
        };

        try {
            const response = await fetch(url, { headers });

            if (!response.ok) {
                const msg = await response.text();
                this.logger.error(`Failed to fetch tracking: ${response.status} - ${msg}`);
                throw new Error(`ShipEngine tracking fetch failed`);
            }

            const result = await response.json();

            if (!result || !Array.isArray(result.events)) {
                this.logger.error(`Malformed tracking response for label ${labelId}: ${JSON.stringify(result)}`);
                return [];
            }

            return result.events.map(event => ({
                status: event.status,
                description: event.description,
                city: event.city_locality ?? null,
                state: event.state_province ?? null,
                postalCode: event.postal_code ?? null,
                country: event.country_code ?? null,
                timestamp: event.timestamp
            }));
        } catch (error) {
            this.logger.error(`Error in getTrackingTimeline for label ${labelId}: ${error.message}`);
            throw error;
        }
    }


}