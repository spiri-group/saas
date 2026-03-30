'use client';

import { useEffect } from 'react';
import SpiriLogo from '@/icons/spiri-logo';
import { reportFrontendError } from '@/lib/services/reportError';

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SpiriVerse Site Error]', error);
    reportFrontendError(error, 'SiteErrorBoundary');
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 opacity-40">
        <SpiriLogo height={48} />
      </div>
      <h1 className="text-2xl font-semibold text-white mb-3">
        This page didn&apos;t load correctly
      </h1>
      <p className="text-white/60 mb-8 max-w-md">
        No worries — this is a temporary hiccup on our end. You can try refreshing, or head back to the homepage.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/"
          className="px-6 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Go to Homepage
        </a>
        <button
          onClick={() => {
            document.cookie.split(';').forEach((c) => {
              document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
            window.location.href = '/';
          }}
          className="px-6 py-2.5 rounded-lg border border-white/20 text-white/60 text-sm font-medium hover:text-white hover:bg-white/10 transition-colors"
        >
          Log Out
        </button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-white/30">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
