'use client';

import { useUserPreferences } from '@/lib/context/UserPreferencesContext';

const LOCALE_TO_MARKET: Record<string, string> = {
  AU: 'AU',
  GB: 'UK',
  US: 'US',
  NZ: 'NZ',
};

/** Derives the user's market code (AU, UK, US, NZ) from their locale preference */
const useUserMarket = (): string | null => {
  const { locale } = useUserPreferences();

  if (!locale) return null;

  const parts = locale.split('-');
  const countryCode = parts[parts.length - 1]?.toUpperCase();
  return LOCALE_TO_MARKET[countryCode] ?? null;
};

export default useUserMarket;
