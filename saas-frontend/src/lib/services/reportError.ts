import { gql } from './gql';

/**
 * Reports a frontend error to the platform alerts system.
 * Fire-and-forget — never throws, never blocks the error UI.
 */
export function reportFrontendError(error: Error & { digest?: string }, source: string) {
  try {
    const input = {
      alertType: 'FRONTEND_ERROR',
      severity: 'HIGH',
      title: `Client error: ${error.message?.slice(0, 120) || 'Unknown error'}`,
      message: `A user encountered an unhandled error on ${typeof window !== 'undefined' ? window.location.href : 'unknown page'}`,
      context: {
        errorMessage: error.message,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        stackTrace: error.stack?.slice(0, 2000),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        additionalData: {
          digest: error.digest,
          timestamp: new Date().toISOString(),
        },
      },
      source: {
        component: source,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      },
    };

    // Fire and forget — don't await, don't block the error boundary
    gql<{ createPlatformAlert: { success: boolean } }>(`
      mutation CreatePlatformAlert($input: CreatePlatformAlertInput!) {
        createPlatformAlert(input: $input) {
          success
        }
      }
    `, { input }).catch(() => {
      // Silently fail — we can't do much if alert reporting itself fails
    });
  } catch {
    // Never let error reporting break the error boundary
  }
}
