'use client';

import { useEffect } from 'react';
import { reportFrontendError } from '@/lib/services/reportError';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SpiriVerse Global Error]', error);
    reportFrontendError(error, 'GlobalErrorBoundary');
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            color: 'white',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '24px', fontSize: '48px' }}>
            ✦
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>
            This page didn&apos;t load correctly
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '32px', maxWidth: '400px' }}>
            No worries — this is a temporary hiccup on our end and we&apos;ve been notified. You can try refreshing, or head back to the homepage.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgb(147, 51, 234)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
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
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Log Out
            </button>
          </div>
          {error.digest && (
            <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
