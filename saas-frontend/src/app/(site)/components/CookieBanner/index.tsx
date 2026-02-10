'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'spiriverse-cookie-consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="cookie-banner"
      className="fixed bottom-0 left-0 right-0 z-[90] bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg p-4"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-gray-700 flex-1">
          We use cookies to improve your experience. By continuing to use SpiriVerse, you agree to our{' '}
          <Link
            href="/legal/cookie-policy"
            className="text-blue-600 underline hover:text-blue-800"
            data-testid="cookie-policy-link"
          >
            Cookie Policy
          </Link>.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            data-testid="cookie-decline-btn"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            data-testid="cookie-accept-btn"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
