import * as Sentry from '@sentry/nextjs';

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

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  tracesSampleRate: 0.1,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

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
});
