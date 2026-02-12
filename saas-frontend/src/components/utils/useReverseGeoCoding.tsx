import { useState, useEffect } from 'react';

const useReverseGeocoding = () => {
  const [countryCode, setCountryCode] = useState<string | null>(null);

  useEffect(() => {
    // Try to detect country from timezone (more reliable than locale)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Map common Australian timezones
      if (timezone.includes('Australia')) {
        setCountryCode('AU');
        return;
      }
      
      // Map other common timezones
      const timezoneToCountry: Record<string, string> = {
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
        'America/Chicago': 'US',
        'America/Denver': 'US',
        'Europe/London': 'GB',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Asia/Tokyo': 'JP',
        'Asia/Shanghai': 'CN',
        'Asia/Singapore': 'SG',
        'Pacific/Auckland': 'NZ',
      };
      
      if (timezone && timezoneToCountry[timezone]) {
        setCountryCode(timezoneToCountry[timezone]);
        return;
      }
      
      // Fallback to locale-based detection
      const locale = navigator.language || (navigator as any).userLanguage;
      if (locale && locale.includes('-')) {
        const localeParts = locale.split('-');
        const detectedCountry = localeParts[localeParts.length - 1].toUpperCase();
        setCountryCode(detectedCountry);
      }
    } catch (e) {
      console.error('Failed to detect country:', e);
    }
  }, []);

  return countryCode;
};

export default useReverseGeocoding;