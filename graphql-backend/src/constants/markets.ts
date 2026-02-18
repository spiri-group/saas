export const VALID_MARKETS = ['AU', 'UK', 'US', 'NZ'] as const;

export type Market = typeof VALID_MARKETS[number];

/** Maps locale country codes to SpiriVerse market codes */
export const LOCALE_TO_MARKET: Record<string, Market> = {
  AU: 'AU',
  GB: 'UK',
  US: 'US',
  NZ: 'NZ',
};

/** Derive market code from a BCP 47 locale string (e.g. "en-AU" → "AU") */
export function marketFromLocale(locale: string): Market | null {
  const parts = locale.split('-');
  const countryCode = parts[parts.length - 1]?.toUpperCase();
  return LOCALE_TO_MARKET[countryCode] ?? null;
}
