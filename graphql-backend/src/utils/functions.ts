import { InvocationContext } from "@azure/functions";
import { AxiosError } from "axios";
import * as fs from 'fs';
import * as path from 'path';

export class LogManager {
  private ctx: InvocationContext | null;

  constructor(ctx?: InvocationContext) {
    if (ctx != null) {
      this.ctx = ctx;
    } else {
      this.ctx = null;
    }
  }

  formatMessage(message: string, logID?: string): string {
    return logID ? `[${logID}]: ${message}` : message;
  }

  logMessage(message: string, logID?: string): void {
    const formattedMessage = this.formatMessage(message, logID);
    if (this.ctx != null) {
      this.ctx.log(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  error(message: string, errors?: any, logID?: string): void {
    const formattedMessage = this.formatMessage(message, logID);
    if (this.ctx != null) {
      if (errors != null) {
        this.ctx.error(message, errors);
      } else {
        this.ctx.error(message);
      }
    } else {
      if (errors == null) {
        console.error(message);
      } else {
        console.error(message, errors);
      }
    }
  }

  warn(message: string, logID?: string): void {
    const formattedMessage = this.formatMessage(message, logID);
    if (this.ctx != null) {
      this.ctx.warn(formattedMessage);
    } else {
      console.warn(formattedMessage);
    }
  }
  
}

export const distinct = <T>(values: T[]) => {
  return Array.from(new Set(values))
}

export const distinctBy = <T, K, V = T>(
  values: T[],
  keyExtractor: (item: T) => K,
  valueExtractor?: (item: T) => V
): V[] => {
  const seenKeys = new Set<K>();
  return values.reduce((result: V[], item: T) => {
    const key = keyExtractor(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push(valueExtractor ? valueExtractor(item) : (item as unknown as V));
    }
    return result;
  }, []);
};


export const isObject = (item: any) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

export const combineArrays = (...args: (any | any[])[]): any[] => {
    const result: any[] = [];

    for (const arg of args) {
        if (Array.isArray(arg)) {
            result.push(...arg);
        } else {
            result.push(arg);
        }
    }

    return result;
}

export const flatten = (source: string | string[]) => {
  return Array.isArray(source) ? source.join("|") : source
}

export const unflatten = (source: string | string[]) => {
  if (Array.isArray(source)) return source;
  else return source.split("|")
}

export const partitionsEqual = (a: string[] | string, b: string[] | string) => {
  if (typeof a === 'string' && typeof b === 'string') {
      return a === b;
  } else if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((val, index) => val === b[index]);
  }
  return false;
};

export const mergeDeep = (target: { [x: string]: any }, ...sources: any[]) : any => {
  if (!sources.length) return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (Array.isArray(source[key])) {
        if (!Array.isArray(target[key])) target[key] = [];
        for (let i = 0; i < source[key].length; i++) {
          if (isObject(source[key][i])) {
            if (i >= target[key].length) target[key].push({});
            mergeDeep(target[key][i], source[key][i]);
          } else {
            if (source[key][i] !== undefined && source[key][i] !== null) {
              target[key][i] = source[key][i];
            }
          }
        }
      } else if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        if (source[key] !== undefined && source[key] !== null) {
          target[key] = source[key];
        }
      }
    }
  }
  return mergeDeep(target, ...sources);
};

export function describeObjectDifference(obj1: { [x: string]: any; }, obj2: { [x: string]: any; }, excludedKeys: string[] = []) {
  const obj1Keys = Object.keys(obj1);
  const obj2Keys = Object.keys(obj2);
  
  const addedKeys = obj2Keys.filter(key => !obj1Keys.includes(key));
  const removedKeys = obj1Keys.filter(key => !obj2Keys.includes(key));
  
  const changedValues: string[] = [];
  const unchangedKeys: string[] = [];
  
  obj1Keys.forEach((key:string) => {
    if (obj2[key] !== undefined) {
      if (excludedKeys.includes(key)) {
        unchangedKeys.push(key);
      } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
        const nestedDiff = describeObjectDifference(obj1[key], obj2[key], excludedKeys);
        if (nestedDiff !== '') {
          changedValues.push(`${key}: { ${nestedDiff} }`);
        } else {
          unchangedKeys.push(key);
        }
      } else if (obj1[key] !== obj2[key]) {
        changedValues.push(`${key}: ${obj1[key]} -> ${obj2[key]}`);
      } else {
        unchangedKeys.push(key);
      }
    }
  });
  
  const addedStr = addedKeys.length > 0 ? `added keys: ${addedKeys.join(', ')}` : '';
  const removedStr = removedKeys.length > 0 ? `removed keys: ${removedKeys.join(', ')}` : '';
  const changedStr = changedValues.length > 0 ? `changed values: { ${changedValues.join(', ')} }` : '';
  const unchangedStr = unchangedKeys.length > 0 ? `unchanged keys: ${unchangedKeys.join(', ')}` : '';
  
  const diffStrings = [addedStr, removedStr, changedStr, unchangedStr].filter(str => str !== '');
  return diffStrings.join('; ');
}

export const trimObj = (obj: any) => {
  if (obj === null || !Array.isArray(obj) && typeof obj != 'object') return obj;
  return Object.keys(obj).reduce(function(acc : any, key) {
    acc[key.trim()] = typeof obj[key] == 'string'? obj[key].trim() : trimObj(obj[key]);
    return acc;
  }, Array.isArray(obj)? []:{});
}

export function isAxiosError(candidate: unknown): candidate is AxiosError {
  if (candidate && typeof candidate === 'object' && 'isAxiosError' in candidate) {
    return true;
  }
  return false;
}

export function getAllFilesWithExtension(
  dirPath: string,
  endsWith: string,
  fileList: string[] = []
): string[] {
  const files: string[] = fs.readdirSync(dirPath);

  files.forEach((file: string) => {
    const filePath = path.join(dirPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      getAllFilesWithExtension(filePath, endsWith, fileList);
    } else if (file.endsWith(endsWith)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

export const isNullOrWhiteSpace = (str: string | null | undefined) => {
  return str == null || str.match(/^ *$/) !== null || str === "" || str === undefined;
}

export const groupBy = <K extends string | number | symbol, T, V = T>(
  array: T[],
  grouper: (item: T) => K,
  mapper?: (item: T) => V
): Record<K, V[]> => {
  var grouped = array.reduce((store: Record<K, any[]>, item) => {
    var key = grouper(item)
    if (!store[key]) {
      store[key] = [item]
    } else {
      store[key].push(item)
    }
    return store
  }, {} as Record<K, any[]>)

  if (mapper != null) {
    for (var key in grouped) {
      grouped[key] = grouped[key].map((x) => mapper(x))
    }
  } 
  return grouped;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function random_delay(min: number, max: number) {
  const ms = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

import { v4 as uuidv4 } from "uuid";
export function generate_uuid() {
  return uuidv4();
}

export function generate_human_friendly_id(
  prefix: string,
  length: number = 8,
  options?: { useLowercase?: boolean }
) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';

  const chars = options?.useLowercase ? uppercase + lowercase : uppercase;
  
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  const id = Array.from(randomValues)
    .map(val => chars[val % chars.length])
    .join('');

  return `${prefix}-${id}`;
}

export const slugify = (non_slug_url: string) => {
  return non_slug_url
    .toLowerCase()
    .replace(/&/g, "and") // Replace & with "and"
    .replace(/[^a-z0-9\s/-]/g, "") // Allow alphanumeric, spaces, hyphens, and slashes
    .replace(/[\s-]+/g, "-")       // Replace spaces and hyphens with a single hyphen
    .replace(/^-+|-+$/g, "");      // Remove leading and trailing hyphens
}

export const isNullOrWhitespace = (str: string | null | undefined): str is null | undefined => {
  return str == undefined || str == null || str.match(/^\s*$/) !== null;
}

export const isNullOrUndefined = (obj: any): obj is null | undefined => {
  return obj == undefined || obj == null;
}

/**
 * Checks if an array is null, undefined, or empty.
 * @param arr - The array to check.
 * @returns True if the array is null, undefined, or empty, otherwise false.
 */
export const isEmpty = (arr: any[] | null | undefined): boolean => {
  return arr == null || arr.length === 0;
};

export const isNumeric = (str: string | null | undefined | number) => {
  if (str == null || str == undefined) return false;
  // Using a regular expression to match numeric characters, allowing for an optional digit after the decimal point
  return /^\d+(\.\d+)?$|^\d+\.$/.test(str.toString());
}

export const forceFloat = (str: string | null | undefined | number) => {
  if (str == null || str == undefined) return 0;

  if (typeof str === 'number') {
    return str;
  }
  
  return isNumeric(str) ? parseFloat(str.toString()) : 0;
}

// we need to handle the smallest unit of currency in stripe
// if zero decimal currency then we keep as is otherwise we multiply by 100
// e.g. JPY 50 stays as 50, USD 100 becomes 10000
// reference: https://stripe.com/docs/currencies#zero-decimal
const zeroDecimalCurrencies = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]

export const encodeAmountToSmallestUnit = (amount_to_convert: number | string | undefined, currency: string) => {
  if (amount_to_convert == null || amount_to_convert == undefined) throw "Cannot encode an undefined amount";
  let amount = (typeof amount_to_convert === "string" ? parseFloat(amount_to_convert) : amount_to_convert) ?? 0;
  return currency in zeroDecimalCurrencies ? Math.round(amount) : Math.round(amount * 100);
};

export const decodeAmountFromSmallestUnit = (amount_to_convert: number | string | undefined, currency: string) => {
  if (amount_to_convert == null || amount_to_convert == undefined) throw "Cannot decode an undefined amount"
  let amount = (typeof amount_to_convert === "string" ? parseFloat(amount_to_convert) : amount_to_convert) ?? 0      
  return currency in zeroDecimalCurrencies ? amount : amount / 100
}

export const formatCurrency = (value: number, currency: string, formatter?: Intl.NumberFormat) => {
  const fmt = formatter ?? new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
  });
  return fmt.format(decodeAmountFromSmallestUnit(value, currency));
};

export const currencyEquals = (a: string, b: string) => {
  if (a == null || b == null) return false;
  return a.toUpperCase() === b.toUpperCase();
}

/**
 * Centralized function to get Spiriverse fee configuration
 * @param dataSources - Cosmos data source
 * @returns Complete fee configuration object
 */
export const getSpiriverseFeeConfig = async (dataSources: any) => {
  try {
    const feeConfig = await dataSources.cosmos.get_record(
      'System-Settings',
      'spiriverse',
      'fees-config'
    );

    if (!feeConfig) {
      throw new Error('Fee configuration not found');
    }

    return feeConfig;
  } catch (error) {
    console.error('Failed to get Spiriverse fee configuration:', error);
    throw new Error('Failed to retrieve fee configuration');
  }
}

/**
 * Get the appropriate product fee rate based on tiered pricing
 * @param lineItemAmount - Line item total amount (price * quantity) in smallest units (cents)
 * @param feeConfig - Complete fee configuration object
 * @returns Fee percentage as decimal (e.g., 0.05 for 5%)
 */
export const getProductFeeRate = (lineItemAmount: number, feeConfig: any): number => {
  // Tiered pricing based on line item total
  if (lineItemAmount >= 50000) { // $500+ AUD (in cents)
    return (feeConfig['product-purchase-500']?.percent || 2) / 100;
  } else if (lineItemAmount >= 5000) { // $50+ AUD (in cents)
    return (feeConfig['product-purchase-50']?.percent || 3.5) / 100;
  } else { // Under $50 AUD
    return (feeConfig['product-purchase-0']?.percent || 5) / 100;
  }
}

/**
 * Get fee configuration for a specific target type
 * @param target - Target type (e.g., 'case-activity', 'tour-booking')
 * @param feeConfig - Complete fee configuration object
 * @returns Fee configuration object with percent, fixed, and currency
 */
export const getTargetFeeConfig = (target: string, feeConfig: any) => {
  const targetFee = feeConfig[target.toLowerCase()];

  if (!targetFee) {
    // Fallback to no-fees if target not found
    return feeConfig['no-fees'] || { percent: 0, fixed: 0, currency: 'AUD' };
  }

  return {
    percent: targetFee.percent || 0,
    fixed: targetFee.fixed || 0,
    currency: targetFee.currency || 'AUD',
    ...(targetFee.basePrice !== undefined ? { basePrice: targetFee.basePrice } : {})
  };
}

/**
 * Check if we should skip sending emails for a Playwright test user
 * @param email - Email address to check
 * @returns true if we should skip sending (Playwright user in non-prod environment)
 */
export const shouldSkipEmail = (email: string): boolean => {
  if (!email) return false;

  // Always send emails in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // In non-production, skip emails for @playwright.com users
  return email.toLowerCase().endsWith('@playwright.com');
}