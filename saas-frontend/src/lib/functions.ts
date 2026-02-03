import "crypto"
import { DateTime } from "luxon"
import zones from 'tzdata';
//@ts-expect-error importing a json file
import ct from  'countries-and-timezones';
import { ICountry, countries } from 'countries-list'
import symbolMap from "currency-symbol-map";

// this function will add a class to all tags 
export const addClassName = (tag: string, className: string, html: string) => {
  const regex = new RegExp(`<${tag}`, 'g');
  return html.replace(regex, `<${tag} class="${className}"`);
}

// export const isEmpty = function(text: string): boolean {
//     return text === null || text === undefined || text.match(/^ *$/) !== null;
//   };

export const groupBy = <K, V>(array: V[], grouper: (item: V) => K) => {
  return array.reduce((store, item) => {
    const key = grouper(item)
    if (!store.has(key)) {
      store.set(key, [item])
    } else {
      if (isNullOrUndefined(store.get(key))) {
        store.set(key, [item])
      } else {
        store.get(key)!.push(item)
      }
    }
    return store
  }, new Map<K, V[]>())
}

export const isNumeric = (str: string | null | undefined | number) => {
  if (str == null || str == undefined) return false;
  // Using a regular expression to match numeric characters
  return /^\d+(\.\d+)?$/.test(str.toString());
}

export const capitalize = str => {
  return isNullOrWhitespace(str) ? null : (str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()).trim();
}

export const capitalizeWords = (str: string) => {
  return str.split(/\s+/).map(capitalize).join(" ");
}

export const isNullOrWhitespace = (str: string | null | undefined): str is null | undefined => {
  return str == undefined || str == null || str.match(/^\s*$/) !== null;
}

export const isNullOrUndefined = (obj: any): obj is null | undefined => {
  return obj == undefined || obj == null;
}

export const isEmpty = (arr: any[] | null | undefined): arr is null | undefined | any[] => {
  return isNullOrUndefined(arr) || arr.length > 0;
}

export const countWords = (str: string) => {
  // strip out any html characters
  const strippedValue = str.replace(/<[^>]+>/g, '');
  return !isNullOrWhitespace(strippedValue) ? strippedValue.trim().split(/\s+/).length : 0;
}

export const strip_type_name = <T>(obj: T): T => {
  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map((item) => strip_type_name(item)) as any as T;
    } else {
      const copy = {...obj};
      delete copy['__typename'];
      Object.keys(copy).forEach(function(key) {
        copy[key] = strip_type_name(copy[key]);
      });
      return copy;
    }
  }
  return obj;
}

function base64urlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export const generateUniqueID = () => {
  let uniqueBase64 = "-"

  do {
    let randomBytes;

    // Check if the window object exists (client-side)
    const timestamp = Date.now();
    randomBytes = new Uint8Array(8);
    if (typeof window !== 'undefined') {
      // Client-side code
      window.crypto.getRandomValues(randomBytes);
    } else {
      // Server-side code (Node.js)
      randomBytes = crypto.getRandomValues(randomBytes);
    }

    // Combine timestamp and randomBytes to create a unique buffer
    const combinedArray = new Uint8Array(8 + randomBytes.length);
    combinedArray.set(new Uint8Array(String(timestamp).split('').map(c => c.charCodeAt(0))));
    combinedArray.set(randomBytes, 8);

    // Encode the unique buffer to Base64 without padding and replace '/' and '+'
    uniqueBase64 = base64urlEncode(Buffer.from(combinedArray));
  } while (uniqueBase64.includes('-') || uniqueBase64.includes('_'));

  return uniqueBase64;
}

export const clone = <T>(obj: T, mode: 'deep' | 'shallow' = 'shallow'): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => clone(item, mode)) as any;
  }

  if (mode === 'shallow') {
    return { ...obj };
  }

  const objCopy = {} as any;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'function') {
        objCopy[key] = value;
      } else {
        objCopy[key] = clone(value, mode);
      }
    }
  }
  return objCopy as T;
};

export type upsertOptions = {
  addToFront?: boolean
} & ({
  idFields: (string | number)[]
} | {
  lookupFn: (a: any, b: any) => boolean
})

export const upsert = (
  array: any[],
  item,
  options: upsertOptions
) => {
  
  let match_objects = (obj1: any, obj2: any) => obj1 == obj2;
  if ("idFields" in options) {
    if (options.idFields.length === 0) {
      throw new Error("idFields must have at least one field");
    }
    match_objects = (obj1: any, obj2: any) => {
      return options.idFields.every((fieldName) => {
        if ((obj2 == null || obj1 == null) && (obj1 != obj2)) return false;
        return obj1[fieldName] == obj2[fieldName];
      });
    };
  }

  if ("lookupFn" in options) {
    match_objects = options.lookupFn;
  }

  const temp = clone(array, 'deep');
  const index = array.findIndex((i) => match_objects(i, item));
  if (index > -1) {
    const newItem = mergeDeep(array[index], item);
    temp[index] = newItem;
  } else {
    if (options.addToFront) {
      temp.unshift(item);
    } else {
      temp.push(item);
    }
  }
  return temp;
};

export type Country = ICountry & {code: string}

export const listCountries : () => Country[] = () => {
  const countries_list = Object.keys(countries).map((code) => mergeDeep(
    { code }, countries[code]
  ))
  return countries_list
}

export const listTimeZones = (countryCode?: string) => {
  let tzs;
  if (countryCode == null) {
    tzs = Object.keys(zones.zones).map(tz => ({ id: tz.toString(), name: tz.toString() }));
  } else {
    const country = ct.getCountry(countryCode);
    if (country == null) throw "Country code not found";
    tzs = country.timezones.map(tz => ({ id: tz.toString(), name: tz.toString().replace(country?.name + "/", "") }));
  }
  const zonesToRet = tzs.sort((a, b) => (a.id < b.id ? -1 : 1));
  return zonesToRet;
};

export const resolveTimeStringAsLocal = (time: string) => {
  if (!time.includes('Z')) throw "Time must be given in a UTC+0 format in order to be resolved"
  return DateTime.fromISO(time, { zone: 'UTC'}).setZone('local')
}

export function debounce(func: (...args: any[]) => void, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

export const mergeDeepWithClone = (target: any, sources : any) => {
  const tmpTarget = clone(target, 'deep')
  return mergeDeep(tmpTarget, sources)
}

export const isObject = (item: any) => {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export const mergeDeep = (target: any, ...sources: any[]) => {
  if (!sources.length) return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (source[key] !== undefined) { // Ignore undefined values
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
  }
  return mergeDeep(target, ...sources);
}

export const getCurrencySymbols = (currency: string) => {
  return {
      code: currency,
      prefix: symbolMap(currency)
  }
}

export const currencyEquals = (currency1: string, currency2: string) => {
  if (currency1 == null || currency2 == null) return false;
  return currency1.toUpperCase() === currency2.toUpperCase();
}

export const formatDateString = (date: DateTime | string) : string => {
  const dateToFormat = typeof(date) == "string" ? DateTime.fromISO(date) : date;
  if (dateToFormat.diffNow("days").days < -30) {
      return dateToFormat.toLocaleString();
  } else {
      return dateToFormat.toRelative() ?? dateToFormat.toLocaleString();
  }
}

type OmitImageUrl<T> = {
  [P in keyof T]: P extends 'image' ? Omit<T[P], 'url'> : T[P];
};

export const prepObjectsWithImages = <T>(data: T[], image_property_name: string) => {
  return (data as OmitImageUrl<T>[]).map((item) => {
    if (item[image_property_name] != null) {
      if ('url' in item[image_property_name]) {
        delete item[image_property_name].url
      }
    }
    return item
  })
}

// we need to handle the smallest unit of currency in stripe
// if zero decimal currency then we keep as is otherwise we multiply by 100
// e.g. JPY 50 stays as 50, USD 100 becomes 10000
// reference: https://stripe.com/docs/currencies#zero-decimal
const zeroDecimalCurrencies = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]

export const encodeAmountToSmallestUnit = (amount_to_convert: number | string | undefined, currency: string) => {
  if (amount_to_convert == null || amount_to_convert == undefined) throw "Cannot encode an undefined amount";
  const amount = (typeof amount_to_convert === "string" ? parseFloat(amount_to_convert) : amount_to_convert) ?? 0;
  return zeroDecimalCurrencies.includes(currency)
    ? Math.round(amount)
    : Math.round(amount * 100);
}

export const decodeAmountFromSmallestUnit = (amount_to_convert: number | string | undefined, currency: string) => {
  if (amount_to_convert == null || amount_to_convert == undefined) throw "Cannot decode an undefined amount";
  const amount = (typeof amount_to_convert === "string" ? parseFloat(amount_to_convert) : amount_to_convert) ?? 0;      
  return zeroDecimalCurrencies.includes(currency) ? amount : amount / 100;
}

/**
 * Rounds a price (in minor units) to a "clean" value based on currency rules.
 * 
 * Examples:
 *   roundMinorPrice(1099, "USD") → 1100   // $10.99 → $11.00
 *   roundMinorPrice(1003, "JPY") → 1000   // ¥1003 → ¥1000
 *   roundMinorPrice(12345, "BHD") → 12500 // 12.345 BHD → 12.500 BHD
 * 
 * @param amountMinor Price in minor units (e.g., cents, yen, fils).
 * @param currency ISO 4217 currency code.
 * @returns Rounded price in minor units.
 */
export const roundMinorPrice = (amountMinor: number, currency: string = "USD") => {
  if (!isFinite(amountMinor)) return 0;

  // Currency-specific rounding rules (expressed in minor units)
  const currencyRules: Record<string, { roundTo: number }> = {
    // Zero-decimal currencies
    'BIF': { roundTo: 50 },
    'CLP': { roundTo: 50 },
    'DJF': { roundTo: 50 },
    'GNF': { roundTo: 50 },
    'JPY': { roundTo: 50 },
    'KMF': { roundTo: 50 },
    'KRW': { roundTo: 50 },
    'MGA': { roundTo: 50 },
    'PYG': { roundTo: 50 },
    'RWF': { roundTo: 50 },
    'UGX': { roundTo: 50 },
    'VND': { roundTo: 500 }, // Larger denomination
    'VUV': { roundTo: 50 },
    'XAF': { roundTo: 50 },
    'XOF': { roundTo: 50 },
    'XPF': { roundTo: 50 },

    // Three-decimal currencies
    'BHD': { roundTo: 500 }, // 0.500 BHD = 500 fils
    'JOD': { roundTo: 500 },
    'KWD': { roundTo: 500 },
    'OMR': { roundTo: 500 },
    'TND': { roundTo: 500 },
  };

  // Default: 2-decimal currencies → round to nearest 50 minor units (i.e. $0.50)
  const defaultRule = { roundTo: 50 };
  const rule = currencyRules[currency.toUpperCase()] || defaultRule;

  return Math.round(amountMinor / rule.roundTo) * rule.roundTo;
};


export const escape_key = () => {
  document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
}

export const flatten = (source: string | string[]) => {
  return Array.isArray(source) ? source.join("|") : source
}

export const unflatten = (source: string | string[]) => {
  if (Array.isArray(source)) return source;
  else return source.split("|")
}

// distinct : remove duplicates from an array
export const distinct = <T>(values: T[]) => {
  return Array.from(new Set(values))
}

export const distinctBy = <T, V>(values: T[], key: (item: T) => V) : V[] => {
  return distinct(values.map(key))
}

type colorFormats = 'hex' | 'rgb'
export const convert_color = (color: string, inputFormat: colorFormats, outputFormat: colorFormats) => {
    if (inputFormat === outputFormat) {
        return color;
    }

    if (inputFormat === 'hex' && outputFormat === 'rgb') {
        // convert the hex value to rgb
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        return `rgb(${r},${g},${b})`;
    } else if (inputFormat === 'rgb' && outputFormat === 'hex') {
        // convert the rgb value to hex
        const rgb = color.replace(/\s/g, '').match(/^rgb\((\d+),(\d+),(\d+)\)$/);
        if (rgb == null) {
            return color;
        }
        const hex = (x: string) => ("0" + parseInt(x).toString(16)).slice(-2);
        return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    } else {
        return color;
    }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

type AnyObject = Record<string, any>;

/**
 * Omits shallow or deeply nested properties from an object, with array support.
 * The return type is preserved as T, but keys are removed at runtime.
 */
export function omit<T extends AnyObject>(obj: T, paths: string[]): T {
  const result = structuredClone(obj); // Replace if necessary for compatibility

  for (const path of paths) {
    const keys = path.split('.');
    deepOmitPath(result, keys);
  }

  return result;
}

function deepOmitPath(obj: any, keys: string[]): void {
  if (!obj || typeof obj !== 'object') return;

  const [key, ...rest] = keys;

  if (Array.isArray(obj)) {
    obj.forEach((item) => deepOmitPath(item, keys));
    return;
  }

  if (rest.length === 0) {
    delete obj[key];
  } else if (obj[key] !== undefined) {
    deepOmitPath(obj[key], rest);
  }
}

export const listRegions = (countryCode: string) => {
  const country = ct.getCountry(countryCode);
  if (!country || !country.regions) return [];
  return country.regions.map(region => ({
    code: region.id,
    name: region.name
  }));
}

export const getDefaultsFromCountry = (countryCode: string) => {
  const country = countries[countryCode];

  const currency = country?.currency?.[0] ?? 'USD';
  const currencySymbol = symbolMap(currency) ?? '$';

  const languageCode = country?.languages?.[0] ?? 'en';
  const locale = `${languageCode}-${countryCode}`;

  return {
    locale,
    currency,
    currencySymbol
  };
};

/**
 * Converts a string into a URL-friendly slug
 * @param text - The string to slugify
 * @returns URL-friendly slug
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/&/g, "and") // Replace & with "and"
    .replace(/[^a-z0-9\s/-]/g, "") // Allow alphanumeric, spaces, hyphens, and slashes
    .replace(/[\s-]+/g, "-")       // Replace spaces and hyphens with a single hyphen
    .replace(/^-+|-+$/g, "")       // Remove leading/trailing hyphens
    .trim();
};
