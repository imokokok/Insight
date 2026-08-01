/**
 * Shared Sentry configuration used by sentry.client.config.ts,
 * sentry.server.config.ts and sentry.edge.config.ts.
 *
 * These three config files are auto-loaded by @sentry/nextjs based on
 * filename convention, so they must remain separate files. The duplicated
 * filterPii and common init options live here instead.
 */

import type * as Sentry from '@sentry/nextjs';

/**
 * Strip personally identifiable information from a Sentry event before it
 * is sent upstream.
 */
function filterPii(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request?.headers) {
    delete event.request.headers['authorization'];
    delete event.request.headers['cookie'];
    delete event.request.headers['set-cookie'];
  }
  if (event.request?.cookies) {
    delete event.request.cookies;
  }
  if (event.request?.data && typeof event.request.data === 'string') {
    event.request.data = event.request.data.replace(
      /"(password|token|secret|api_key|apiKey|access_token|refresh_token)"\s*:\s*"[^"]*"/gi,
      '"$1":"[Filtered]"'
    );
  }
  return event;
}

/**
 * Build the common Sentry.init options shared across client/server/edge.
 * Callers may spread this and add environment-specific fields (e.g. client
 * replay integrations and sample rates).
 */
export function getCommonSentryOptions() {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: process.env.NODE_ENV === 'development',
    environment: process.env.NODE_ENV,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'Non-Error promise rejection captured',
    ],
    beforeSend: filterPii,
  };
}
