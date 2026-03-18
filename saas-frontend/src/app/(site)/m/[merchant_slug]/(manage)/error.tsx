'use client';

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import { reportFrontendError } from '@/lib/services/reportError';

export default function ManageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SpiriVerse Manage Error]', error);
    reportFrontendError(error, 'ManageErrorBoundary');
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 p-4 rounded-full bg-purple-500/10 border border-purple-500/20">
        <RefreshCw className="h-8 w-8 text-purple-400" />
      </div>
      <h1 className="text-2xl font-semibold text-white mb-3">
        This page didn&apos;t load correctly
      </h1>
      <p className="text-slate-400 mb-8 max-w-md">
        No worries — this is a temporary hiccup on our end and we&apos;ve been notified. You can try refreshing, or head back to the homepage.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <a
          href="/"
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go to Homepage
        </a>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-slate-600">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
