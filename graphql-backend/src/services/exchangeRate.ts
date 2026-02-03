import { LogManager } from "../utils/functions";
import { vault } from "./vault";
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 minutes cache duration

export class ExchangeRateDataSource {
    private logger: LogManager;
    private vault: vault;
    private key: string;

    constructor(log: LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
    }

    async init() {
        this.key = await this.vault.get('exchange-rate-api-key');
    }

    async getRate(from: string, to: string) {
        const cacheKey = `${from}_${to}`;
        const cachedRate = cache.get(cacheKey);

        if (cachedRate) {
            return cachedRate;
        }

        const url = `https://api.exchangerate-api.com/v4/latest/${from}`;
        const response = await fetch(url + `?access_key=${this.key}`);
        const data = await response.json();
        const rate = data.rates[to];

        cache.set(cacheKey, rate);

        // Removed verbose rate logging - only log errors
        return rate;
    }

    async getRates(from: string, to: string[]) : Promise<Record<string, number>> {
        const rates = await Promise.all(to.map(async (toCurrency) => {
            return await this.getRate(from, toCurrency);
        }));

        return to.reduce((acc, currency, index) => {
            acc[currency] = rates[index];
            return acc;
        }, {});
    }

    async convert(amount: number, from: string, to: string) {
        const reverseRateKey = `${to}_${from}`;
        if (cache.has(reverseRateKey)) {
            const reverseRate = cache.get<number>(reverseRateKey);
            // Stripe recommends using whole numbers (e.g., cents)
            return Math.round(amount / reverseRate);
        }

        const rate = await this.getRate(from, to);
        // Stripe recommends using whole numbers (e.g., cents)
        return Math.round(amount * rate);
    }
    
    async convertFieldsInPlace(
        obj: any,
        toCurrency: string,
        depth: number = -1
      ): Promise<void> {
        if (depth === 0 || typeof obj !== 'object' || obj === null) return;
      
        if (Array.isArray(obj)) {
          for (const item of obj) {
            await this.convertFieldsInPlace(item, toCurrency, depth - 1);
          }
          return;
        }
      
        const keys = Object.keys(obj);
        const hasAmount = keys.includes('amount') && typeof obj.amount === 'number';
        const hasCurrency = keys.includes('currency') && typeof obj.currency === 'string';
      
        if (hasAmount && hasCurrency) {
          const objCurrency = obj.currency.toUpperCase();
          const targetCurrency = toCurrency.toUpperCase();
      
          if (objCurrency !== targetCurrency) {
            const converted = await this.convert(obj.amount, objCurrency, targetCurrency);
            obj.amount = converted;
            obj.currency = targetCurrency;
          }
        }
      
        for (const key of keys) {
          const value = obj[key];
          if (value && typeof value === 'object') {
            await this.convertFieldsInPlace(value, toCurrency, depth - 1);
          }
        }
    }      

}