'use client';

import { getDefaultsFromCountry } from '@/lib/functions';
import { useSession } from 'next-auth/react';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type UserPreferencesContextType = {
  locale?: string;
  currency?: string;
  timezone?: string;
  setFromCountry: (countryCode: string) => void;
  clear: () => void;
  loading?: boolean;
};

const STORAGE_KEYS = {
  preferences: 'userPreferences',
};

const defaultContext: UserPreferencesContextType = {
  setFromCountry: () => {},
  clear: () => {},
};

const UserPreferencesContext = createContext<UserPreferencesContextType>(
  defaultContext
);

export const UserPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const session = useSession();
  const [locale, setLocale] = useState<string | undefined>();
  const [currency, setCurrency] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Load from localStorage on first render
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedPrefs = localStorage.getItem(STORAGE_KEYS.preferences);
    let prefs: { locale?: string; currency?: string } = {};
    if (storedPrefs) {
      try {
        prefs = JSON.parse(storedPrefs);
      } catch {
        prefs = {};
      }
    }

    // Fallback to browser locale if nothing in localStorage and not logged in
    if (!prefs.locale) {
      prefs.locale = navigator.language || undefined;
    }
    if (!prefs.currency && prefs.locale) {
      const countryCode = prefs.locale.split('-')[1] || 'US';
      const defaults = getDefaultsFromCountry(countryCode);
      prefs.currency = defaults.currency;
    }

    setLocale(prefs.locale);
    setCurrency(prefs.currency);
    setLoading(false);
  }, []);

  // Auto-sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.preferences) return;
      let prefs: { locale?: string; currency?: string } = {};
      if (e.newValue) {
        try {
          prefs = JSON.parse(e.newValue);
        } catch {
          prefs = {};
        }
      }
      setLocale(prefs.locale);
      setCurrency(prefs.currency);
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Sync with session data if authenticated
  useEffect(() => {
    if (session.status === 'authenticated') {
      const user = session.data?.user;
      if (user) {
        setLocale(user.locale);
        setCurrency(user.currency);
        // Optionally update localStorage for consistency
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEYS.preferences,
            JSON.stringify({ locale: user.locale, currency: user.currency })
          );
        }
      }
    }
  }, [session]);

  const setFromCountry = (countryCode: string) => {
    const { locale, currency } = getDefaultsFromCountry(countryCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEYS.preferences,
        JSON.stringify({ locale, currency })
      );
    }
    setLocale(locale);
    setCurrency(currency);
  };

  const clear = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.preferences);
    }
    setLocale(undefined);
    setCurrency(undefined);
  };

  return (
    <UserPreferencesContext.Provider
      value={{ locale, currency, setFromCountry, clear, loading }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => useContext(UserPreferencesContext);