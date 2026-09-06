import { hasAnalyticsConsent } from './src/lib/cookies/consent';
import { getCommonSentryOptions } from './src/lib/sentry/sharedConfig';

let initialized = false;

async function initializeSentry() {
  if (initialized || !hasAnalyticsConsent() || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  initialized = true;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    ...getCommonSentryOptions(),
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

void initializeSentry();
window.addEventListener('cookie-consent-change', () => void initializeSentry());
